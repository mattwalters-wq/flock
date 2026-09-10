-- ============================================================
-- Grant table privileges on tables created without them
--
-- email_broadcasts, push_subscriptions and comment_likes were created with
-- privileges for the `postgres` role only — no grants to anon, authenticated
-- or service_role. Postgres checks table privileges BEFORE row-level
-- security, so every read/write from the app failed with "permission denied"
-- regardless of RLS policy:
--
--   * /api/email/broadcast (service role) could send the emails but never
--     record the send, so the dashboard history stayed empty and an artist
--     could not tell whether their email went out. (supabase-js returns the
--     error instead of throwing, so the best-effort insert swallowed it.)
--   * comment likes and push subscriptions never persisted.
--
-- This grants the same privileges every other app table has (RLS still
-- gates rows for anon/authenticated) and sets default privileges so future
-- tables created by postgres get them automatically.
--
-- Idempotent: safe to run more than once.
-- ============================================================

GRANT ALL ON TABLE public.email_broadcasts   TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.push_subscriptions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.comment_likes      TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
