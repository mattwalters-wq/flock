-- ============================================================
-- Task 2: "Powered by Flock" branding toggle
--
-- Adds a per-tenant switch to hide the "powered by flock" footer (intended for
-- a future paid tier). Defaults to FALSE so branding shows for everyone until
-- explicitly turned off. No UI yet — flipped manually for now.
--
-- RLS: no new policies needed.
--   * tenants already has public SELECT ("tenants_read" USING (true)), so the
--     app's getTenantBySlug (and the layout) can read hide_branding.
--   * tenants has NO INSERT/UPDATE policy for anon/authenticated, so the column
--     can only ever be written via the service-role key (the onboarding API and
--     the platform admin) — fans/tenants cannot toggle their own branding.
--   This matches the existing pattern; the new column inherits it automatically.
--
-- Idempotent: safe to run more than once.
-- ============================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS hide_branding boolean NOT NULL DEFAULT false;
