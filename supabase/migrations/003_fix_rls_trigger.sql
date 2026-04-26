-- ============================================================
-- FIX: handle_new_user trigger + users RLS insert policy
-- The trigger fires before a session exists, so auth.uid() = NULL
-- which causes the INSERT policy to reject the row.
-- ============================================================

-- 1. Rebuild the trigger function with SECURITY DEFINER owned by postgres
--    (postgres is superuser → bypasses RLS) and a safe exception handler
--    so auth user creation never fails even if the insert errors.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
BEGIN
  SELECT id INTO default_role_id FROM public.roles WHERE name = 'member' LIMIT 1;

  INSERT INTO public.users (id, name, email, role_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    default_role_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure owned by postgres so SECURITY DEFINER = superuser = RLS bypassed
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- 2. Replace the overly-strict INSERT policy on users.
--    Allow inserts where either:
--      a) The inserting session is the same user (normal signup flow via Supabase client)
--      b) auth.uid() IS NULL (trigger context — no session yet)
DROP POLICY IF EXISTS "users_insert_self" ON public.users;

CREATE POLICY "users_insert_self" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- 3. Re-attach the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
