-- ============================================================
-- Deep-link notifications to the post they're about.
--
-- The notification triggers stored link = '/', so tapping "someone replied to
-- your comment" just dropped you on the feed with no idea where. These updated
-- triggers store link = '/?post=<post_id>' so the app can open the exact post
-- (with its comments). Only the link value changes vs notification_triggers.sql;
-- the notify logic is identical.
--
-- Existing notification rows keep link '/' (not back-filled) — only new ones
-- deep-link, which is fine.
--
-- Idempotent: safe to run more than once.
-- ============================================================

-- ── New comment -> notify POST author and PARENT comment author, linking to post ──
CREATE OR REPLACE FUNCTION public.trg_notify_on_comment()
RETURNS trigger AS $$
DECLARE
  post_author_id uuid;
  commenter_name text;
  parent_author_id uuid;
  post_link text := '/?post=' || NEW.post_id;
BEGIN
  SELECT display_name INTO commenter_name FROM profiles WHERE id = NEW.author_id;
  commenter_name := COALESCE(NULLIF(commenter_name, ''), 'someone');

  SELECT author_id INTO post_author_id FROM posts WHERE id = NEW.post_id;
  IF post_author_id IS NOT NULL AND post_author_id <> NEW.author_id THEN
    PERFORM create_notification(
      post_author_id, 'comment',
      commenter_name || ' commented on your post',
      LEFT(NEW.content, 120), post_link, NEW.tenant_id);
  END IF;

  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO parent_author_id FROM comments WHERE id = NEW.parent_id;
    IF parent_author_id IS NOT NULL
       AND parent_author_id <> NEW.author_id
       AND parent_author_id <> post_author_id THEN
      PERFORM create_notification(
        parent_author_id, 'reply',
        commenter_name || ' replied to your comment',
        LEFT(NEW.content, 120), post_link, NEW.tenant_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── New like -> notify POST author, linking to post ──
CREATE OR REPLACE FUNCTION public.trg_notify_on_like()
RETURNS trigger AS $$
DECLARE
  post_author_id uuid;
  liker_name text;
BEGIN
  SELECT author_id INTO post_author_id FROM posts WHERE id = NEW.post_id;
  IF post_author_id IS NULL OR post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO liker_name FROM profiles WHERE id = NEW.user_id;
  liker_name := COALESCE(NULLIF(liker_name, ''), 'someone');

  PERFORM create_notification(
    post_author_id, 'like',
    liker_name || ' liked your post',
    NULL, '/?post=' || NEW.post_id, NEW.tenant_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── New comment-like -> notify COMMENT author, linking to the comment's post ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comment_likes') THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.trg_notify_on_comment_like()
      RETURNS trigger AS $body$
      DECLARE
        comment_author_id uuid;
        comment_post_id uuid;
        liker_name text;
      BEGIN
        SELECT author_id, post_id INTO comment_author_id, comment_post_id FROM comments WHERE id = NEW.comment_id;
        IF comment_author_id IS NULL OR comment_author_id = NEW.user_id THEN
          RETURN NEW;
        END IF;
        SELECT display_name INTO liker_name FROM profiles WHERE id = NEW.user_id;
        liker_name := COALESCE(NULLIF(liker_name, ''), 'someone');
        PERFORM create_notification(
          comment_author_id, 'comment_like',
          liker_name || ' liked your comment',
          NULL, '/?post=' || comment_post_id, NEW.tenant_id);
        RETURN NEW;
      END;
      $body$ LANGUAGE plpgsql SECURITY DEFINER;
    $f$;
  END IF;
END $$;
