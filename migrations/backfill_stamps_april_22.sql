-- ============================================================
-- BACKFILL STAMPS FROM APRIL 22 TO NOW (all tenants)
-- Awards retroactive stamps for posts, comments, and likes that
-- occurred while the client-side RPC awarding was broken.
--
-- Idempotent: safe to run once. Uses the existing award_stamps
-- function so it respects role checks (band/admin skipped) and
-- tenant-specific stamp_actions config.
-- ============================================================

DO $$
DECLARE
  rec record;
  post_author_id uuid;
BEGIN
  -- Backfill posts since April 22 2026
  FOR rec IN
    SELECT id, author_id, tenant_id, created_at
    FROM posts
    WHERE created_at > '2026-04-22 12:00:00'::timestamptz
    ORDER BY created_at ASC
  LOOP
    PERFORM award_stamps(rec.author_id, 'post_created', rec.tenant_id);
  END LOOP;

  -- Backfill comments since April 22 2026
  FOR rec IN
    SELECT id, author_id, tenant_id, created_at
    FROM comments
    WHERE created_at > '2026-04-22 12:00:00'::timestamptz
    ORDER BY created_at ASC
  LOOP
    PERFORM award_stamps(rec.author_id, 'comment_created', rec.tenant_id);
  END LOOP;

  -- Backfill likes since April 22 2026 (skip self-likes)
  FOR rec IN
    SELECT pl.id, pl.user_id, pl.post_id, pl.tenant_id, pl.created_at
    FROM post_likes pl
    WHERE pl.created_at > '2026-04-22 12:00:00'::timestamptz
    ORDER BY pl.created_at ASC
  LOOP
    SELECT author_id INTO post_author_id FROM posts WHERE id = rec.post_id;
    IF post_author_id IS NOT NULL AND post_author_id != rec.user_id THEN
      PERFORM award_stamps(rec.user_id, 'post_liked', rec.tenant_id);
    END IF;
  END LOOP;
END $$;

-- Sanity check: how many transactions exist now per day
SELECT DATE(created_at) as day, COUNT(*) as txn_count, SUM(points) as total_points
FROM stamp_transactions
WHERE tenant_id = 5
  AND created_at > '2026-04-22'
GROUP BY DATE(created_at)
ORDER BY day DESC;
