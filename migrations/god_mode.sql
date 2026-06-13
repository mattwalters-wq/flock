-- ============================================================
-- God mode: full cross-tenant access for the platform owner.
--
-- Lets the flock owner act in ANY community (post, comment, moderate, manage,
-- edit settings/tiers/members, adjust profiles) regardless of tenant membership.
--
-- DESIGN — deliberately ADDITIVE and low-risk:
--   * Adds one is_god() helper, recognised by the owner's auth id OR email
--     (keep in sync with src/lib/god.js).
--   * For each tenant table, adds ONE permissive "god_all" policy. Postgres
--     OR-combines permissive policies, so this only ever GRANTS the owner extra
--     access — the existing fan/artist policies are left completely untouched.
--     For everyone who isn't god, is_god() is false and these policies add nothing.
--   * The only existing object changed is guard_profile_protected_columns, whose
--     hardcoded owner UUID check is swapped for is_god() so the owner (by id or
--     email) can edit protected profile columns anywhere. Its other branches are
--     reproduced verbatim, and it stays SECURITY INVOKER.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ── Identity ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_god()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid() = '5cdcf898-6bda-42b7-860e-0964562c9c22'::uuid
      OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'matt.walters@unifiedmusicgroup.com';
$$;

GRANT EXECUTE ON FUNCTION public.is_god() TO anon, authenticated, service_role;

-- ── Additive "god can do anything" policies, one per tenant table ─────────────
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'tenants','tenant_config','tenant_members','profiles',
    'posts','comments','post_likes','poll_votes',
    'shows','show_attendance',
    'stamp_actions','stamp_transactions','reward_tiers','reward_claims',
    'notifications'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('DROP POLICY IF EXISTS god_all ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY god_all ON public.%I FOR ALL USING (public.is_god()) WITH CHECK (public.is_god())', t);
    END IF;
  END LOOP;

  -- comment_likes ships in its own migration; only cover it if present.
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'comment_likes') THEN
    DROP POLICY IF EXISTS god_all ON public.comment_likes;
    CREATE POLICY god_all ON public.comment_likes FOR ALL USING (public.is_god()) WITH CHECK (public.is_god());
  END IF;
END $$;

-- ── Let the owner edit protected profile columns anywhere ─────────────────────
-- Same guard as harden_rls_security.sql / status_engine.sql; only the owner check
-- changes from a hardcoded UUID to is_god(). Stays SECURITY INVOKER so it still
-- clamps ordinary fans.
CREATE OR REPLACE FUNCTION public.guard_profile_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Platform owner (god) may change anything, in any tenant.
  IF public.is_god() THEN
    RETURN NEW;
  END IF;

  IF public.is_tenant_admin(OLD.tenant_id) THEN
    RETURN NEW;
  END IF;

  NEW.stamp_count      := OLD.stamp_count;
  NEW.stamp_level      := OLD.stamp_level;
  NEW.role             := OLD.role;
  NEW.show_count       := OLD.show_count;
  NEW.tenant_id        := OLD.tenant_id;
  NEW.login_streak     := OLD.login_streak;
  NEW.last_active_date := OLD.last_active_date;
  NEW.member_number    := OLD.member_number;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_protected_columns ON public.profiles;
CREATE TRIGGER guard_profile_protected_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_protected_columns();
