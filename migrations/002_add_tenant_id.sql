-- =============================================================
-- Flock migration 002: add tenant_id to all community tables
-- =============================================================
-- SAFE TO RUN: adds DEFAULT 1, backfills, then drops the DEFAULT
-- so all existing Stamps data stays intact and future inserts
-- MUST supply tenant_id explicitly.
-- DO NOT RUN until reviewed by Matt.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. Helper: set_tenant(slug) — call at start of every request
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_tenant(p_slug text)
  RETURNS void
  LANGUAGE sql
  SECURITY DEFINER
AS $$
  SELECT set_config('app.tenant_slug', p_slug, true);
$$;

-- Convenience shorthand used in RLS policies
CREATE OR REPLACE FUNCTION public.current_tenant_id()
  RETURNS bigint
  LANGUAGE sql
  STABLE SECURITY DEFINER
AS $$
  SELECT id FROM tenants WHERE slug = current_setting('app.tenant_slug', true);
$$;

-- ─────────────────────────────────────────────────────────────
-- 1. Add tenant_id column (DEFAULT 1 = The Stamps)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE profiles          ADD COLUMN IF NOT EXISTS tenant_id bigint NOT NULL REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE posts             ADD COLUMN IF NOT EXISTS tenant_id bigint NOT NULL REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE comments          ADD COLUMN IF NOT EXISTS tenant_id bigint NOT NULL REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE post_likes        ADD COLUMN IF NOT EXISTS tenant_id bigint NOT NULL REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE shows             ADD COLUMN IF NOT EXISTS tenant_id bigint NOT NULL REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE show_attendance   ADD COLUMN IF NOT EXISTS tenant_id bigint NOT NULL REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE stamp_actions     ADD COLUMN IF NOT EXISTS tenant_id bigint NOT NULL REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE stamp_transactions ADD COLUMN IF NOT EXISTS tenant_id bigint NOT NULL REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE reward_tiers      ADD COLUMN IF NOT EXISTS tenant_id bigint NOT NULL REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE reward_claims     ADD COLUMN IF NOT EXISTS tenant_id bigint NOT NULL REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE notifications     ADD COLUMN IF NOT EXISTS tenant_id bigint NOT NULL REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE links             ADD COLUMN IF NOT EXISTS tenant_id bigint NOT NULL REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE site_settings     ADD COLUMN IF NOT EXISTS tenant_id bigint NOT NULL REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE email_subscribers ADD COLUMN IF NOT EXISTS tenant_id bigint NOT NULL REFERENCES tenants(id) DEFAULT 1;
ALTER TABLE email_log         ADD COLUMN IF NOT EXISTS tenant_id bigint NOT NULL REFERENCES tenants(id) DEFAULT 1;

-- ─────────────────────────────────────────────────────────────
-- 2. Backfill existing rows → tenant_id = 1 (The Stamps)
-- ─────────────────────────────────────────────────────────────
UPDATE profiles           SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE posts              SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE comments           SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE post_likes         SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE shows              SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE show_attendance    SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE stamp_actions      SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE stamp_transactions SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE reward_tiers       SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE reward_claims      SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE notifications      SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE links              SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE site_settings      SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE email_subscribers  SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE email_log          SET tenant_id = 1 WHERE tenant_id IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 3. Drop DEFAULT so future inserts must supply tenant_id
-- ─────────────────────────────────────────────────────────────
ALTER TABLE profiles          ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE posts             ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE comments          ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE post_likes        ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE shows             ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE show_attendance   ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE stamp_actions     ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE stamp_transactions ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE reward_tiers      ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE reward_claims     ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE notifications     ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE links             ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE site_settings     ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE email_subscribers ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE email_log         ALTER COLUMN tenant_id DROP DEFAULT;

-- ─────────────────────────────────────────────────────────────
-- 4. Indexes on tenant_id
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS profiles_tenant_id_idx           ON profiles           (tenant_id);
CREATE INDEX IF NOT EXISTS posts_tenant_id_idx              ON posts              (tenant_id);
CREATE INDEX IF NOT EXISTS comments_tenant_id_idx           ON comments           (tenant_id);
CREATE INDEX IF NOT EXISTS post_likes_tenant_id_idx         ON post_likes         (tenant_id);
CREATE INDEX IF NOT EXISTS shows_tenant_id_idx              ON shows              (tenant_id);
CREATE INDEX IF NOT EXISTS show_attendance_tenant_id_idx    ON show_attendance    (tenant_id);
CREATE INDEX IF NOT EXISTS stamp_actions_tenant_id_idx      ON stamp_actions      (tenant_id);
CREATE INDEX IF NOT EXISTS stamp_transactions_tenant_id_idx ON stamp_transactions (tenant_id);
CREATE INDEX IF NOT EXISTS reward_tiers_tenant_id_idx       ON reward_tiers       (tenant_id);
CREATE INDEX IF NOT EXISTS reward_claims_tenant_id_idx      ON reward_claims      (tenant_id);
CREATE INDEX IF NOT EXISTS notifications_tenant_id_idx      ON notifications      (tenant_id);
CREATE INDEX IF NOT EXISTS links_tenant_id_idx              ON links              (tenant_id);
CREATE INDEX IF NOT EXISTS site_settings_tenant_id_idx      ON site_settings      (tenant_id);
CREATE INDEX IF NOT EXISTS email_subscribers_tenant_id_idx  ON email_subscribers  (tenant_id);
CREATE INDEX IF NOT EXISTS email_log_tenant_id_idx          ON email_log          (tenant_id);

-- ─────────────────────────────────────────────────────────────
-- 5. Update RLS policies to scope by tenant_id
-- Each policy is dropped and recreated with the tenant condition.
-- The tenant condition is: tenant_id = current_tenant_id()
-- ─────────────────────────────────────────────────────────────

-- ── profiles ──────────────────────────────────────────────────
DROP POLICY IF EXISTS profiles_read   ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;

CREATE POLICY profiles_read ON profiles
  FOR SELECT TO public
  USING (tenant_id = current_tenant_id());

CREATE POLICY profiles_update ON profiles
  FOR UPDATE TO authenticated
  USING (
    tenant_id = current_tenant_id()
    AND (
      auth.uid() = id
      OR EXISTS (
        SELECT 1 FROM profiles p2
        WHERE p2.id = auth.uid()
          AND p2.role = 'admin'
          AND p2.tenant_id = current_tenant_id()
      )
    )
  );

-- ── posts ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS posts_read       ON posts;
DROP POLICY IF EXISTS posts_create     ON posts;
DROP POLICY IF EXISTS posts_update_own ON posts;
DROP POLICY IF EXISTS posts_delete     ON posts;

CREATE POLICY posts_read ON posts
  FOR SELECT TO public
  USING (tenant_id = current_tenant_id());

CREATE POLICY posts_create ON posts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY posts_update_own ON posts
  FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND auth.uid() = author_id);

CREATE POLICY posts_delete ON posts
  FOR DELETE TO authenticated
  USING (
    tenant_id = current_tenant_id()
    AND (
      auth.uid() = author_id
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = ANY (ARRAY['band','admin'])
          AND profiles.tenant_id = current_tenant_id()
      )
    )
  );

-- ── comments ──────────────────────────────────────────────────
DROP POLICY IF EXISTS comments_read   ON comments;
DROP POLICY IF EXISTS comments_create ON comments;
DROP POLICY IF EXISTS comments_update ON comments;
DROP POLICY IF EXISTS comments_delete ON comments;

CREATE POLICY comments_read ON comments
  FOR SELECT TO public
  USING (tenant_id = current_tenant_id());

CREATE POLICY comments_create ON comments
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY comments_update ON comments
  FOR UPDATE TO public
  USING  (tenant_id = current_tenant_id() AND auth.uid() = author_id)
  WITH CHECK (tenant_id = current_tenant_id() AND auth.uid() = author_id);

CREATE POLICY comments_delete ON comments
  FOR DELETE TO authenticated
  USING (
    tenant_id = current_tenant_id()
    AND (
      auth.uid() = author_id
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = ANY (ARRAY['band','admin'])
          AND profiles.tenant_id = current_tenant_id()
      )
    )
  );

-- ── post_likes ────────────────────────────────────────────────
DROP POLICY IF EXISTS likes_read   ON post_likes;
DROP POLICY IF EXISTS likes_create ON post_likes;
DROP POLICY IF EXISTS likes_delete ON post_likes;

CREATE POLICY likes_read ON post_likes
  FOR SELECT TO public
  USING (tenant_id = current_tenant_id());

CREATE POLICY likes_create ON post_likes
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY likes_delete ON post_likes
  FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id());

-- ── shows ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS shows_read   ON shows;
DROP POLICY IF EXISTS shows_manage ON shows;

CREATE POLICY shows_read ON shows
  FOR SELECT TO public
  USING (tenant_id = current_tenant_id());

CREATE POLICY shows_manage ON shows
  FOR ALL TO public
  USING (
    tenant_id = current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['band','admin'])
        AND profiles.tenant_id = current_tenant_id()
    )
  );

-- ── show_attendance ───────────────────────────────────────────
DROP POLICY IF EXISTS attendance_read   ON show_attendance;
DROP POLICY IF EXISTS attendance_manage ON show_attendance;

CREATE POLICY attendance_read ON show_attendance
  FOR SELECT TO public
  USING (tenant_id = current_tenant_id());

CREATE POLICY attendance_manage ON show_attendance
  FOR ALL TO public
  USING (
    tenant_id = current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['band','admin'])
        AND profiles.tenant_id = current_tenant_id()
    )
  );

-- ── stamp_actions ─────────────────────────────────────────────
DROP POLICY IF EXISTS stamp_actions_read   ON stamp_actions;
DROP POLICY IF EXISTS stamp_actions_manage ON stamp_actions;

CREATE POLICY stamp_actions_read ON stamp_actions
  FOR SELECT TO public
  USING (tenant_id = current_tenant_id());

CREATE POLICY stamp_actions_manage ON stamp_actions
  FOR ALL TO public
  USING (
    tenant_id = current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['band','admin'])
        AND profiles.tenant_id = current_tenant_id()
    )
  );

-- ── stamp_transactions ────────────────────────────────────────
DROP POLICY IF EXISTS stamp_tx_read_own ON stamp_transactions;
DROP POLICY IF EXISTS stamp_tx_create   ON stamp_transactions;

CREATE POLICY stamp_tx_read_own ON stamp_transactions
  FOR SELECT TO public
  USING (
    tenant_id = current_tenant_id()
    AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = ANY (ARRAY['band','admin'])
          AND profiles.tenant_id = current_tenant_id()
      )
    )
  );

CREATE POLICY stamp_tx_create ON stamp_transactions
  FOR INSERT TO public
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = ANY (ARRAY['band','admin'])
          AND profiles.tenant_id = current_tenant_id()
      )
    )
  );

-- ── reward_tiers ──────────────────────────────────────────────
DROP POLICY IF EXISTS reward_tiers_read  ON reward_tiers;
DROP POLICY IF EXISTS reward_tiers_write ON reward_tiers;

CREATE POLICY reward_tiers_read ON reward_tiers
  FOR SELECT TO public
  USING (tenant_id = current_tenant_id());

CREATE POLICY reward_tiers_write ON reward_tiers
  FOR ALL TO public
  USING (
    tenant_id = current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['admin','band'])
        AND profiles.tenant_id = current_tenant_id()
    )
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['admin','band'])
        AND profiles.tenant_id = current_tenant_id()
    )
  );

-- ── reward_claims ─────────────────────────────────────────────
DROP POLICY IF EXISTS claims_create              ON reward_claims;
DROP POLICY IF EXISTS claims_read_own            ON reward_claims;
DROP POLICY IF EXISTS claims_update              ON reward_claims;
DROP POLICY IF EXISTS reward_claims_admin_read   ON reward_claims;
DROP POLICY IF EXISTS reward_claims_admin_update ON reward_claims;

CREATE POLICY claims_create ON reward_claims
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND user_id = auth.uid());

CREATE POLICY claims_read_own ON reward_claims
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_tenant_id()
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = ANY (ARRAY['band','admin'])
          AND profiles.tenant_id = current_tenant_id()
      )
    )
  );

CREATE POLICY claims_update ON reward_claims
  FOR UPDATE TO authenticated
  USING (
    tenant_id = current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['band','admin'])
        AND profiles.tenant_id = current_tenant_id()
    )
  );

CREATE POLICY reward_claims_admin_read ON reward_claims
  FOR SELECT TO public
  USING (
    tenant_id = current_tenant_id()
    AND auth.uid() IN (
      SELECT id FROM profiles
      WHERE role = ANY (ARRAY['admin','band'])
        AND tenant_id = current_tenant_id()
    )
  );

CREATE POLICY reward_claims_admin_update ON reward_claims
  FOR UPDATE TO public
  USING (
    tenant_id = current_tenant_id()
    AND auth.uid() IN (
      SELECT id FROM profiles
      WHERE role = ANY (ARRAY['admin','band'])
        AND tenant_id = current_tenant_id()
    )
  );

-- ── notifications ─────────────────────────────────────────────
DROP POLICY IF EXISTS notifications_insert     ON notifications;
DROP POLICY IF EXISTS notifications_read_own   ON notifications;
DROP POLICY IF EXISTS notifications_update_own ON notifications;

CREATE POLICY notifications_insert ON notifications
  FOR INSERT TO public
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY notifications_read_own ON notifications
  FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND user_id = auth.uid());

CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE TO authenticated
  USING  (tenant_id = current_tenant_id() AND user_id = auth.uid());

-- ── links ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS links_read   ON links;
DROP POLICY IF EXISTS links_manage ON links;

CREATE POLICY links_read ON links
  FOR SELECT TO public
  USING (tenant_id = current_tenant_id());

CREATE POLICY links_manage ON links
  FOR ALL TO public
  USING (
    tenant_id = current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['band','admin'])
        AND profiles.tenant_id = current_tenant_id()
    )
  );

-- ── site_settings ─────────────────────────────────────────────
DROP POLICY IF EXISTS settings_read   ON site_settings;
DROP POLICY IF EXISTS settings_manage ON site_settings;

CREATE POLICY settings_read ON site_settings
  FOR SELECT TO public
  USING (tenant_id = current_tenant_id());

CREATE POLICY settings_manage ON site_settings
  FOR ALL TO authenticated
  USING (
    tenant_id = current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['band','admin'])
        AND profiles.tenant_id = current_tenant_id()
    )
  );

-- ── email_subscribers ─────────────────────────────────────────
DROP POLICY IF EXISTS email_sub_insert ON email_subscribers;
DROP POLICY IF EXISTS email_sub_read   ON email_subscribers;

CREATE POLICY email_sub_insert ON email_subscribers
  FOR INSERT TO public
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY email_sub_read ON email_subscribers
  FOR SELECT TO public
  USING (
    tenant_id = current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = ANY (ARRAY['band','admin'])
        AND profiles.tenant_id = current_tenant_id()
    )
  );

-- ── email_log ─────────────────────────────────────────────────
DROP POLICY IF EXISTS email_log_insert ON email_log;
DROP POLICY IF EXISTS email_log_read   ON email_log;

CREATE POLICY email_log_insert ON email_log
  FOR INSERT TO public
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY email_log_read ON email_log
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.tenant_id = current_tenant_id()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 6. Updated SQL functions — now accept + pass through tenant_id
-- ─────────────────────────────────────────────────────────────

-- ── award_stamps ──────────────────────────────────────────────
-- Added: p_tenant_id bigint parameter; all table queries scoped to it.
CREATE OR REPLACE FUNCTION public.award_stamps(
  target_user_id    uuid,
  action_trigger_key text,
  awarded_by_id     uuid    DEFAULT NULL,
  p_tenant_id       bigint  DEFAULT 1
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  action_record record;
  user_role     text;
BEGIN
  -- Check if user is band or admin — they don't earn stamps
  SELECT role INTO user_role
  FROM profiles
  WHERE id = target_user_id AND tenant_id = p_tenant_id;
  IF user_role IN ('band', 'admin') THEN RETURN; END IF;

  -- Find the action (scoped to tenant)
  SELECT * INTO action_record
  FROM stamp_actions
  WHERE trigger_key = action_trigger_key
    AND is_active = true
    AND tenant_id = p_tenant_id;
  IF action_record IS NULL THEN RETURN; END IF;

  -- Create transaction
  INSERT INTO stamp_transactions (user_id, action_id, points, description, awarded_by, tenant_id)
  VALUES (target_user_id, action_record.id, action_record.points, action_record.name, awarded_by_id, p_tenant_id);

  -- Update user stamp count
  UPDATE profiles
  SET stamp_count = stamp_count + action_record.points,
      stamp_level = CASE
        WHEN stamp_count + action_record.points >= 500 THEN 'stamped'
        WHEN stamp_count + action_record.points >= 300 THEN 'inner_sleeve'
        WHEN stamp_count + action_record.points >= 150 THEN 'deep_cut'
        WHEN stamp_count + action_record.points >= 50  THEN 'b_side'
        ELSE 'first_press'
      END
  WHERE id = target_user_id AND tenant_id = p_tenant_id;
END;
$$;

-- ── checkin_show ──────────────────────────────────────────────
-- Added: p_tenant_id bigint parameter; all table queries scoped to it.
CREATE OR REPLACE FUNCTION public.checkin_show(
  p_show_id   uuid,
  p_code      text,
  p_tenant_id bigint DEFAULT 1
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  v_checkin_code text;
  v_already      boolean;
BEGIN
  SELECT checkin_code INTO v_checkin_code
  FROM shows WHERE id = p_show_id AND tenant_id = p_tenant_id;

  IF v_checkin_code IS NULL OR v_checkin_code = '' THEN
    RETURN 'no_code';
  END IF;

  IF UPPER(v_checkin_code) != UPPER(p_code) THEN
    RETURN 'wrong_code';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM show_attendance
    WHERE show_id = p_show_id
      AND user_id = auth.uid()
      AND tenant_id = p_tenant_id
  ) INTO v_already;

  IF v_already THEN
    RETURN 'already';
  END IF;

  INSERT INTO show_attendance (show_id, user_id, tenant_id)
  VALUES (p_show_id, auth.uid(), p_tenant_id);

  UPDATE profiles
  SET show_count = COALESCE(show_count, 0) + 1
  WHERE id = auth.uid() AND tenant_id = p_tenant_id;

  PERFORM award_stamps(
    target_user_id     := auth.uid(),
    action_trigger_key := 'show_attended',
    awarded_by_id      := NULL,
    p_tenant_id        := p_tenant_id
  );

  RETURN 'success';
END;
$$;

-- ── process_referral ──────────────────────────────────────────
-- Added: p_tenant_id bigint parameter; all table queries scoped to it.
CREATE OR REPLACE FUNCTION public.process_referral(
  referrer_code text,
  p_tenant_id   bigint DEFAULT 1
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  referrer_id uuid;
BEGIN
  -- Find the referrer (scoped to tenant)
  SELECT id INTO referrer_id
  FROM profiles
  WHERE referral_code = referrer_code AND tenant_id = p_tenant_id;

  IF referrer_id IS NULL THEN RETURN; END IF;

  -- Don't allow self-referral
  IF referrer_id = auth.uid() THEN RETURN; END IF;

  -- Check if already referred
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND referred_by IS NOT NULL
      AND tenant_id = p_tenant_id
  ) THEN RETURN; END IF;

  -- Set referred_by on new user
  UPDATE profiles SET referred_by = referrer_id
  WHERE id = auth.uid() AND tenant_id = p_tenant_id;

  -- Increment referrer's count
  UPDATE profiles
  SET referral_count = referral_count + 1
  WHERE id = referrer_id AND tenant_id = p_tenant_id;

  -- Award stamps to both
  PERFORM award_stamps(auth.uid(),   'referral_completed', NULL, p_tenant_id);
  PERFORM award_stamps(referrer_id,  'referral_completed', NULL, p_tenant_id);
END;
$$;

-- ── create_notification ───────────────────────────────────────
-- Added: p_tenant_id bigint parameter; INSERT now includes tenant_id.
CREATE OR REPLACE FUNCTION public.create_notification(
  target_user_id uuid,
  notif_type     text,
  notif_title    text,
  notif_body     text   DEFAULT NULL,
  notif_link     text   DEFAULT NULL,
  p_tenant_id    bigint DEFAULT 1
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  -- Don't notify yourself
  IF target_user_id = auth.uid() THEN RETURN; END IF;

  INSERT INTO notifications (user_id, type, title, body, link, tenant_id)
  VALUES (target_user_id, notif_type, notif_title, notif_body, notif_link, p_tenant_id);
END;
$$;

-- ── auto_create_reward_claims (trigger function) ───────────────
-- Reads tenant_id from NEW.tenant_id (profiles row) and scopes
-- both the reward_tiers lookup and the reward_claims insert.
CREATE OR REPLACE FUNCTION public.auto_create_reward_claims()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  tier RECORD;
BEGIN
  -- Only run if stamp_count actually increased
  IF NEW.stamp_count > COALESCE(OLD.stamp_count, 0) THEN
    FOR tier IN
      SELECT * FROM reward_tiers
      WHERE is_active = true
        AND reward_type IS NOT NULL
        AND reward_type != ''
        AND stamps <= NEW.stamp_count
        AND tenant_id = NEW.tenant_id
    LOOP
      -- Insert claim if not already exists (scoped to tenant)
      INSERT INTO reward_claims (user_id, level_key, reward_type, status, tenant_id)
      VALUES (NEW.id, tier.key, tier.reward_type, 'pending', NEW.tenant_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
