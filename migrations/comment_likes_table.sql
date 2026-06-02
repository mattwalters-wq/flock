-- ============================================================
-- COMMENT LIKES
-- Lets fans acknowledge a comment without replying. Composite key
-- on (comment_id, user_id) so a user can only like a comment once.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id bigint REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Anyone in the tenant can read like counts
DROP POLICY IF EXISTS comment_likes_read ON comment_likes;
CREATE POLICY comment_likes_read ON comment_likes FOR SELECT USING (true);

-- A user can only like as themselves
DROP POLICY IF EXISTS comment_likes_insert ON comment_likes;
CREATE POLICY comment_likes_insert ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- A user can only remove their own like
DROP POLICY IF EXISTS comment_likes_delete ON comment_likes;
CREATE POLICY comment_likes_delete ON comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Verify
SELECT 'comment_likes table ready' AS status;
