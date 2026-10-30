-- Prisma generated UUID values client-side, but Supabase Data API and the
-- SECURITY DEFINER business functions rely on database defaults.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'staff_invitations',
    'households', 'residents', 'household_memberships',
    'water_connections', 'water_meters', 'meter_readings',
    'tariff_plans', 'tariff_tiers', 'water_invoices', 'water_invoice_lines', 'water_payments',
    'funds', 'fund_accounts', 'fund_members', 'fund_transactions',
    'loan_products', 'loans', 'loan_installments', 'loan_payments',
    'product_categories', 'products', 'inventory_movements', 'sales', 'sale_items'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT gen_random_uuid()', table_name);
  END LOOP;
END $$;

-- This function reads the database-controlled profile, rather than mutable user
-- metadata, so system administrator policies do not trust client-supplied claims.
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.role_id = 'system_admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_system_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_system_admin() TO authenticated;

-- System administrators can maintain master/configuration data. Transactional
-- tables remain write-protected and are changed only through permission-checked
-- RPC functions, preserving numbering, audit, and approval invariants.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles', 'roles', 'permissions', 'role_permissions', 'village_settings',
    'households', 'household_memberships',
    'water_connections', 'water_meters', 'tariff_plans', 'tariff_tiers',
    'funds', 'fund_accounts', 'fund_members', 'loan_products',
    'product_categories', 'products'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_system_admin()) WITH CHECK (public.is_system_admin())',
      table_name || '_system_admin_manage', table_name
    );
  END LOOP;
END $$;
