-- ============================================================
-- security_lockdown.sql  (idempotent; safe to re-run)
-- Closes the RLS / SECURITY DEFINER holes found in the 2026-09 audit:
--   * award_stamps / create_notification / increment_referral_count were
--     callable by anyone (incl. logged-out) -> unlimited stamps, spoofed
--     notifications to any user
--   * any user could insert their own profile as role='admin' in any tenant,
--     or move an existing admin profile into another tenant
--   * fans could pin/highlight posts, fake like counts, self-approve reward
--     claims for tiers they haven't reached, forge stamp history/attendance
--   * like/unlike and post/delete loops farmed stamps and spammed notifications
--   * checkin_show failed on an ambiguous column and never checked the tenant
-- Deploy together with the app change that calls rpc('complete_referral').
-- Wrapped in a transaction: if any statement fails nothing is applied.
-- ============================================================

BEGIN;

-- ── 0. is_god(): pin search_path (identity rule unchanged) ─────────────────
-- The owner account id was verified against auth.users during this audit.
-- Editable email addresses must not grant platform privileges.
CREATE OR REPLACE FUNCTION public.is_god()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT auth.uid() = '5cdcf898-6bda-42b7-860e-0964562c9c22'::uuid;
$$;

-- ── 1. Internal SECURITY DEFINER functions: not callable from the API ───────
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.award_stamps(uuid,text,bigint)',
    'public.award_stamps_rate_limited(uuid,text,bigint,integer)',
    'public.create_notification(uuid,text,text,text,text,bigint)',
    'public.increment_referral_count(uuid,bigint)',
    'public.handle_new_user()',
    'public.assign_member_number()',
    'public.trg_award_post_stamps()',
    'public.trg_award_comment_stamps()',
    'public.trg_award_like_stamps()',
    'public.trg_notify_on_comment()',
    'public.trg_notify_on_like()',
    'public.trg_notify_on_comment_like()'
  ] LOOP
    IF to_regprocedure(f) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f);
    END IF;
  END LOOP;
END $$;

-- Future functions are no longer executable by anon/authenticated by default;
-- grant each RPC explicitly.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- ── 2. Dedupe ledger (no client access) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.action_dedupe (
  user_id uuid NOT NULL,
  action_key text NOT NULL,
  ref_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, action_key, ref_id)
);
ALTER TABLE public.action_dedupe ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.action_dedupe FROM anon, authenticated;

-- Likes: stamps + notification at most once per (user, post) — unlike/re-like
-- no longer farms stamps or re-notifies.
CREATE OR REPLACE FUNCTION public.trg_award_like_stamps()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE post_author_id uuid;
BEGIN
  SELECT author_id INTO post_author_id FROM posts WHERE id = NEW.post_id AND tenant_id = NEW.tenant_id;
  IF post_author_id IS NULL OR post_author_id = NEW.user_id THEN RETURN NEW; END IF;
  INSERT INTO action_dedupe(user_id, action_key, ref_id) VALUES (NEW.user_id, 'stamp:post_liked', NEW.post_id)
    ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN NEW; END IF;
  PERFORM award_stamps_rate_limited(NEW.user_id, 'post_liked', NEW.tenant_id, 10);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.trg_notify_on_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE post_author_id uuid; liker_name text;
BEGIN
  SELECT author_id INTO post_author_id FROM posts WHERE id = NEW.post_id;
  IF post_author_id IS NULL OR post_author_id = NEW.user_id THEN RETURN NEW; END IF;
  INSERT INTO action_dedupe(user_id, action_key, ref_id) VALUES (NEW.user_id, 'notify:like', NEW.post_id)
    ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT display_name INTO liker_name FROM profiles WHERE id = NEW.user_id;
  liker_name := COALESCE(NULLIF(liker_name, ''), 'someone');
  PERFORM create_notification(post_author_id, 'like', liker_name || ' liked your post',
                              NULL, '/?post=' || NEW.post_id, NEW.tenant_id);
  RETURN NEW;
END $$;

DO $$
BEGIN
  IF to_regclass('public.comment_likes') IS NOT NULL THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.trg_notify_on_comment_like()
      RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $body$
      DECLARE comment_author_id uuid; comment_post_id uuid; liker_name text;
      BEGIN
        SELECT author_id, post_id INTO comment_author_id, comment_post_id FROM comments WHERE id = NEW.comment_id;
        IF comment_author_id IS NULL OR comment_author_id = NEW.user_id THEN RETURN NEW; END IF;
        INSERT INTO action_dedupe(user_id, action_key, ref_id) VALUES (NEW.user_id, 'notify:comment_like', NEW.comment_id)
          ON CONFLICT DO NOTHING;
        IF NOT FOUND THEN RETURN NEW; END IF;
        SELECT display_name INTO liker_name FROM profiles WHERE id = NEW.user_id;
        liker_name := COALESCE(NULLIF(liker_name, ''), 'someone');
        PERFORM create_notification(comment_author_id, 'comment_like', liker_name || ' liked your comment',
                                    NULL, '/?post=' || comment_post_id, NEW.tenant_id);
        RETURN NEW;
      END $body$;
    $f$;
    REVOKE EXECUTE ON FUNCTION public.trg_notify_on_comment_like() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- Posts: insert+delete no longer farms stamps without limit (2-minute cooldown).
CREATE OR REPLACE FUNCTION public.trg_award_post_stamps()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM award_stamps_rate_limited(NEW.author_id, 'post_created', NEW.tenant_id, 120);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.trg_award_like_stamps(), public.trg_notify_on_like(), public.trg_award_post_stamps()
  FROM PUBLIC, anon, authenticated;

-- ── 3. User-facing RPCs: derive tenant from the caller, never trust params ──
CREATE OR REPLACE FUNCTION public.checkin_show(p_show_id uuid, p_code text, p_tenant_id bigint DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_show record;
BEGIN
  IF v_uid IS NULL THEN RETURN 'not authenticated'; END IF;
  SELECT * INTO v_show FROM shows WHERE id = p_show_id;
  IF v_show.id IS NULL THEN RETURN 'show not found'; END IF;
  IF v_show.tenant_id IS DISTINCT FROM public.current_tenant_id() THEN RETURN 'show not found'; END IF;
  IF v_show.checkin_code IS NULL OR lower(v_show.checkin_code) <> lower(coalesce(p_code, '')) THEN RETURN 'wrong code'; END IF;
  IF EXISTS (SELECT 1 FROM show_attendance sa WHERE sa.show_id = p_show_id AND sa.user_id = v_uid) THEN
    RETURN 'already checked in';
  END IF;
  INSERT INTO show_attendance (show_id, user_id, tenant_id) VALUES (p_show_id, v_uid, v_show.tenant_id);
  UPDATE profiles SET show_count = coalesce(show_count, 0) + 1 WHERE id = v_uid;
  PERFORM award_stamps(v_uid, 'show_attended', v_show.tenant_id);
  RETURN 'success';
END $$;
REVOKE EXECUTE ON FUNCTION public.checkin_show(uuid, text, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkin_show(uuid, text, bigint) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.daily_checkin(p_tenant_id bigint DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  uid uuid := auth.uid();
  tid bigint;
  last_date date;
  cur_streak integer;
  new_streak integer;
BEGIN
  IF uid IS NULL THEN RETURN 0; END IF;
  SELECT tenant_id, last_active_date, login_streak INTO tid, last_date, cur_streak
    FROM profiles WHERE id = uid FOR UPDATE;
  IF tid IS NULL OR (p_tenant_id IS NOT NULL AND p_tenant_id <> tid) THEN RETURN 0; END IF;
  IF last_date = current_date THEN RETURN COALESCE(cur_streak, 0); END IF;
  new_streak := CASE WHEN last_date = current_date - 1 THEN COALESCE(cur_streak, 0) + 1 ELSE 1 END;
  UPDATE profiles SET login_streak = new_streak, last_active_date = current_date WHERE id = uid;
  PERFORM award_stamps(uid, 'daily_login', tid);
  RETURN new_streak;
END $$;
REVOKE EXECUTE ON FUNCTION public.daily_checkin(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.daily_checkin(bigint) TO authenticated, service_role;

-- Referral: replaces client rpc('award_stamps') + rpc('increment_referral_count').
-- Only the newly signed-up caller can credit a referrer, once, within 1 hour of joining.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.complete_referral(p_referral_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_me record;
  v_ref uuid;
BEGIN
  SELECT id, tenant_id, referred_by, created_at INTO v_me FROM profiles WHERE id = auth.uid() FOR UPDATE;
  IF v_me.id IS NULL OR v_me.referred_by IS NOT NULL OR v_me.created_at < now() - interval '1 hour' THEN
    RETURN false;
  END IF;
  SELECT id INTO v_ref FROM profiles
   WHERE tenant_id = v_me.tenant_id AND referral_code = p_referral_code AND id <> v_me.id;
  IF v_ref IS NULL THEN RETURN false; END IF;
  UPDATE profiles SET referred_by = v_ref WHERE id = v_me.id;
  UPDATE profiles SET referral_count = coalesce(referral_count, 0) + 1 WHERE id = v_ref;
  PERFORM award_stamps(v_ref, 'referral_completed', v_me.tenant_id);
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.complete_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_referral(text) TO authenticated, service_role;

-- ── 4. Profiles: guard INSERT and UPDATE ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_profile_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_god() THEN RETURN NEW; END IF;
  NEW.role             := 'fan';
  NEW.stamp_count      := 0;
  NEW.stamp_level      := 'first_press';
  NEW.show_count       := 0;
  NEW.referral_count   := 0;
  NEW.referral_code    := substring(md5(random()::text), 1, 8);
  NEW.referred_by      := NULL;
  NEW.band_member      := NULL;
  NEW.login_streak     := 0;
  NEW.last_active_date := NULL;
  NEW.signup_ip := NULL; NEW.signup_country := NULL; NEW.signup_city := NULL;
  NEW.signup_lat := NULL; NEW.signup_lng := NULL;
  NEW.joined_at := now(); NEW.created_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_profile_insert ON public.profiles;
CREATE TRIGGER guard_profile_insert BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_insert();

CREATE OR REPLACE FUNCTION public.guard_profile_protected_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_god() THEN RETURN NEW; END IF;

  -- Nobody but god/service may move a profile between tenants or rewrite identity.
  NEW.id             := OLD.id;
  NEW.tenant_id      := OLD.tenant_id;
  NEW.referral_count := OLD.referral_count;
  NEW.referral_code  := OLD.referral_code;
  NEW.referred_by    := OLD.referred_by;
  NEW.member_number  := OLD.member_number;
  NEW.signup_ip := OLD.signup_ip; NEW.signup_country := OLD.signup_country; NEW.signup_city := OLD.signup_city;
  NEW.signup_lat := OLD.signup_lat; NEW.signup_lng := OLD.signup_lng;
  NEW.joined_at := OLD.joined_at; NEW.created_at := OLD.created_at;

  -- Tenant admins may adjust stamps / roles / band_member of rows in their tenant.
  IF public.is_tenant_admin(OLD.tenant_id) THEN RETURN NEW; END IF;

  NEW.stamp_count      := OLD.stamp_count;
  NEW.stamp_level      := OLD.stamp_level;
  NEW.role             := OLD.role;
  NEW.show_count       := OLD.show_count;
  NEW.band_member      := OLD.band_member;
  NEW.login_streak     := OLD.login_streak;
  NEW.last_active_date := OLD.last_active_date;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_profile_protected_columns ON public.profiles;
CREATE TRIGGER guard_profile_protected_columns BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_protected_columns();

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE
  USING (public.is_god() OR public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_god() OR public.is_tenant_admin(tenant_id));

-- Signup geo/IP + referral_code exposure: see section 10 (needs client change).

-- ── 5. Posts ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "posts_insert" ON public.posts;
CREATE POLICY "posts_insert" ON public.posts FOR INSERT WITH CHECK (
  auth.uid() = author_id
  AND tenant_id = public.current_tenant_id()
  AND coalesce(like_count, 0) = 0 AND coalesce(comment_count, 0) = 0
  AND (
    public.is_tenant_admin(tenant_id)
    OR (feed_type = 'community' AND NOT coalesce(is_pinned, false)
        AND NOT coalesce(is_highlight, false) AND NOT coalesce(is_exclusive, false))
  )
);

DROP POLICY IF EXISTS "posts_update_own" ON public.posts;
CREATE POLICY "posts_update_own" ON public.posts FOR UPDATE
  USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
-- Fixes admin pin/highlight of other users' posts (currently a silent no-op).
DROP POLICY IF EXISTS "posts_update_admin" ON public.posts;
CREATE POLICY "posts_update_admin" ON public.posts FOR UPDATE
  USING (public.is_tenant_admin(tenant_id)) WITH CHECK (public.is_tenant_admin(tenant_id));

CREATE OR REPLACE FUNCTION public.guard_post_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_god() THEN RETURN NEW; END IF;
  NEW.id := OLD.id; NEW.tenant_id := OLD.tenant_id; NEW.author_id := OLD.author_id;
  NEW.like_count := OLD.like_count; NEW.comment_count := OLD.comment_count; NEW.created_at := OLD.created_at;
  IF public.is_tenant_admin(OLD.tenant_id) THEN RETURN NEW; END IF;
  NEW.feed_type := OLD.feed_type; NEW.is_pinned := OLD.is_pinned;
  NEW.is_highlight := OLD.is_highlight; NEW.is_exclusive := OLD.is_exclusive;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_post_columns ON public.posts;
CREATE TRIGGER guard_post_columns BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.guard_post_columns();

-- Like/comment counters update posts on behalf of the liker/commenter. They
-- were SECURITY INVOKER, so the column guard above would revert their writes
-- (and RLS only lets authors update their own posts). Run them as owner.
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.update_post_like_count()', 'public.update_post_comment_count()'] LOOP
    IF to_regprocedure(f) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER', f);
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    END IF;
  END LOOP;
END $$;

-- ── 6. Child rows must belong to the parent's tenant ────────────────────────
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
CREATE POLICY "comments_insert" ON public.comments FOR INSERT WITH CHECK (
  auth.uid() = author_id AND tenant_id = public.current_tenant_id()
  AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.tenant_id = comments.tenant_id)
);
DROP POLICY IF EXISTS "likes_insert" ON public.post_likes;
CREATE POLICY "likes_insert" ON public.post_likes FOR INSERT WITH CHECK (
  auth.uid() = user_id AND tenant_id = public.current_tenant_id()
  AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.tenant_id = post_likes.tenant_id)
);
DROP POLICY IF EXISTS "poll_votes_insert" ON public.poll_votes;
CREATE POLICY "poll_votes_insert" ON public.poll_votes FOR INSERT WITH CHECK (
  auth.uid() = user_id AND tenant_id = public.current_tenant_id()
  AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.tenant_id = poll_votes.tenant_id)
);
DO $$
BEGIN
  IF to_regclass('public.comment_likes') IS NOT NULL THEN
    DROP POLICY IF EXISTS comment_likes_insert ON public.comment_likes;
    CREATE POLICY comment_likes_insert ON public.comment_likes FOR INSERT WITH CHECK (
      auth.uid() = user_id AND tenant_id = public.current_tenant_id()
      AND EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_id AND c.tenant_id = comment_likes.tenant_id)
    );
  END IF;
END $$;

-- ── 7. Server-written tables: no direct client inserts ──────────────────────
DROP POLICY IF EXISTS "stamp_tx_insert" ON public.stamp_transactions;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "attendance_insert" ON public.show_attendance;   -- checkin_show() is the only path

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_sub_update ON public.push_subscriptions;
CREATE POLICY push_sub_update ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND tenant_id = public.current_tenant_id());

-- ── 8. Reward claims: only 'pending', only for a tier the fan has reached ───
CREATE OR REPLACE FUNCTION public.can_claim_tier(p_tenant_id bigint, p_level_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH me AS (SELECT stamp_count FROM profiles WHERE id = auth.uid() AND tenant_id = p_tenant_id),
  req AS (
    SELECT coalesce(
      (SELECT stamps FROM reward_tiers WHERE tenant_id = p_tenant_id AND key = p_level_key AND is_active),
      CASE WHEN NOT EXISTS (SELECT 1 FROM reward_tiers WHERE tenant_id = p_tenant_id)
           THEN CASE p_level_key  -- built-in default levels (FlockApp.js:60-65)
                  WHEN 'first_press' THEN 0 WHEN 'b_side' THEN 50 WHEN 'deep_cut' THEN 150
                  WHEN 'inner_sleeve' THEN 300 WHEN 'stamped' THEN 500 WHEN 'inner_circle' THEN 1000 END
      END) AS stamps)
  SELECT coalesce((SELECT me.stamp_count >= req.stamps FROM me, req), false);
$$;
REVOKE EXECUTE ON FUNCTION public.can_claim_tier(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_claim_tier(bigint, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "reward_claims_insert" ON public.reward_claims;
CREATE POLICY "reward_claims_insert" ON public.reward_claims FOR INSERT WITH CHECK (
  auth.uid() = user_id AND tenant_id = public.current_tenant_id()
  AND coalesce(status, 'pending') = 'pending'
  AND public.can_claim_tier(tenant_id, level_key)
);
DROP POLICY IF EXISTS "reward_claims_update" ON public.reward_claims;
CREATE POLICY "reward_claims_update" ON public.reward_claims FOR UPDATE
  USING (auth.uid() = user_id OR public.is_god() OR public.is_tenant_admin(tenant_id))
  WITH CHECK (auth.uid() = user_id OR public.is_god() OR public.is_tenant_admin(tenant_id));

CREATE OR REPLACE FUNCTION public.guard_reward_claim_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_god() THEN RETURN NEW; END IF;
  NEW.user_id := OLD.user_id; NEW.tenant_id := OLD.tenant_id;
  NEW.level_key := OLD.level_key; NEW.created_at := OLD.created_at;
  IF public.is_tenant_admin(OLD.tenant_id) THEN RETURN NEW; END IF;
  NEW.status := OLD.status; NEW.reward_type := OLD.reward_type;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_reward_claim_columns ON public.reward_claims;
CREATE TRIGGER guard_reward_claim_columns BEFORE UPDATE ON public.reward_claims
FOR EACH ROW EXECUTE FUNCTION public.guard_reward_claim_columns();

-- ── 9. Tables that must have RLS regardless of which file built the DB ──────
ALTER TABLE public.flock_accounts ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF to_regclass('public.external_links') IS NOT NULL THEN
    ALTER TABLE public.external_links ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS external_links_read ON public.external_links;
    CREATE POLICY external_links_read ON public.external_links FOR SELECT USING (true);
    DROP POLICY IF EXISTS external_links_write_admin ON public.external_links;
    CREATE POLICY external_links_write_admin ON public.external_links FOR ALL
      USING (public.is_god() OR public.is_tenant_admin(tenant_id))
      WITH CHECK (public.is_god() OR public.is_tenant_admin(tenant_id));
  END IF;
END $$;

-- ── 10. Private columns: deploy the explicit projections and API routes first ──
-- Public check-in availability is separate from the secret code itself.
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS has_checkin boolean
  GENERATED ALWAYS AS (checkin_code IS NOT NULL) STORED;
REVOKE SELECT ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, tenant_id, display_name, avatar_url, bio, city, stamp_count, stamp_level,
  role, band_member, show_count, referral_count, email_notifications, joined_at, created_at,
  login_streak, last_active_date, member_number) ON public.profiles TO anon, authenticated;
REVOKE SELECT ON public.shows FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, tenant_id, date, city, venue, country, region, ticket_url, status, sort_order,
  created_at, has_checkin) ON public.shows TO anon, authenticated;

-- ── 11. Media: tenant paths and ownership, including legacy artist assets ────
DROP POLICY IF EXISTS "authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "authenticated users can update media" ON storage.objects;
DROP POLICY IF EXISTS media_insert_scoped ON storage.objects;
CREATE POLICY media_insert_scoped ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND (
  public.is_god() OR (
    (storage.foldername(name))[2] = public.current_tenant_id()::text
    AND (
      public.is_tenant_admin(public.current_tenant_id())
      OR ((storage.foldername(name))[1] IN ('avatars','posts','audio','video')
          AND (storage.filename(name) LIKE auth.uid()::text || '-%'
               OR storage.filename(name) LIKE auth.uid()::text || '.%'))
    )
  )
));
DROP POLICY IF EXISTS media_update_scoped ON storage.objects;
CREATE POLICY media_update_scoped ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND (
  public.is_god() OR (
    (storage.foldername(name))[2] = public.current_tenant_id()::text
    AND (owner_id = auth.uid()::text OR public.is_tenant_admin(public.current_tenant_id()))
  )
))
WITH CHECK (bucket_id = 'media' AND (
  public.is_god() OR (
    (storage.foldername(name))[2] = public.current_tenant_id()::text
    AND (owner_id = auth.uid()::text OR public.is_tenant_admin(public.current_tenant_id()))
  )
));

-- ── 12. Exclusive posts are protected by RLS, including their child rows ────
DROP POLICY IF EXISTS posts_read ON public.posts;
CREATE POLICY posts_read ON public.posts FOR SELECT USING (
  NOT coalesce(is_exclusive, false) OR tenant_id = public.current_tenant_id() OR public.is_god()
);
DROP POLICY IF EXISTS comments_read ON public.comments;
CREATE POLICY comments_read ON public.comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = comments.post_id AND p.tenant_id = comments.tenant_id)
);
DROP POLICY IF EXISTS likes_read ON public.post_likes;
CREATE POLICY likes_read ON public.post_likes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_likes.post_id AND p.tenant_id = post_likes.tenant_id)
);
DROP POLICY IF EXISTS poll_votes_read ON public.poll_votes;
CREATE POLICY poll_votes_read ON public.poll_votes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = poll_votes.post_id AND p.tenant_id = poll_votes.tenant_id)
);
DO $$ BEGIN
 IF to_regclass('public.comment_likes') IS NOT NULL THEN
  DROP POLICY IF EXISTS comment_likes_read ON public.comment_likes;
  CREATE POLICY comment_likes_read ON public.comment_likes FOR SELECT USING (
   EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_likes.comment_id AND c.tenant_id = comment_likes.tenant_id)
  );
 END IF;
END $$;

COMMIT;
