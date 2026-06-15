-- ============================================================
-- Web push subscriptions (PWA notifications).
--
-- One row per browser/device push subscription. Fans subscribe from the profile
-- tab ("turn on notifications"); the server (band-post route, service role) reads
-- these to send pushes when an artist posts.
--
-- RLS: a fan manages only their own subscriptions. Sending happens server-side
-- with the service-role key, which bypasses RLS — so no god/admin policy is
-- needed here.
--
-- Idempotent: safe to run more than once.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  endpoint   text PRIMARY KEY,
  user_id    uuid   REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id  bigint REFERENCES public.tenants(id)  ON DELETE CASCADE NOT NULL,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_subs_tenant ON public.push_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_user   ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_sub_select ON public.push_subscriptions;
CREATE POLICY push_sub_select ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS push_sub_insert ON public.push_subscriptions;
CREATE POLICY push_sub_insert ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id AND tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS push_sub_update ON public.push_subscriptions;
CREATE POLICY push_sub_update ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_sub_delete ON public.push_subscriptions;
CREATE POLICY push_sub_delete ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);
