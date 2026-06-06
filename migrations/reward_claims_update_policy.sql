-- ============================================================
-- REWARD CLAIMS: let a fan add/edit their own shipping address
--
-- There was no UPDATE policy on reward_claims, so a fan saving a shipping
-- address (e.g. via the "add shipping address" button) was silently blocked by
-- RLS — 0 rows changed, no error — and the address never persisted.
--
-- This adds an UPDATE policy for the owning user (plus tenant admins / super
-- admin), and a guard trigger so a fan can only change the shipping_* fields —
-- never the fulfilment status or identity columns. Mirrors the profiles guard.
--
-- Self-contained: (re)creates the is_tenant_admin helper so it works even if
-- harden_rls_security.sql hasn't been applied to this database yet. Idempotent.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND tenant_id = p_tenant_id AND role IN ('band', 'admin')
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin(bigint) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "reward_claims_update" ON public.reward_claims;
CREATE POLICY "reward_claims_update" ON public.reward_claims
FOR UPDATE
USING (
  auth.uid() = user_id
  OR auth.uid() = '5cdcf898-6bda-42b7-860e-0964562c9c22'::uuid
  OR public.is_tenant_admin(tenant_id)
);

-- Keep fans from changing fulfilment status or identity columns on their claim;
-- they may only fill in shipping details. Admins / service / definer pass through.
CREATE OR REPLACE FUNCTION public.guard_reward_claim_columns()
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
  -- Ordinary fan: preserve fulfilment + identity, allow only shipping_* edits.
  NEW.status      := OLD.status;
  NEW.user_id     := OLD.user_id;
  NEW.tenant_id   := OLD.tenant_id;
  NEW.level_key   := OLD.level_key;
  NEW.reward_type := OLD.reward_type;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_reward_claim_columns ON public.reward_claims;
CREATE TRIGGER guard_reward_claim_columns
BEFORE UPDATE ON public.reward_claims
FOR EACH ROW EXECUTE FUNCTION public.guard_reward_claim_columns();
