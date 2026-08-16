-- ============================================================
-- Email broadcasts (v1): artist-composed emails to their fanbase
--
-- Grace's ask: replace the mailing list — send fully custom emails (pre-save
-- announcements, release news) to all opted-in fans, not just the automated
-- digest. This table is the send history; the actual sending happens in
-- /api/email/broadcast via Resend.
--
-- RLS: tenant admins/band read their own history; writes are service-role
-- only (the API route records each send).
--
-- Idempotent: safe to run more than once.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_broadcasts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id bigint NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text NOT NULL,
  cta_text text,
  cta_url text,
  sent_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_broadcasts_tenant ON public.email_broadcasts(tenant_id, created_at DESC);

ALTER TABLE public.email_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_broadcasts_read_admin ON public.email_broadcasts;
CREATE POLICY email_broadcasts_read_admin ON public.email_broadcasts
  FOR SELECT USING (public.is_tenant_admin(tenant_id) OR public.is_god());
