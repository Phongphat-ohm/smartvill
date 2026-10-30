-- Scalable registry search, durable household-head history, and deceased metadata.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

ALTER TABLE public.residents
  ADD COLUMN deceased_at date,
  ADD COLUMN death_reason varchar(255);

ALTER TABLE public.residents
  ADD CONSTRAINT residents_death_metadata_check
  CHECK (
    (residency_status = 'deceased'::public."ResidencyStatus")
    OR (deceased_at IS NULL AND death_reason IS NULL)
  ),
  ADD CONSTRAINT residents_death_date_check
  CHECK (deceased_at IS NULL OR birth_date IS NULL OR deceased_at >= birth_date);

CREATE TABLE public.household_head_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE RESTRICT,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE RESTRICT,
  started_at date NOT NULL,
  ended_at date,
  reason varchar(255) NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT household_head_history_dates_check CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE UNIQUE INDEX household_memberships_one_active_head
  ON public.household_memberships(household_id)
  WHERE move_out_at IS NULL AND is_head;

CREATE UNIQUE INDEX household_head_history_one_current_head
  ON public.household_head_history(household_id)
  WHERE ended_at IS NULL;

CREATE INDEX household_head_history_household_started_idx
  ON public.household_head_history(household_id, started_at DESC);
CREATE INDEX household_head_history_resident_started_idx
  ON public.household_head_history(resident_id, started_at DESC);
CREATE INDEX household_head_history_changed_by_created_idx
  ON public.household_head_history(changed_by, created_at DESC);

-- Baseline the current head. Future changes are recorded with their exact effective date and actor.
INSERT INTO public.household_head_history(household_id, resident_id, started_at, reason)
SELECT hm.household_id, hm.resident_id, hm.move_in_at, 'ข้อมูลตั้งต้นจากเจ้าบ้านปัจจุบัน'
FROM public.household_memberships hm
WHERE hm.move_out_at IS NULL AND hm.is_head;

-- Search and stable cursor-order indexes for growing registry datasets.
CREATE INDEX residents_first_name_trgm_idx
  ON public.residents USING gin (first_name extensions.gin_trgm_ops);
CREATE INDEX residents_last_name_trgm_idx
  ON public.residents USING gin (last_name extensions.gin_trgm_ops);
CREATE INDEX residents_phone_trgm_idx
  ON public.residents USING gin (phone extensions.gin_trgm_ops)
  WHERE phone IS NOT NULL;
CREATE INDEX households_house_number_trgm_idx
  ON public.households USING gin (house_number extensions.gin_trgm_ops);
CREATE INDEX residents_status_name_cursor_idx
  ON public.residents(residency_status, last_name, first_name, id);
CREATE INDEX households_status_number_cursor_idx
  ON public.households(occupancy_status, house_number, id);

ALTER TABLE public.household_head_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.household_head_history FROM anon, authenticated;
GRANT SELECT ON TABLE public.household_head_history TO authenticated;

CREATE POLICY household_head_history_read
  ON public.household_head_history
  FOR SELECT
  TO authenticated
  USING ((SELECT public.has_permission('registry.household.view')));

CREATE TRIGGER audit_household_head_history
  AFTER INSERT OR UPDATE OR DELETE ON public.household_head_history
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
