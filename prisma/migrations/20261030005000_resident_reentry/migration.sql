-- Allow a resident with no current household to re-enter the registry while preserving past memberships.
CREATE OR REPLACE FUNCTION public.create_resident_with_membership(
  first_name text, last_name text, national_id_ciphertext text, national_id_lookup_hash char(64),
  birth_date date, phone text, household_id uuid, relationship text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  new_resident_id uuid;
  household_status public."OccupancyStatus";
BEGIN
  IF NOT public.has_permission('registry.resident.create') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF length(btrim(coalesce(first_name, ''))) = 0 OR length(btrim(coalesce(last_name, ''))) = 0 OR length(btrim(coalesce(relationship, ''))) = 0 THEN RAISE EXCEPTION 'Resident name and relationship are required'; END IF;

  SELECT occupancy_status INTO household_status FROM public.households WHERE id = create_resident_with_membership.household_id FOR UPDATE;
  IF NOT FOUND OR household_status = 'archived'::public."OccupancyStatus" THEN RAISE EXCEPTION 'Household is unavailable'; END IF;
  IF relationship = 'หัวหน้าครัวเรือน' AND EXISTS (
    SELECT 1 FROM public.household_memberships WHERE household_memberships.household_id = create_resident_with_membership.household_id AND is_head AND move_out_at IS NULL
  ) THEN RAISE EXCEPTION 'Household already has an active head'; END IF;

  INSERT INTO public.residents(first_name, last_name, national_id_ciphertext, national_id_lookup_hash, birth_date, phone)
  VALUES (btrim(first_name), btrim(last_name), national_id_ciphertext, national_id_lookup_hash, birth_date, nullif(btrim(phone), '')) RETURNING id INTO new_resident_id;
  INSERT INTO public.household_memberships(household_id, resident_id, relationship, is_head, move_in_at)
  VALUES (create_resident_with_membership.household_id, new_resident_id, btrim(relationship), relationship = 'หัวหน้าครัวเรือน', current_date);
  UPDATE public.households SET occupancy_status = 'occupied'::public."OccupancyStatus" WHERE id = create_resident_with_membership.household_id;
  RETURN new_resident_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_resident_with_membership(text,text,text,char,date,text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_resident_with_membership(text,text,text,char,date,text,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.change_residency(resident_id uuid, destination_household_id uuid, relationship text, change_date date, change_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  active_membership public.household_memberships%ROWTYPE;
  last_move_out date;
BEGIN
  IF NOT public.has_permission('registry.resident.update') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF length(btrim(coalesce(change_reason,''))) < 3 OR length(btrim(coalesce(relationship,''))) = 0 THEN RAISE EXCEPTION 'Relationship and reason are required'; END IF;

  PERFORM 1 FROM public.residents WHERE id = change_residency.resident_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resident not found'; END IF;

  SELECT * INTO active_membership
    FROM public.household_memberships
    WHERE household_memberships.resident_id = change_residency.resident_id AND move_out_at IS NULL
    FOR UPDATE;

  IF NOT FOUND THEN
    IF destination_household_id IS NULL THEN RAISE EXCEPTION 'Resident has no active household'; END IF;
    SELECT max(move_out_at) INTO last_move_out FROM public.household_memberships WHERE household_memberships.resident_id = change_residency.resident_id;
    IF last_move_out IS NOT NULL AND change_date < last_move_out THEN RAISE EXCEPTION 'Move date cannot precede the last move-out date'; END IF;
  ELSE
    IF change_date < active_membership.move_in_at THEN RAISE EXCEPTION 'Move date cannot precede move-in date'; END IF;
    IF destination_household_id = active_membership.household_id THEN RAISE EXCEPTION 'Destination must differ from current household'; END IF;
  END IF;

  IF destination_household_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.households WHERE id = destination_household_id AND occupancy_status <> 'archived'::"OccupancyStatus") THEN RAISE EXCEPTION 'Destination household is unavailable'; END IF;
  IF relationship = 'หัวหน้าครัวเรือน' AND destination_household_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.household_memberships WHERE household_id = destination_household_id AND is_head AND move_out_at IS NULL) THEN RAISE EXCEPTION 'Destination already has an active head'; END IF;

  PERFORM set_config('app.audit_reason', btrim(change_reason), true);
  IF active_membership.id IS NOT NULL THEN
    UPDATE public.household_memberships SET move_out_at = change_date, move_reason = btrim(change_reason) WHERE id = active_membership.id;
    UPDATE public.households SET occupancy_status = CASE
      WHEN EXISTS (SELECT 1 FROM public.household_memberships WHERE household_id = active_membership.household_id AND move_out_at IS NULL) THEN 'occupied'::public."OccupancyStatus"
      ELSE 'vacant'::public."OccupancyStatus"
    END WHERE id = active_membership.household_id AND occupancy_status <> 'archived'::public."OccupancyStatus";
  END IF;

  IF destination_household_id IS NULL THEN
    UPDATE public.residents SET residency_status = 'moved_out'::"ResidencyStatus" WHERE id = change_residency.resident_id;
  ELSE
    INSERT INTO public.household_memberships(household_id, resident_id, relationship, is_head, move_in_at)
    VALUES (destination_household_id, change_residency.resident_id, btrim(relationship), relationship = 'หัวหน้าครัวเรือน', change_date);
    UPDATE public.households SET occupancy_status = 'occupied'::public."OccupancyStatus" WHERE id = destination_household_id;
    UPDATE public.residents SET residency_status = 'moved_in'::"ResidencyStatus" WHERE id = change_residency.resident_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.change_residency(uuid,uuid,text,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_residency(uuid,uuid,text,date,text) TO authenticated;
