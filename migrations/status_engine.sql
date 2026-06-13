-- ============================================================
-- Status engine v1: daily streaks + founding member numbers
--
-- Adds three protected profile columns and the daily check-in path that was
-- defined (the 'daily_login' stamp_action) but never actually wired to anything.
--
--   login_streak     consecutive days the fan has checked in
--   last_active_date  the day of their last check-in (UTC)
--   member_number     permanent, per-tenant join order ("fan #14")
--
-- SECURITY MODEL (mirrors the existing award_stamps / guard pattern):
--   * Streak + stamp award happen only inside daily_checkin() (SECURITY DEFINER),
--     so a fan can never inflate their own streak from the browser.
--   * The protected-columns guard trigger is extended to clamp the three new
--     columns back to their old values for ordinary fans (same as stamp_count).
--   * member_number is assigned by a BEFORE INSERT trigger and always overwrites
--     whatever the client sent, so it can't be forged.
--
-- No RLS policy changes: profiles already has its read/insert/update policies and
-- the additive guard trigger from harden_rls_security.sql; we only extend that.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ── 1. Columns ───────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS member_number integer;

-- ── 2. Backfill member numbers by existing join order, per tenant ─────────────
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY tenant_id ORDER BY created_at, id) AS rn
  FROM public.profiles
)
UPDATE public.profiles p
SET member_number = r.rn
FROM ranked r
WHERE p.id = r.id AND p.member_number IS NULL;

-- ── 3. Assign member_number on insert (always overwrites client input) ────────
CREATE OR REPLACE FUNCTION public.assign_member_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(MAX(member_number), 0) + 1
    INTO NEW.member_number
    FROM public.profiles
   WHERE tenant_id = NEW.tenant_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_member_number ON public.profiles;
CREATE TRIGGER assign_member_number
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_member_number();

-- ── 4. Daily check-in: streak update + once-per-day daily_login award ─────────
-- Returns the (new) streak. Safe to call repeatedly: a second call on the same
-- UTC day is a no-op that just returns the current streak.
CREATE OR REPLACE FUNCTION public.daily_checkin(p_tenant_id bigint DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  tid bigint;
  last_date date;
  cur_streak integer;
  new_streak integer;
BEGIN
  IF uid IS NULL THEN RETURN 0; END IF;

  IF p_tenant_id IS NULL THEN
    SELECT tenant_id INTO tid FROM public.profiles WHERE id = uid LIMIT 1;
  ELSE
    tid := p_tenant_id;
  END IF;
  IF tid IS NULL THEN RETURN 0; END IF;

  SELECT last_active_date, login_streak INTO last_date, cur_streak
    FROM public.profiles WHERE id = uid AND tenant_id = tid;

  -- Already checked in today: nothing to do.
  IF last_date = current_date THEN
    RETURN COALESCE(cur_streak, 0);
  END IF;

  -- Consecutive day continues the streak; any gap resets it to 1.
  IF last_date = current_date - 1 THEN
    new_streak := COALESCE(cur_streak, 0) + 1;
  ELSE
    new_streak := 1;
  END IF;

  UPDATE public.profiles
     SET login_streak = new_streak, last_active_date = current_date
   WHERE id = uid AND tenant_id = tid;

  -- Award the daily_login stamps (award_stamps no-ops for band/admin and when
  -- the action is missing/inactive).
  PERFORM public.award_stamps(uid, 'daily_login', tid);

  RETURN new_streak;
END;
$$;

GRANT EXECUTE ON FUNCTION public.daily_checkin(bigint) TO authenticated, anon;

-- ── 5. Extend the protected-columns guard to clamp the new columns ────────────
-- This is the same function from harden_rls_security.sql; only the fan-branch
-- clamp list at the bottom gains login_streak / last_active_date / member_number.
-- The privileged early-returns (service role, super admin, tenant admin) are
-- preserved exactly so daily_checkin() and admin tooling keep working.
CREATE OR REPLACE FUNCTION public.guard_profile_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = '5cdcf898-6bda-42b7-860e-0964562c9c22'::uuid THEN
    RETURN NEW;
  END IF;

  IF public.is_tenant_admin(OLD.tenant_id) THEN
    RETURN NEW;
  END IF;

  -- Fan editing their own profile: protected values are pinned to their old
  -- values no matter what was submitted.
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
