-- ============================================================
-- Billing (v1): Stripe founder-rate subscriptions ($1/month)
--
-- Adds billing state to tenants, written ONLY by the service role (the
-- checkout + webhook API routes). tenants has no anon/authenticated write
-- policies and RLS is enabled, so these columns inherit that protection.
-- Stripe customer/subscription ids are public-readable via tenants_read like
-- the rest of the row; they are opaque references, useless without the key.
--
--   plan:            'founder_beta' (default; free while beta) | 'founder'
--                    (paying $1/mo, rate locked for life)
--   billing_status:  'none' | Stripe subscription status mirror
--                    ('trialing','active','past_due','canceled',...)
--
-- Also adds referral_credits.applied_at: set when a banked free month is
-- consumed as trial days at checkout, so credits are applied exactly once.
--
-- Idempotent: safe to run more than once.
-- ============================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'founder_beta',
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS billing_period_end timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_stripe_customer
  ON public.tenants(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

ALTER TABLE public.referral_credits
  ADD COLUMN IF NOT EXISTS applied_at timestamptz;
