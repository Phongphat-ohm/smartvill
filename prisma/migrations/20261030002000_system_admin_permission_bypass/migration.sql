-- A system administrator is a database-controlled role and must retain access even
-- if role_permissions was not seeded or is temporarily incomplete. Other roles
-- still require an explicit permission row.
CREATE OR REPLACE FUNCTION public.has_permission(permission_key text)
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
      AND (
        p.role_id = 'system_admin'
        OR EXISTS (
          SELECT 1
          FROM public.role_permissions rp
          WHERE rp.role_id = p.role_id
            AND rp.permission_key = has_permission.permission_key
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;
