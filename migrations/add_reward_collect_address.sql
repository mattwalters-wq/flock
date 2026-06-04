-- ============================================================
-- REWARD TIERS: per-tier "collect shipping address" flag
--
-- The claim form previously decided whether to ask for a postal address with
-- a hardcoded reward_type check (['tshirt','vinyl']). Artists use custom reward
-- types (e.g. "love letter"), so the address fields never appeared for them and
-- fans had no way to enter where to post the reward.
--
-- This adds an explicit per-tier flag the artist controls from the dashboard.
-- Idempotent.
-- ============================================================

ALTER TABLE public.reward_tiers
  ADD COLUMN IF NOT EXISTS collect_address boolean NOT NULL DEFAULT false;

-- Backfill: turn it on for the built-in physical reward types so existing
-- postal rewards keep collecting addresses without the artist re-touching them.
UPDATE public.reward_tiers
  SET collect_address = true
  WHERE reward_type IN ('tshirt', 'vinyl', 'postcard')
    AND collect_address = false;
