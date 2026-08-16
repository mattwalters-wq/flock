-- ============================================================
-- Founder-rate deadline (v1): soft urgency for new signups
--
-- New tenants get a 14-day window (set by the onboarding API at creation) to
-- lock the $1/month founder rate; the dashboard shows a countdown banner
-- until billing is active or the window closes. Existing tenants keep
-- founder_deadline NULL — grandfathered, no countdown, billing stays a quiet
-- opt-in card. Nothing is enforced server-side yet; this is messaging state.
--
-- Written only by the service role (tenants has no client write policies).
-- Idempotent: safe to run more than once.
-- ============================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS founder_deadline timestamptz;
