CREATE OR REPLACE FUNCTION public.has_permission(permission_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.role_permissions rp ON rp.role_id = p.role_id
    WHERE p.id = auth.uid() AND p.is_active = true AND rp.permission_key = $1
  );
$$;
REVOKE ALL ON FUNCTION public.has_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_water_usage()
RETURNS TABLE(month_start date, usage numeric) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.has_permission('water.reading.view') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY SELECT date_trunc('month', mr.reading_date)::date, sum(mr.usage)::numeric
    FROM public.meter_readings mr
    WHERE mr.status = 'recorded'::"ReadingStatus"
      AND mr.reading_date >= date_trunc('month', current_date) - interval '5 months'
    GROUP BY 1 ORDER BY 1;
END;
$$;
REVOKE ALL ON FUNCTION public.dashboard_water_usage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_water_usage() TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_staff_invitation(invitation_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_invitations
    WHERE code_hash = encode(sha256(convert_to(invitation_code, 'UTF8')), 'hex')
      AND used_at IS NULL AND expires_at > now()
  );
$$;
REVOKE ALL ON FUNCTION public.validate_staff_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_staff_invitation(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_profile_from_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE assigned_role text; invite_id uuid; requested_username text;
BEGIN
  requested_username := lower(coalesce(NEW.raw_user_meta_data->>'username', ''));
  IF requested_username !~ '^[a-z0-9._-]{3,32}$' THEN RAISE EXCEPTION 'Invalid username'; END IF;

  IF coalesce(NEW.raw_app_meta_data->>'bootstrap_admin', 'false') = 'true'
     AND NOT EXISTS (SELECT 1 FROM public.profiles) THEN
    assigned_role := 'system_admin';
  ELSE
    UPDATE public.staff_invitations
      SET used_by = NEW.id, used_at = now()
      WHERE code_hash = encode(sha256(convert_to(coalesce(NEW.raw_user_meta_data->>'invitation_code', ''), 'UTF8')), 'hex')
        AND used_at IS NULL AND expires_at > now()
      RETURNING role_id, id INTO assigned_role, invite_id;
    IF assigned_role IS NULL THEN RAISE EXCEPTION 'Invitation is invalid, expired, or already used'; END IF;
  END IF;

  INSERT INTO public.profiles(id, username, email, display_name, role_id, is_active)
  VALUES (NEW.id, requested_username, lower(NEW.email), left(coalesce(NEW.raw_user_meta_data->>'display_name', ''), 160), assigned_role, true);
  RETURN NEW;
END;
$$;
CREATE TRIGGER create_profile_after_auth_signup AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_from_auth_user();

CREATE OR REPLACE FUNCTION public.consume_login_rate_limit(bucket_key char(64))
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_attempts integer;
BEGIN
  INSERT INTO public.login_rate_limits(bucket_key, window_start, attempts)
  VALUES ($1, now(), 1)
  ON CONFLICT (bucket_key) DO UPDATE SET
    attempts = CASE WHEN public.login_rate_limits.window_start < now() - interval '15 minutes' THEN 1 ELSE public.login_rate_limits.attempts + 1 END,
    window_start = CASE WHEN public.login_rate_limits.window_start < now() - interval '15 minutes' THEN now() ELSE public.login_rate_limits.window_start END
  RETURNING attempts INTO current_attempts;
  RETURN current_attempts <= 10;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_login_rate_limit(char) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_login_rate_limit(char) TO service_role;

CREATE OR REPLACE FUNCTION public.create_resident_with_membership(
  first_name text, last_name text, national_id_ciphertext text, national_id_lookup_hash char(64),
  birth_date date, phone text, household_id uuid, relationship text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.has_permission('registry.resident.create') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF relationship = 'หัวหน้าครัวเรือน' AND EXISTS (
    SELECT 1 FROM public.household_memberships WHERE household_memberships.household_id = $7 AND is_head AND move_out_at IS NULL
  ) THEN RAISE EXCEPTION 'Household already has an active head'; END IF;
  INSERT INTO public.residents(first_name, last_name, national_id_ciphertext, national_id_lookup_hash, birth_date, phone)
  VALUES (btrim($1), btrim($2), $3, $4, $5, nullif(btrim($6), '')) RETURNING id INTO new_id;
  INSERT INTO public.household_memberships(household_id, resident_id, relationship, is_head, move_in_at)
  VALUES ($7, new_id, $8, $8 = 'หัวหน้าครัวเรือน', current_date);
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_resident_with_membership(text,text,text,char,date,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_resident_with_membership(text,text,text,char,date,text,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.change_residency(resident_id uuid, destination_household_id uuid, relationship text, change_date date, change_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.has_permission('registry.resident.update') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF length(btrim(coalesce($5,''))) < 3 THEN RAISE EXCEPTION 'A reason is required'; END IF;
  PERFORM set_config('app.audit_reason', btrim($5), true);
  UPDATE public.household_memberships SET move_out_at = $4
    WHERE resident_id = $1 AND move_out_at IS NULL;
  IF $2 IS NULL THEN
    UPDATE public.residents SET residency_status = 'moved_out'::"ResidencyStatus" WHERE id = $1;
  ELSE
    IF $3 = 'หัวหน้าครัวเรือน' AND EXISTS (SELECT 1 FROM public.household_memberships WHERE household_id = $2 AND is_head AND move_out_at IS NULL) THEN
      RAISE EXCEPTION 'Household already has an active head';
    END IF;
    INSERT INTO public.household_memberships(household_id, resident_id, relationship, is_head, move_in_at)
    VALUES ($2, $1, $3, $3 = 'หัวหน้าครัวเรือน', $4);
    UPDATE public.residents SET residency_status = 'moved_in'::"ResidencyStatus" WHERE id = $1;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resident not found'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.change_residency(uuid,uuid,text,date,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_residency(uuid,uuid,text,date,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_resident_national_id_ciphertext(resident_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE ciphertext text;
BEGIN
  IF NOT public.has_permission('registry.resident.sensitive.read') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT national_id_ciphertext INTO ciphertext FROM public.residents WHERE id = $1;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, changes, reason)
  VALUES (auth.uid(), 'sensitive_read', 'residents', $1::text, '{"fields":["national_id_ciphertext"]}'::jsonb, 'ดูข้อมูลส่วนบุคคล');
  RETURN ciphertext;
END;
$$;
REVOKE ALL ON FUNCTION public.get_resident_national_id_ciphertext(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_resident_national_id_ciphertext(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.next_document_number(sequence_key text, document_prefix text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE allocated bigint; year_be integer := extract(year from now() at time zone 'Asia/Bangkok')::integer + 543;
BEGIN
  INSERT INTO public.number_sequences(key, prefix, next_value, updated_at)
  VALUES ($1, $2, 2, now())
  ON CONFLICT (key) DO UPDATE SET next_value = public.number_sequences.next_value + 1, updated_at = now()
  RETURNING next_value - 1 INTO allocated;
  RETURN $2 || right(year_be::text, 2) || lpad(allocated::text, 6, '0');
END;
$$;
REVOKE ALL ON FUNCTION public.next_document_number(text,text) FROM PUBLIC, anon;

CREATE UNIQUE INDEX household_one_active_head ON public.household_memberships(household_id)
  WHERE is_head = true AND move_out_at IS NULL;

CREATE OR REPLACE FUNCTION public.generate_water_invoice(reading_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE r public.meter_readings%ROWTYPE; m public.water_meters%ROWTYPE; c public.water_connections%ROWTYPE;
  tariff public.tariff_plans%ROWTYPE; previous_date date; period_start date; due_date date;
  water_cost numeric := 0; remaining numeric; lower_bound numeric := 0; tier record;
  invoice_id uuid; document_no text; snapshot jsonb;
BEGIN
  IF NOT public.has_permission('water.invoice.create') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO r FROM public.meter_readings WHERE id = $1 FOR UPDATE;
  IF NOT FOUND OR r.status <> 'recorded' OR r.usage IS NULL THEN RAISE EXCEPTION 'Reading must be verified before billing'; END IF;
  IF EXISTS (SELECT 1 FROM public.water_invoices WHERE meter_reading_id = r.id) THEN RAISE EXCEPTION 'Reading already billed'; END IF;
  SELECT * INTO m FROM public.water_meters WHERE id = r.meter_id;
  SELECT * INTO c FROM public.water_connections WHERE id = m.connection_id;
  SELECT reading_date INTO previous_date FROM public.meter_readings
    WHERE meter_id = m.id AND reading_date < r.reading_date ORDER BY reading_date DESC LIMIT 1;
  SELECT * INTO tariff FROM public.tariff_plans
    WHERE meter_size_mm = m.size_mm AND is_active = true AND effective_from <= r.reading_date
      AND (effective_until IS NULL OR effective_until >= r.reading_date)
    ORDER BY effective_from DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No effective tariff for this meter size'; END IF;
  period_start := coalesce(previous_date + 1, date_trunc('month', r.reading_date)::date);
  due_date := r.reading_date + tariff.due_days;
  IF tariff.mode = 'flat' THEN
    IF tariff.flat_rate_per_cubic_meter IS NULL THEN RAISE EXCEPTION 'Flat tariff rate is missing'; END IF;
    water_cost := round(r.usage * tariff.flat_rate_per_cubic_meter, 2);
    snapshot := jsonb_build_object('id', tariff.id, 'name', tariff.name, 'meterSizeMm', tariff.meter_size_mm, 'mode', tariff.mode, 'flatRatePerCubicMeter', tariff.flat_rate_per_cubic_meter, 'serviceFee', tariff.service_fee, 'dueDays', tariff.due_days);
  ELSE
    remaining := r.usage;
    FOR tier IN SELECT up_to_cubic_meters, rate_per_cubic_meter, sort_order FROM public.tariff_tiers WHERE tariff_plan_id = tariff.id ORDER BY sort_order LOOP
      IF tier.up_to_cubic_meters IS NULL THEN
        water_cost := water_cost + remaining * tier.rate_per_cubic_meter; remaining := 0;
      ELSE
        water_cost := water_cost + greatest(0, least(remaining, tier.up_to_cubic_meters - lower_bound)) * tier.rate_per_cubic_meter;
        remaining := greatest(0, remaining - greatest(0, tier.up_to_cubic_meters - lower_bound));
        lower_bound := tier.up_to_cubic_meters;
      END IF;
    END LOOP;
    IF remaining > 0 THEN RAISE EXCEPTION 'Progressive tariff tiers do not cover usage'; END IF;
    water_cost := round(water_cost, 2);
    SELECT jsonb_build_object('id', tariff.id, 'name', tariff.name, 'meterSizeMm', tariff.meter_size_mm, 'mode', tariff.mode, 'serviceFee', tariff.service_fee, 'dueDays', tariff.due_days,
      'tiers', coalesce(jsonb_agg(jsonb_build_object('upToCubicMeters', up_to_cubic_meters, 'ratePerCubicMeter', rate_per_cubic_meter, 'sortOrder', sort_order) ORDER BY sort_order), '[]'::jsonb))
      INTO snapshot FROM public.tariff_tiers WHERE tariff_plan_id = tariff.id;
  END IF;
  document_no := public.next_document_number('water_invoice', 'WI');
  INSERT INTO public.water_invoices(invoice_number, connection_id, meter_reading_id, period_start, period_end, due_date, usage, service_fee, total_amount, tariff_snapshot)
  VALUES (document_no, c.id, r.id, period_start, r.reading_date, due_date, r.usage, tariff.service_fee, water_cost + tariff.service_fee, snapshot)
  RETURNING id INTO invoice_id;
  INSERT INTO public.water_invoice_lines(invoice_id, description, quantity, unit_rate, amount)
  VALUES (invoice_id, 'ค่าน้ำประปา', r.usage, CASE WHEN tariff.mode = 'flat' THEN tariff.flat_rate_per_cubic_meter ELSE CASE WHEN r.usage = 0 THEN 0 ELSE water_cost / r.usage END END, water_cost);
  IF tariff.service_fee > 0 THEN
    INSERT INTO public.water_invoice_lines(invoice_id, description, quantity, unit_rate, amount)
    VALUES (invoice_id, 'ค่าบริการรายเดือน', 1, tariff.service_fee, tariff.service_fee);
  END IF;
  RETURN invoice_id;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_water_invoice(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_water_invoice(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_water_reading(reading_id uuid, approved boolean, reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.has_permission('water.reading.review') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF length(btrim(coalesce($3,''))) < 3 THEN RAISE EXCEPTION 'A review reason is required'; END IF;
  UPDATE public.meter_readings SET status = CASE WHEN $2 THEN 'recorded'::"ReadingStatus" ELSE 'rejected'::"ReadingStatus" END,
    note = concat_ws(E'\n', nullif(note,''), 'ผลตรวจ: ' || CASE WHEN $2 THEN 'ยืนยัน' ELSE 'ปฏิเสธ' END || ' · ' || btrim($3)),
    reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = $1 AND status = 'needs_review'::"ReadingStatus";
  IF NOT FOUND THEN RAISE EXCEPTION 'Reading is not awaiting review'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.review_water_reading(uuid,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_water_reading(uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_water_reading(meter_id uuid, reading_date date, reading_value numeric, note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE previous_value numeric; usage_value numeric; max_usage numeric; reading_status "ReadingStatus"; new_id uuid;
BEGIN
  IF NOT public.has_permission('water.reading.create') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF $3 < 0 THEN RAISE EXCEPTION 'Reading cannot be negative'; END IF;
  SELECT reading_value INTO previous_value FROM public.meter_readings
    WHERE meter_id = $1 AND reading_date < $2 ORDER BY reading_date DESC LIMIT 1 FOR UPDATE;
  SELECT max_monthly_water_use INTO max_usage FROM public.village_settings WHERE id = 1;
  usage_value := CASE WHEN previous_value IS NULL OR $3 < previous_value THEN NULL ELSE $3 - previous_value END;
  reading_status := CASE WHEN previous_value IS NOT NULL AND ($3 < previous_value OR usage_value > coalesce(max_usage,100)) THEN 'needs_review'::"ReadingStatus" ELSE 'recorded'::"ReadingStatus" END;
  INSERT INTO public.meter_readings(meter_id, reading_date, reading_value, usage, status, note, recorded_by)
  VALUES ($1, $2, $3, usage_value, reading_status, nullif($4,''), auth.uid()) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_water_reading(uuid,date,numeric,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_water_reading(uuid,date,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_water_payment(invoice_id uuid, amount numeric, payment_method "PaymentMethod", reference text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE invoice_row public.water_invoices%ROWTYPE; receipt text;
BEGIN
  IF NOT public.has_permission('water.payment.create') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF $2 <= 0 THEN RAISE EXCEPTION 'Payment must be positive'; END IF;
  SELECT * INTO invoice_row FROM public.water_invoices WHERE id = $1 FOR UPDATE;
  IF NOT FOUND OR invoice_row.status IN ('void'::"InvoiceStatus", 'needs_review'::"InvoiceStatus") THEN RAISE EXCEPTION 'Invoice cannot be paid'; END IF;
  IF invoice_row.paid_amount + $2 > invoice_row.total_amount THEN RAISE EXCEPTION 'Payment exceeds outstanding balance'; END IF;
  receipt := public.next_document_number('water_receipt', 'WR');
  INSERT INTO public.water_payments(invoice_id, receipt_number, amount, method, reference, received_by)
  VALUES ($1, receipt, $2, $3, nullif($4,''), auth.uid());
  UPDATE public.water_invoices SET paid_amount = paid_amount + $2,
    status = CASE WHEN paid_amount + $2 >= total_amount THEN 'paid'::"InvoiceStatus" ELSE 'partially_paid'::"InvoiceStatus" END
  WHERE id = $1;
  RETURN receipt;
END;
$$;
REVOKE ALL ON FUNCTION public.record_water_payment(uuid,numeric,"PaymentMethod",text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_water_payment(uuid,numeric,"PaymentMethod",text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_shop_sale(items jsonb, payment_method "PaymentMethod")
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE line record; product_row public.products%ROWTYPE; sale_id uuid; receipt text; quantity numeric;
  line_total numeric(14,2); sale_total numeric(14,2) := 0; item_count integer := 0;
BEGIN
  IF NOT public.has_permission('store.sale.create') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF jsonb_typeof($1) <> 'array' OR jsonb_array_length($1) = 0 OR jsonb_array_length($1) > 100 THEN RAISE EXCEPTION 'Cart must contain 1 to 100 products'; END IF;
  receipt := public.next_document_number('shop_receipt', 'SR');
  INSERT INTO public.sales(receipt_number, total_amount, paid_amount, payment_method, sold_by)
  VALUES (receipt, 0, 0, $2, auth.uid()) RETURNING id INTO sale_id;
  FOR line IN SELECT * FROM jsonb_to_recordset($1) AS entry(product_id uuid, quantity numeric) LOOP
    quantity := line.quantity;
    IF quantity IS NULL OR quantity <= 0 OR quantity > 10000 THEN RAISE EXCEPTION 'Invalid item quantity'; END IF;
    SELECT * INTO product_row FROM public.products WHERE id = line.product_id FOR UPDATE;
    IF NOT FOUND OR product_row.status <> 'active'::"ProductStatus" OR product_row.stock < quantity THEN RAISE EXCEPTION 'Product is unavailable or stock is insufficient'; END IF;
    line_total := round(quantity * product_row.sale_price, 2);
    sale_total := sale_total + line_total;
    item_count := item_count + 1;
    INSERT INTO public.sale_items(sale_id, product_id, product_name, quantity, unit_price, line_total)
    VALUES (sale_id, product_row.id, product_row.name, quantity, product_row.sale_price, line_total);
    UPDATE public.products SET stock = stock - quantity WHERE id = product_row.id;
    INSERT INTO public.inventory_movements(product_id, quantity, movement_type, reference, reason, created_by)
    VALUES (product_row.id, -quantity, 'SALE', receipt, 'ขายหน้าร้าน', auth.uid());
  END LOOP;
  IF item_count = 0 THEN RAISE EXCEPTION 'Cart has no valid items'; END IF;
  UPDATE public.sales SET total_amount = sale_total, paid_amount = sale_total WHERE id = sale_id;
  RETURN receipt;
END;
$$;
REVOKE ALL ON FUNCTION public.record_shop_sale(jsonb,"PaymentMethod") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_shop_sale(jsonb,"PaymentMethod") TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE target jsonb; changed text[]; row_id text;
BEGIN
  target := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  row_id := coalesce(target->>'id', target->>'household_id', target->>'invoice_id', target->>'meter_id', target->>'transaction_no', target->>'contract_no', target->>'receipt_number');
  IF TG_OP = 'UPDATE' THEN
    SELECT coalesce(array_agg(key ORDER BY key), ARRAY[]::text[]) INTO changed
      FROM jsonb_each(to_jsonb(NEW)) n(key, value)
      WHERE n.value IS DISTINCT FROM (to_jsonb(OLD)->n.key)
        AND n.key NOT IN ('national_id_ciphertext','national_id_lookup_hash','password','password_hash');
  ELSE
    SELECT coalesce(array_agg(key ORDER BY key), ARRAY[]::text[]) INTO changed
      FROM jsonb_object_keys(target) AS k(key)
      WHERE key NOT IN ('national_id_ciphertext','national_id_lookup_hash','password','password_hash');
  END IF;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, changes, reason)
  VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, row_id, jsonb_build_object('fields', changed), coalesce(nullif(current_setting('app.audit_reason', true), ''), 'บันทึกจากระบบ'));
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit log is append-only'; END $$;
CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','roles','permissions','role_permissions','staff_invitations','login_rate_limits','village_settings',
    'households','residents','household_memberships','water_connections','water_meters','meter_readings','tariff_plans','tariff_tiers','water_invoices','water_invoice_lines','water_payments','number_sequences',
    'funds','fund_accounts','fund_members','fund_transactions','loan_products','loans','loan_guarantors','loan_installments','loan_payments',
    'product_categories','products','inventory_movements','sales','sale_items','audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
REVOKE ALL ON public.login_rate_limits, public.staff_invitations, public.number_sequences FROM anon, authenticated;
REVOKE UPDATE ON public.meter_readings FROM authenticated;
REVOKE ALL ON public.residents FROM authenticated;
GRANT SELECT (id, first_name, last_name, birth_date, phone, residency_status, created_at, updated_at) ON public.residents TO authenticated;

CREATE POLICY profile_read_self_or_manager ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_permission('users.manage'));
CREATE POLICY roles_read_inviter ON public.roles FOR SELECT TO authenticated USING (public.has_permission('users.invite') OR public.has_permission('roles.manage'));
CREATE POLICY permissions_read_admin ON public.permissions FOR SELECT TO authenticated USING (public.has_permission('roles.manage'));
CREATE POLICY role_permissions_read_admin ON public.role_permissions FOR SELECT TO authenticated USING (public.has_permission('roles.manage'));
CREATE POLICY settings_read_dashboard ON public.village_settings FOR SELECT TO authenticated USING (public.has_permission('dashboard.view'));
CREATE POLICY settings_update_manager ON public.village_settings FOR UPDATE TO authenticated USING (public.has_permission('settings.manage')) WITH CHECK (public.has_permission('settings.manage'));

CREATE POLICY households_read_registry ON public.households FOR SELECT TO authenticated USING (public.has_permission('registry.household.view'));
CREATE POLICY households_create_registry ON public.households FOR INSERT TO authenticated WITH CHECK (public.has_permission('registry.household.create'));
CREATE POLICY households_update_registry ON public.households FOR UPDATE TO authenticated USING (public.has_permission('registry.household.update')) WITH CHECK (public.has_permission('registry.household.update'));
CREATE POLICY residents_read_registry ON public.residents FOR SELECT TO authenticated USING (public.has_permission('registry.resident.view'));
CREATE POLICY memberships_read_registry ON public.household_memberships FOR SELECT TO authenticated USING (public.has_permission('registry.resident.view') OR public.has_permission('registry.household.view'));

CREATE POLICY water_connections_read ON public.water_connections FOR SELECT TO authenticated USING (public.has_permission('water.reading.view') OR public.has_permission('water.invoice.view'));
CREATE POLICY water_meters_read ON public.water_meters FOR SELECT TO authenticated USING (public.has_permission('water.reading.view'));
CREATE POLICY readings_read ON public.meter_readings FOR SELECT TO authenticated USING (public.has_permission('water.reading.view'));
CREATE POLICY tariffs_read ON public.tariff_plans FOR SELECT TO authenticated USING (public.has_permission('water.invoice.view') OR public.has_permission('water.tariff.manage'));
CREATE POLICY tariff_tiers_read ON public.tariff_tiers FOR SELECT TO authenticated USING (public.has_permission('water.invoice.view') OR public.has_permission('water.tariff.manage'));
CREATE POLICY tariffs_manage ON public.tariff_plans FOR ALL TO authenticated USING (public.has_permission('water.tariff.manage')) WITH CHECK (public.has_permission('water.tariff.manage'));
CREATE POLICY tariff_tiers_manage ON public.tariff_tiers FOR ALL TO authenticated USING (public.has_permission('water.tariff.manage')) WITH CHECK (public.has_permission('water.tariff.manage'));
CREATE POLICY invoices_read ON public.water_invoices FOR SELECT TO authenticated USING (public.has_permission('water.invoice.view'));
CREATE POLICY invoice_lines_read ON public.water_invoice_lines FOR SELECT TO authenticated USING (public.has_permission('water.invoice.view'));
CREATE POLICY water_payments_read ON public.water_payments FOR SELECT TO authenticated USING (public.has_permission('water.invoice.view'));

CREATE POLICY funds_read ON public.funds FOR SELECT TO authenticated USING (public.has_permission('fund.view'));
CREATE POLICY fund_accounts_read ON public.fund_accounts FOR SELECT TO authenticated USING (public.has_permission('fund.view'));
CREATE POLICY fund_members_read ON public.fund_members FOR SELECT TO authenticated USING (public.has_permission('fund.view') OR public.has_permission('loan.view'));
CREATE POLICY fund_transactions_read ON public.fund_transactions FOR SELECT TO authenticated USING (public.has_permission('fund.view'));
REVOKE INSERT ON public.fund_transactions FROM authenticated;

CREATE OR REPLACE FUNCTION public.approve_fund_transaction(transaction_id uuid, approve boolean, reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE entry public.fund_transactions%ROWTYPE;
BEGIN
  IF NOT public.has_permission('fund.transaction.approve') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO entry FROM public.fund_transactions WHERE id = $1 FOR UPDATE;
  IF NOT FOUND OR entry.status <> 'pending'::"ApprovalStatus" THEN RAISE EXCEPTION 'Transaction is not awaiting approval'; END IF;
  IF entry.created_by = auth.uid() THEN RAISE EXCEPTION 'The creator cannot approve their own transaction'; END IF;
  IF NOT $2 AND length(btrim(coalesce($3,''))) < 3 THEN RAISE EXCEPTION 'A rejection reason is required'; END IF;
  UPDATE public.fund_transactions SET status = CASE WHEN $2 THEN 'approved'::"ApprovalStatus" ELSE 'rejected'::"ApprovalStatus" END,
    approved_by = auth.uid(), approved_at = now(), reason = nullif(btrim($3),'') WHERE id = $1;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_fund_transaction(uuid,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_fund_transaction(uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_fund_transaction(fund_id uuid, account_id uuid, transaction_type "FundTransactionType", amount numeric, description text, member_id uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE transaction_no text;
BEGIN
  IF NOT public.has_permission('fund.transaction.create') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF $4 <= 0 OR length(btrim(coalesce($5,''))) < 3 THEN RAISE EXCEPTION 'Amount and description are required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fund_accounts WHERE id = $2 AND fund_id = $1 AND is_active) THEN RAISE EXCEPTION 'Invalid fund account'; END IF;
  IF $6 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.fund_members WHERE id = $6 AND fund_id = $1 AND status = 'ACTIVE') THEN RAISE EXCEPTION 'Invalid fund member'; END IF;
  transaction_no := public.next_document_number('fund_transaction', 'FT');
  INSERT INTO public.fund_transactions(transaction_no, fund_id, account_id, member_id, type, amount, description, status, created_by)
  VALUES (transaction_no, $1, $2, $6, $3, $4, btrim($5), 'pending'::"ApprovalStatus", auth.uid());
  RETURN transaction_no;
END;
$$;
REVOKE ALL ON FUNCTION public.record_fund_transaction(uuid,uuid,"FundTransactionType",numeric,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_fund_transaction(uuid,uuid,"FundTransactionType",numeric,text,uuid) TO authenticated;

CREATE POLICY loan_products_read ON public.loan_products FOR SELECT TO authenticated USING (public.has_permission('loan.view'));
CREATE POLICY loans_read ON public.loans FOR SELECT TO authenticated USING (public.has_permission('loan.view'));
CREATE POLICY loan_guarantors_read ON public.loan_guarantors FOR SELECT TO authenticated USING (public.has_permission('loan.view'));
CREATE POLICY loan_installments_read ON public.loan_installments FOR SELECT TO authenticated USING (public.has_permission('loan.view'));
CREATE POLICY loan_payments_read ON public.loan_payments FOR SELECT TO authenticated USING (public.has_permission('loan.view'));

CREATE POLICY categories_read ON public.product_categories FOR SELECT TO authenticated USING (public.has_permission('store.view'));
CREATE POLICY products_read ON public.products FOR SELECT TO authenticated USING (public.has_permission('store.view'));
CREATE POLICY products_manage ON public.products FOR ALL TO authenticated USING (public.has_permission('store.product.manage')) WITH CHECK (public.has_permission('store.product.manage'));
CREATE POLICY inventory_read ON public.inventory_movements FOR SELECT TO authenticated USING (public.has_permission('store.view'));
CREATE POLICY sales_read ON public.sales FOR SELECT TO authenticated USING (public.has_permission('store.view'));
CREATE POLICY sale_items_read ON public.sale_items FOR SELECT TO authenticated USING (public.has_permission('store.view'));
CREATE POLICY audit_read ON public.audit_logs FOR SELECT TO authenticated USING (public.has_permission('audit.view'));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','households','residents','household_memberships','water_connections','water_meters','meter_readings','tariff_plans','tariff_tiers','water_invoices','water_invoice_lines','water_payments','funds','fund_accounts','fund_members','fund_transactions','loan_products','loans','loan_guarantors','loan_installments','loan_payments','product_categories','products','inventory_movements','sales','sale_items'] LOOP
    EXECUTE format('CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t, t);
  END LOOP;
END $$;
