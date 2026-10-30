-- Registry lifecycle: preserve history; mutations flow through permission-checked functions.
CREATE UNIQUE INDEX household_memberships_one_active_residence ON public.household_memberships(resident_id) WHERE move_out_at IS NULL;

CREATE OR REPLACE FUNCTION public.update_household_record(household_id uuid, house_number text, village_moo text, road_value text, subdistrict_value text, district_value text, province_value text, postal_code_value text, household_type_value "HouseholdType", occupancy_status_value "OccupancyStatus", note_value text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_permission('registry.household.update') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF occupancy_status_value = 'archived'::"OccupancyStatus" THEN RAISE EXCEPTION 'Use archive function'; END IF;
  IF length(btrim(house_number)) = 0 OR length(btrim(village_moo)) = 0 OR postal_code_value !~ '^\d{5}$' THEN RAISE EXCEPTION 'Invalid household data'; END IF;
  UPDATE public.households SET house_number = btrim(update_household_record.house_number), moo = btrim(village_moo), road = nullif(btrim(road_value), ''), subdistrict = btrim(subdistrict_value), district = btrim(district_value), province = btrim(province_value), postal_code = postal_code_value, household_type = household_type_value, occupancy_status = occupancy_status_value, note = nullif(btrim(note_value), '') WHERE id = household_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Household not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_resident_by_national_id(lookup_hash char(64))
RETURNS TABLE(id uuid, first_name text, last_name text, household_id uuid, house_number text, moo text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_permission('registry.resident.sensitive.read') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY SELECT r.id, r.first_name::text, r.last_name::text, h.id, h.house_number::text, h.moo::text
    FROM public.residents r
    LEFT JOIN public.household_memberships hm ON hm.resident_id = r.id AND hm.move_out_at IS NULL
    LEFT JOIN public.households h ON h.id = hm.household_id
    WHERE r.national_id_lookup_hash = lookup_hash;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_household_record(household_id uuid, archive_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_permission('registry.household.update') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF length(btrim(coalesce(archive_reason, ''))) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
  IF EXISTS (SELECT 1 FROM public.household_memberships WHERE household_id = archive_household_record.household_id AND move_out_at IS NULL) THEN RAISE EXCEPTION 'Active residents remain'; END IF;
  IF EXISTS (SELECT 1 FROM public.water_connections WHERE household_id = archive_household_record.household_id AND status = 'ACTIVE') THEN RAISE EXCEPTION 'Active water connection remains'; END IF;
  PERFORM set_config('app.audit_reason', btrim(archive_reason), true);
  UPDATE public.households SET occupancy_status = 'archived'::"OccupancyStatus" WHERE id = household_id AND occupancy_status <> 'archived'::"OccupancyStatus";
  IF NOT FOUND THEN RAISE EXCEPTION 'Household not found or already archived'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_resident_record(resident_id uuid, first_name_value text, last_name_value text, birth_date_value date, phone_value text, replace_national_id boolean, national_id_ciphertext_value text, national_id_lookup_hash_value char(64))
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_permission('registry.resident.update') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF length(btrim(first_name_value)) = 0 OR length(btrim(last_name_value)) = 0 THEN RAISE EXCEPTION 'Name is required'; END IF;
  IF replace_national_id AND (national_id_ciphertext_value IS NULL OR national_id_lookup_hash_value IS NULL) THEN RAISE EXCEPTION 'National ID is invalid'; END IF;
  UPDATE public.residents SET first_name = btrim(first_name_value), last_name = btrim(last_name_value), birth_date = birth_date_value, phone = nullif(btrim(phone_value), ''), national_id_ciphertext = CASE WHEN replace_national_id THEN national_id_ciphertext_value ELSE national_id_ciphertext END, national_id_lookup_hash = CASE WHEN replace_national_id THEN national_id_lookup_hash_value ELSE national_id_lookup_hash END WHERE id = resident_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resident not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.change_residency(resident_id uuid, destination_household_id uuid, relationship text, change_date date, change_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE active_membership public.household_memberships%ROWTYPE;
BEGIN
  IF NOT public.has_permission('registry.resident.update') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF length(btrim(coalesce(change_reason,''))) < 3 OR length(btrim(coalesce(relationship,''))) = 0 THEN RAISE EXCEPTION 'Relationship and reason are required'; END IF;
  SELECT * INTO active_membership FROM public.household_memberships WHERE household_memberships.resident_id = change_residency.resident_id AND move_out_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resident has no active household'; END IF;
  IF change_date < active_membership.move_in_at THEN RAISE EXCEPTION 'Move date cannot precede move-in date'; END IF;
  IF destination_household_id IS NOT NULL AND destination_household_id = active_membership.household_id THEN RAISE EXCEPTION 'Destination must differ from current household'; END IF;
  IF destination_household_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.households WHERE id = destination_household_id AND occupancy_status <> 'archived'::"OccupancyStatus") THEN RAISE EXCEPTION 'Destination household is unavailable'; END IF;
  IF relationship = 'หัวหน้าครัวเรือน' AND destination_household_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.household_memberships WHERE household_id = destination_household_id AND is_head AND move_out_at IS NULL) THEN RAISE EXCEPTION 'Destination already has an active head'; END IF;
  PERFORM set_config('app.audit_reason', btrim(change_reason), true);
  UPDATE public.household_memberships SET move_out_at = change_date, move_reason = btrim(change_reason) WHERE id = active_membership.id;
  IF destination_household_id IS NULL THEN UPDATE public.residents SET residency_status = 'moved_out'::"ResidencyStatus" WHERE id = resident_id;
  ELSE INSERT INTO public.household_memberships(household_id, resident_id, relationship, is_head, move_in_at) VALUES (destination_household_id, resident_id, btrim(relationship), relationship = 'หัวหน้าครัวเรือน', change_date); UPDATE public.residents SET residency_status = 'moved_in'::"ResidencyStatus" WHERE id = resident_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_household_head(household_id uuid, resident_id uuid, change_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_permission('registry.resident.update') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF length(btrim(coalesce(change_reason, ''))) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.household_memberships WHERE household_id = set_household_head.household_id AND resident_id = set_household_head.resident_id AND move_out_at IS NULL) THEN RAISE EXCEPTION 'Resident is not an active household member'; END IF;
  PERFORM set_config('app.audit_reason', btrim(change_reason), true);
  UPDATE public.household_memberships SET is_head = false WHERE household_id = set_household_head.household_id AND move_out_at IS NULL AND is_head;
  UPDATE public.household_memberships SET is_head = true, relationship = 'หัวหน้าครัวเรือน' WHERE household_id = set_household_head.household_id AND resident_id = set_household_head.resident_id AND move_out_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.update_household_record(uuid,text,text,text,text,text,text,text,"HouseholdType","OccupancyStatus",text), public.archive_household_record(uuid,text), public.update_resident_record(uuid,text,text,date,text,boolean,text,char), public.change_residency(uuid,uuid,text,date,text), public.set_household_head(uuid,uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_resident_by_national_id(char) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_household_record(uuid,text,text,text,text,text,text,text,"HouseholdType","OccupancyStatus",text), public.archive_household_record(uuid,text), public.update_resident_record(uuid,text,text,date,text,boolean,text,char), public.change_residency(uuid,uuid,text,date,text), public.set_household_head(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_resident_by_national_id(char) TO authenticated;
