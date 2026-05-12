-- ============================================================
-- AUTO-AWARD STAMPS VIA DATABASE TRIGGERS + RATE LIMITING
--
-- Why: client-side RPC calls have been silently failing
-- (.catch(() => {}) hides everything). DB triggers fire on every
-- insert regardless of client reliability.
--
-- Also adds rate limiting to prevent like-spam farming
-- (one fan racked up 19 like-stamps in 8 seconds).
-- ============================================================

-- Rate-limited variant of award_stamps
-- Checks if user has earned this same action_trigger_key in the
-- last N seconds (configurable per action below). If so, skip.
CREATE OR REPLACE FUNCTION public.award_stamps_rate_limited(
  target_user_id uuid,
  action_trigger_key text,
  p_tenant_id bigint,
  cooldown_seconds int DEFAULT 0
)
RETURNS void AS $$
DECLARE
  recent_count int;
  action_record record;
BEGIN
  -- Look up the action
  SELECT * INTO action_record FROM stamp_actions
  WHERE trigger_key = action_trigger_key
    AND tenant_id = p_tenant_id
    AND is_active = true;

  IF action_record IS NULL THEN RETURN; END IF;

  -- Apply cooldown check if set
  IF cooldown_seconds > 0 THEN
    SELECT COUNT(*) INTO recent_count
    FROM stamp_transactions
    WHERE user_id = target_user_id
      AND tenant_id = p_tenant_id
      AND action_id = action_record.id
      AND created_at > (NOW() - (cooldown_seconds || ' seconds')::interval);

    IF recent_count > 0 THEN RETURN; END IF;
  END IF;

  -- Delegate to the standard award function
  PERFORM award_stamps(target_user_id, action_trigger_key, p_tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.award_stamps_rate_limited(uuid, text, bigint, int) TO authenticated, anon;

-- ────────────────────────────────────────────────────────────
-- POST INSERT TRIGGER
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_award_post_stamps()
RETURNS trigger AS $$
BEGIN
  -- No cooldown for posts (they're effortful enough on their own)
  PERFORM award_stamps(NEW.author_id, 'post_created', NEW.tenant_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS award_post_stamps ON posts;
CREATE TRIGGER award_post_stamps
AFTER INSERT ON posts
FOR EACH ROW EXECUTE FUNCTION trg_award_post_stamps();

-- ────────────────────────────────────────────────────────────
-- COMMENT INSERT TRIGGER
-- 30-second cooldown so people can't spam-comment for points
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_award_comment_stamps()
RETURNS trigger AS $$
BEGIN
  PERFORM award_stamps_rate_limited(NEW.author_id, 'comment_created', NEW.tenant_id, 30);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS award_comment_stamps ON comments;
CREATE TRIGGER award_comment_stamps
AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION trg_award_comment_stamps();

-- ────────────────────────────────────────────────────────────
-- LIKE INSERT TRIGGER
-- 10-second cooldown + no self-likes
-- (Nat <3 farmed 19 likes in 8 seconds - this kills that pattern)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_award_like_stamps()
RETURNS trigger AS $$
DECLARE
  post_author_id uuid;
BEGIN
  -- Look up the post author
  SELECT author_id INTO post_author_id FROM posts WHERE id = NEW.post_id;

  -- Don't award for liking your own post or if post is missing
  IF post_author_id IS NULL OR post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  PERFORM award_stamps_rate_limited(NEW.user_id, 'post_liked', NEW.tenant_id, 10);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS award_like_stamps ON post_likes;
CREATE TRIGGER award_like_stamps
AFTER INSERT ON post_likes
FOR EACH ROW EXECUTE FUNCTION trg_award_like_stamps();

-- ────────────────────────────────────────────────────────────
-- Verify triggers are installed
-- ────────────────────────────────────────────────────────────
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('award_post_stamps', 'award_comment_stamps', 'award_like_stamps')
ORDER BY trigger_name;
