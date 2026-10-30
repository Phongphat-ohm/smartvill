-- Prisma application requests do not carry a Supabase JWT in the PostgreSQL session.
-- The application writes its actor-aware audit event in the same Prisma transaction.
-- Keep trigger auditing for JWT-backed database operations only to avoid duplicate/null actors.
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE target jsonb; changed text[]; row_id text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
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
