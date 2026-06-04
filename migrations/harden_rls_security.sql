-- ============================================================
-- SECURITY HARDENING: protected profile columns + tenant isolation
--
-- Two gaps this closes:
--
--  1. PRIVILEGE / CURRENCY ESCALATION
--     `profiles_update_own` lets a fan UPDATE their own profile row,
--     and that row holds stamp_count / stamp_level / role / show_count.
--     Nothing stopped a fan from doing
--         update profiles set stamp_count = 999999, role = 'admin'
--     straight from the browser (anon key) and unlocking every reward.
--     Stamps are supposed to be awarded only by the SECURITY DEFINER
--     award_stamps() path; roles only by an admin.
--
--  2. CROSS-TENANT WRITES
--     The insert policies only checked authorship (auth.uid() = author_id)
--     but never that the row's tenant_id is the writer's OWN tenant, so a
--     user could insert posts/comments/likes tagged with another tenant's
--     id and have them surface in that community's feed.
--
-- Approach is deliberately ADDITIVE for profiles: we keep the existing
-- profiles_update_own / admin update paths intact and add a BEFORE UPDATE
-- trigger that simply *clamps* the protected columns back to their old
-- values unless the caller is privileged. That way the manual point awards
-- and role changes in the admin dashboard keep working, the DB-internal
-- award_stamps()/checkin_show() functions keep working, and ordinary fans
-- can still edit their display_name / bio / city / avatar / email prefs.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ── Helper: the calling user's own tenant_id ────────────────────────────────
-- SECURITY DEFINER so it reads profiles without tripping RLS (and so a policy
-- that uses it on the profiles table itself can't recurse).
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ── Helper: is the caller a band/admin within the given tenant? ──────────────
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND tenant_id = p_tenant_id
      AND role IN ('band', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(bigint) TO anon, authenticated, service_role;

-- ============================================================
-- 1. PROTECTED PROFILE COLUMNS
-- ============================================================

-- NOTE: this trigger runs SECURITY INVOKER (the default) on purpose. We need
-- current_user to reflect the real caller: for a browser/PostgREST request it
-- is 'authenticated'/'anon'; for an internal SECURITY DEFINER call (award_stamps,
-- checkin_show) or the service-role key it is the owner/service role, which must
-- be free to change anything. The privileged lookup is delegated to the
-- is_tenant_admin() SECURITY DEFINER helper so RLS on profiles isn't an issue.
CREATE OR REPLACE FUNCTION public.guard_profile_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- DB-internal contexts run as the table owner, not as the PostgREST
  -- request roles. award_stamps() / checkin_show() (SECURITY DEFINER) and
  -- the service-role key must be free to change anything.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Super admin (Flock platform owner) may change anything.
  IF auth.uid() = '5cdcf898-6bda-42b7-860e-0964562c9c22'::uuid THEN
    RETURN NEW;
  END IF;

  -- A band/admin acting inside the target row's tenant may adjust stamps and
  -- roles. This is what powers the admin dashboard's manual "+10" point awards
  -- and the role dropdown. (Uses OLD.tenant_id so it can't be sidestepped by
  -- also rewriting tenant_id in the same statement.)
  IF public.is_tenant_admin(OLD.tenant_id) THEN
    RETURN NEW;
  END IF;

  -- Everyone else (a fan editing their own profile) keeps their existing
  -- protected values no matter what they submitted. Non-protected columns
  -- (display_name, bio, city, avatar_url, email_notifications, referral_count)
  -- pass through unchanged.
  NEW.stamp_count := OLD.stamp_count;
  NEW.stamp_level := OLD.stamp_level;
  NEW.role        := OLD.role;
  NEW.show_count  := OLD.show_count;
  NEW.tenant_id   := OLD.tenant_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_protected_columns ON public.profiles;
CREATE TRIGGER guard_profile_protected_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_protected_columns();

-- Make the admin update path explicit in the schema (additive — the existing
-- profiles_update_own policy is left untouched). Without this, the only
-- documented update policy is "own row", yet the admin dashboard updates other
-- fans' rows; this records that intent and authorises it cleanly.
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
FOR UPDATE
USING (
  auth.uid() = '5cdcf898-6bda-42b7-860e-0964562c9c22'::uuid
  OR public.is_tenant_admin(tenant_id)
);

-- ============================================================
-- 2. TENANT-SCOPED INSERT POLICIES
--    Each is replaced with the same authorship check PLUS a guarantee that the
--    row's tenant_id is the writer's own tenant. The app already always sets
--    tenant_id to the current tenant, so this only blocks forged writes.
-- ============================================================

DROP POLICY IF EXISTS "posts_insert" ON public.posts;
CREATE POLICY "posts_insert" ON public.posts
FOR INSERT WITH CHECK (
  auth.uid() = author_id AND tenant_id = public.current_tenant_id()
);

DROP POLICY IF EXISTS "comments_insert" ON public.comments;
CREATE POLICY "comments_insert" ON public.comments
FOR INSERT WITH CHECK (
  auth.uid() = author_id AND tenant_id = public.current_tenant_id()
);

DROP POLICY IF EXISTS "likes_insert" ON public.post_likes;
CREATE POLICY "likes_insert" ON public.post_likes
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND tenant_id = public.current_tenant_id()
);

DROP POLICY IF EXISTS "poll_votes_insert" ON public.poll_votes;
CREATE POLICY "poll_votes_insert" ON public.poll_votes
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND tenant_id = public.current_tenant_id()
);

DROP POLICY IF EXISTS "reward_claims_insert" ON public.reward_claims;
CREATE POLICY "reward_claims_insert" ON public.reward_claims
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND tenant_id = public.current_tenant_id()
);

-- comment_likes ships in its own migration; only re-scope it if present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'comment_likes') THEN
    DROP POLICY IF EXISTS comment_likes_insert ON public.comment_likes;
    CREATE POLICY comment_likes_insert ON public.comment_likes
    FOR INSERT WITH CHECK (
      auth.uid() = user_id AND tenant_id = public.current_tenant_id()
    );
  END IF;
END $$;
