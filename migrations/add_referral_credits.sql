-- ============================================================
-- Referral credits (v1): automatic crediting for artist referrals
--
-- Companion to add_referred_by.sql, which only captured attribution
-- (tenants.referred_by) and left crediting "manual for now". This adds a
-- durable per-referral credit ledger, written automatically by the onboarding
-- API when a new tenant signs up with a referral code.
--
-- Credits are denominated in months of free service. While flock is free in
-- beta they simply accrue; when paid plans launch the ledger is applied
-- against the referrer's bill. One row per referred tenant (UNIQUE) makes the
-- write idempotent — a retried onboarding call can never double-credit.
--
-- RLS:
--   * SELECT: admins/band members of the *referrer* tenant can read their own
--     credits (that's all the dashboard needs).
--   * No INSERT/UPDATE/DELETE policies — like tenants.referred_by, credits can
--     only be written via the service-role key (the onboarding API), so a
--     tenant cannot mint credits for itself.
--
-- Idempotent: safe to run more than once.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.referral_credits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  referrer_tenant_id bigint NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  referred_tenant_id bigint NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  months integer NOT NULL DEFAULT 1,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_credits_referrer ON public.referral_credits(referrer_tenant_id);

ALTER TABLE public.referral_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referral_credits_read ON public.referral_credits;
CREATE POLICY referral_credits_read ON public.referral_credits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.tenant_id = referral_credits.referrer_tenant_id
        AND p.role IN ('admin', 'band')
    )
  );
