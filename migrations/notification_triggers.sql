-- ============================================================
-- IN-APP NOTIFICATION TRIGGERS
-- Nothing was writing to the notifications table, so the bell was
-- always empty. These triggers create notification rows server-side
-- when meaningful things happen, using the existing create_notification
-- helper. Self-actions never notify (you don't get pinged for your own
-- comment/like).
-- ============================================================

-- ── New comment -> notify the POST author, and the PARENT comment author ──
CREATE OR REPLACE FUNCTION public.trg_notify_on_comment()
RETURNS trigger AS $$
DECLARE
  post_author_id uuid;
  post_first_line text;
  commenter_name text;
  parent_author_id uuid;
BEGIN
  SELECT display_name INTO commenter_name FROM profiles WHERE id = NEW.author_id;
  commenter_name := COALESCE(NULLIF(commenter_name, ''), 'someone');

  -- Notify the post author (if it's not their own comment)
  SELECT author_id INTO post_author_id FROM posts WHERE id = NEW.post_id;
  IF post_author_id IS NOT NULL AND post_author_id <> NEW.author_id THEN
    PERFORM create_notification(
      post_author_id,
      'comment',
      commenter_name || ' commented on your post',
      LEFT(NEW.content, 120),
      '/',
      NEW.tenant_id
    );
  END IF;

  -- If this is a reply, also notify the parent comment's author
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO parent_author_id FROM comments WHERE id = NEW.parent_id;
    IF parent_author_id IS NOT NULL
       AND parent_author_id <> NEW.author_id
       AND parent_author_id <> post_author_id THEN
      PERFORM create_notification(
        parent_author_id,
        'reply',
        commenter_name || ' replied to your comment',
        LEFT(NEW.content, 120),
        '/',
        NEW.tenant_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_on_comment ON comments;
CREATE TRIGGER notify_on_comment
AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION trg_notify_on_comment();

-- ── New like -> notify the POST author (not self) ──
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
    post_author_id,
    'like',
    liker_name || ' liked your post',
    NULL,
    '/',
    NEW.tenant_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_on_like ON post_likes;
CREATE TRIGGER notify_on_like
AFTER INSERT ON post_likes
FOR EACH ROW EXECUTE FUNCTION trg_notify_on_like();

-- ── New comment-like -> notify the COMMENT author (not self) ──
-- (created below only if the comment_likes table exists; safe to run after
--  the comment-like feature migration. If comment_likes does not exist yet,
--  this block is skipped.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comment_likes') THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.trg_notify_on_comment_like()
      RETURNS trigger AS $body$
      DECLARE
        comment_author_id uuid;
        liker_name text;
      BEGIN
        SELECT author_id INTO comment_author_id FROM comments WHERE id = NEW.comment_id;
        IF comment_author_id IS NULL OR comment_author_id = NEW.user_id THEN
          RETURN NEW;
        END IF;
        SELECT display_name INTO liker_name FROM profiles WHERE id = NEW.user_id;
        liker_name := COALESCE(NULLIF(liker_name, ''), 'someone');
        PERFORM create_notification(
          comment_author_id,
          'comment_like',
          liker_name || ' liked your comment',
          NULL,
          '/',
          NEW.tenant_id
        );
        RETURN NEW;
      END;
      $body$ LANGUAGE plpgsql SECURITY DEFINER;
    $f$;
    DROP TRIGGER IF EXISTS notify_on_comment_like ON comment_likes;
    CREATE TRIGGER notify_on_comment_like
    AFTER INSERT ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION trg_notify_on_comment_like();
  END IF;
END $$;

-- Verify triggers installed
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('notify_on_comment', 'notify_on_like', 'notify_on_comment_like')
ORDER BY trigger_name;
