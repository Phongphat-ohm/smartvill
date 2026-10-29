CREATE TABLE public.bootstrap_admin_tokens (
  token_hash char(64) PRIMARY KEY,
  expires_at timestamptz(6) NOT NULL,
  used_at timestamptz(6),
  created_at timestamptz(6) NOT NULL DEFAULT now()
);
ALTER TABLE public.bootstrap_admin_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bootstrap_admin_tokens FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.bootstrap_admin_tokens FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_profile_from_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE assigned_role text; invite_id uuid; requested_username text; bootstrap_hash text;
BEGIN
  requested_username := lower(coalesce(NEW.raw_user_meta_data->>'username', ''));
  IF requested_username !~ '^[a-z0-9._-]{3,32}$' THEN RAISE EXCEPTION 'Invalid username'; END IF;

  IF coalesce(NEW.raw_user_meta_data->>'bootstrap_token', '') <> '' THEN
    PERFORM pg_advisory_xact_lock(hashtext('village_bootstrap_admin'));
    IF NOT EXISTS (SELECT 1 FROM public.profiles) THEN
      bootstrap_hash := encode(sha256(convert_to(NEW.raw_user_meta_data->>'bootstrap_token', 'UTF8')), 'hex');
      UPDATE public.bootstrap_admin_tokens SET used_at = now()
        WHERE token_hash = bootstrap_hash AND used_at IS NULL AND expires_at > now()
        RETURNING token_hash INTO bootstrap_hash;
      IF FOUND THEN assigned_role := 'system_admin'; END IF;
    END IF;
  END IF;

  IF assigned_role IS NULL THEN
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
