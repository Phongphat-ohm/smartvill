CREATE OR REPLACE FUNCTION public.consume_login_rate_limit(bucket_key char(64))
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_attempts integer;
BEGIN
  INSERT INTO public.login_rate_limits AS limits(bucket_key, window_start, attempts)
  VALUES ($1, now(), 1)
  ON CONFLICT ON CONSTRAINT login_rate_limits_pkey DO UPDATE SET
    attempts = CASE WHEN limits.window_start < now() - interval '15 minutes' THEN 1 ELSE limits.attempts + 1 END,
    window_start = CASE WHEN limits.window_start < now() - interval '15 minutes' THEN now() ELSE limits.window_start END
  RETURNING limits.attempts INTO current_attempts;
  RETURN current_attempts <= 10;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_login_rate_limit(char) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_login_rate_limit(char) TO service_role;

-- With no JWT, auth.uid() is NULL and has_permission returns false.
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO anon, authenticated;
