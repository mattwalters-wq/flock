-- ============================================================
-- Task 4: tenant referrals (v1)
--
-- Records which existing tenant referred a newly created tenant. The referral
-- "code" is simply the referrer's slug — no separate code table. Crediting (e.g.
-- free months) is handled manually for now; this just captures attribution.
--
--   referred_by -> tenants.id of the referrer (nullable; null = organic signup).
--   ON DELETE SET NULL so removing a referrer doesn't cascade-delete referrals.
--
-- RLS: no new policies needed (same reasoning as hide_branding).
--   * tenants already has public SELECT ("tenants_read" USING (true)).
--   * tenants has NO INSERT/UPDATE policy for anon/authenticated, so referred_by
--     can only be written via the service-role key (the onboarding API). A tenant
--     cannot forge or rewrite its own referrer.
--
-- Idempotent: safe to run more than once.
-- ============================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS referred_by bigint REFERENCES public.tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_referred_by ON public.tenants(referred_by);
