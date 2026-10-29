ALTER TABLE public.audit_logs
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
