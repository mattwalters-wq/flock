-- ============================================================
-- RLS hardening: enable row level security on the 7 exposed tables
--
-- tenants, profiles, tenant_config, stamp_actions, reward_tiers,
-- tenant_members and flock_accounts had RLS DISABLED in production — with the
-- public anon key, anyone could write every row (e.g. forge stamp_count or
-- rewrite another community's config). The policies for reads, own-profile
-- writes, admin profile updates and god mode already existed; what was missing
-- (and presumably why RLS was off) were write policies for the tables the
-- dashboard edits directly from the browser.
--
-- This migration:
--   1. Adds admin write policies (is_tenant_admin) for tenant_config,
--      tenant_members, stamp_actions and reward_tiers — matching exactly the
--      writes the dashboard makes.
--   2. Replaces the fan-signup referral_count bump (an UPDATE on the
--      *referrer's* profile, which no sane policy can allow) with a
--      SECURITY DEFINER function, increment_referral_count.
--   3. Drops two over-permissive policies: tenants_insert_service and
--      flock_accounts_insert both had WITH CHECK (true) on the public role,
--      letting anyone insert. The service role bypasses RLS, so it never
--      needed them. Also drops tenants_public_read (duplicate of tenants_read).
--   4. Enables RLS on all seven tables.
--
-- Deliberately NOT granted to anon/authenticated: any write to tenants or
-- flock_accounts (service-role only), and any non-admin write to config/
-- actions/tiers/members.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- 1. Admin write policies for dashboard-edited tables
DROP POLICY IF EXISTS tenant_config_write_admin ON public.tenant_config;
CREATE POLICY tenant_config_write_admin ON public.tenant_config
  FOR ALL USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));

DROP POLICY IF EXISTS tenant_members_write_admin ON public.tenant_members;
CREATE POLICY tenant_members_write_admin ON public.tenant_members
  FOR ALL USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));

DROP POLICY IF EXISTS stamp_actions_write_admin ON public.stamp_actions;
CREATE POLICY stamp_actions_write_admin ON public.stamp_actions
  FOR ALL USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));

DROP POLICY IF EXISTS reward_tiers_write_admin ON public.reward_tiers;
CREATE POLICY reward_tiers_write_admin ON public.reward_tiers
  FOR ALL USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));

-- 2. Referral bump as SECURITY DEFINER (replaces the client-side UPDATE of the
--    referrer's row in PublicPage). Atomic, and only callable by signed-in users.
CREATE OR REPLACE FUNCTION public.increment_referral_count(p_referrer uuid, p_tenant_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET referral_count = coalesce(referral_count, 0) + 1
   WHERE id = p_referrer AND tenant_id = p_tenant_id;
$$;
REVOKE EXECUTE ON FUNCTION public.increment_referral_count(uuid, bigint) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.increment_referral_count(uuid, bigint) TO authenticated, service_role;

-- 3. Drop over-permissive / duplicate policies
DROP POLICY IF EXISTS tenants_insert_service ON public.tenants;
DROP POLICY IF EXISTS flock_accounts_insert ON public.flock_accounts;
DROP POLICY IF EXISTS tenants_public_read ON public.tenants;

-- 4. Enable RLS
ALTER TABLE public.tenants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamp_actions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_tiers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flock_accounts ENABLE ROW LEVEL SECURITY;
