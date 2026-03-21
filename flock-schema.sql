-- =============================================
-- FLOCK - MULTI-TENANT DATABASE SCHEMA
-- Run this in a fresh Supabase project SQL editor
-- =============================================

-- ============ TENANT TABLES ============

CREATE TABLE public.tenants (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  custom_domain text UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public.tenant_config (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id bigint REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  key text NOT NULL,
  value text,
  UNIQUE(tenant_id, key)
);

CREATE TABLE public.tenant_members (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id bigint REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  accent_color text DEFAULT '#8B1A2B',
  bio text,
  avatar_url text,
  display_order integer DEFAULT 0,
  UNIQUE(tenant_id, slug)
);

-- ============ COMMUNITY TABLES ============

CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  tenant_id bigint REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  bio text,
  city text,
  stamp_count integer DEFAULT 0 NOT NULL,
  stamp_level text DEFAULT 'first_press' NOT NULL,
  role text DEFAULT 'fan' NOT NULL CHECK (role IN ('fan', 'band', 'admin')),
  band_member text,
  show_count integer DEFAULT 0,
  referral_code text UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  referral_count integer DEFAULT 0,
  email_notifications boolean DEFAULT true,
  signup_ip text,
  signup_country text,
  signup_city text,
  signup_lat float,
  signup_lng float,
  joined_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_profiles_role ON profiles(tenant_id, role);

CREATE TABLE public.posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id bigint REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL DEFAULT '',
  feed_type text DEFAULT 'community' NOT NULL,
  image_url text,
  images jsonb,
  audio_url text,
  video_url text,
  link_url text,
  poll_options jsonb,
  is_exclusive boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  is_highlight boolean DEFAULT false,
  tag text DEFAULT 'general',
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_posts_tenant_feed ON posts(tenant_id, feed_type, created_at DESC);

CREATE TABLE public.post_likes (
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id bigint REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE public.comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id bigint REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  image_url text,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_comments_post ON comments(post_id, created_at);

CREATE TABLE public.shows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id bigint REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  city text NOT NULL,
  venue text NOT NULL,
  country text,
  region text CHECK (region IN ('australia', 'europe', 'uk', 'north_america', 'other')),
  ticket_url text,
  status text DEFAULT 'announced' CHECK (status IN ('announced', 'on_sale', 'door_sales', 'sold_out', 'cancelled')),
  checkin_code text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_shows_tenant ON shows(tenant_id, date);

CREATE TABLE public.show_attendance (
  show_id uuid REFERENCES public.shows(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id bigint REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  checked_in_at timestamptz DEFAULT now(),
  PRIMARY KEY (show_id, user_id)
);

CREATE TABLE public.stamp_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id bigint REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  points integer NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('auto', 'manual')),
  trigger_key text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, trigger_key)
);

CREATE TABLE public.stamp_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id bigint REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action_id uuid REFERENCES public.stamp_actions(id) ON DELETE SET NULL,
  points integer NOT NULL,
  description text,
  awarded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_stamp_tx_user ON stamp_transactions(tenant_id, user_id, created_at DESC);

CREATE TABLE public.reward_tiers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id bigint REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  key text NOT NULL,
  name text NOT NULL,
  stamps integer NOT NULL,
  icon text DEFAULT '✦',
  reward_type text,
  reward_desc text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  UNIQUE(tenant_id, key)
);

CREATE TABLE public.reward_claims (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id bigint REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  level_key text NOT NULL,
  reward_type text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'shipped', 'completed', 'denied')),
  shipping_name text,
  shipping_address text,
  shipping_city text,
  shipping_country text,
  shipping_postcode text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id, level_key)
);

CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id bigint REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(tenant_id, user_id, created_at DESC);

CREATE TABLE public.poll_votes (
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id bigint REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  option_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- ============ FLOCK PLATFORM TABLE ============
-- (separate from per-tenant profiles - this is the Flock account owner)

CREATE TABLE public.flock_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  tenant_id bigint REFERENCES tenants(id),
  created_at timestamptz DEFAULT now()
);

-- ============ ROW LEVEL SECURITY ============

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamp_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Tenants: public read
CREATE POLICY "tenants_read" ON tenants FOR SELECT USING (true);

-- Tenant config: public read
CREATE POLICY "tenant_config_read" ON tenant_config FOR SELECT USING (true);

-- Tenant members: public read
CREATE POLICY "tenant_members_read" ON tenant_members FOR SELECT USING (true);

-- Profiles: read own or same tenant, update own
CREATE POLICY "profiles_read" ON profiles FOR SELECT USING (auth.uid() = id OR true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Posts: public read, authenticated insert (author)
CREATE POLICY "posts_read" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "posts_update_own" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "posts_delete" ON posts FOR DELETE USING (
  auth.uid() = author_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('band', 'admin') AND tenant_id = posts.tenant_id)
);

-- Post likes
CREATE POLICY "likes_read" ON post_likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- Comments
CREATE POLICY "comments_read" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_delete" ON comments FOR DELETE USING (
  auth.uid() = author_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('band', 'admin') AND tenant_id = comments.tenant_id)
);

-- Shows: public read
CREATE POLICY "shows_read" ON shows FOR SELECT USING (true);
CREATE POLICY "shows_manage" ON shows FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('band', 'admin') AND tenant_id = shows.tenant_id)
);

-- Show attendance
CREATE POLICY "attendance_read" ON show_attendance FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('band', 'admin') AND tenant_id = show_attendance.tenant_id));
CREATE POLICY "attendance_insert" ON show_attendance FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Stamp actions: public read
CREATE POLICY "stamp_actions_read" ON stamp_actions FOR SELECT USING (true);

-- Stamp transactions
CREATE POLICY "stamp_tx_read" ON stamp_transactions FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('band', 'admin') AND tenant_id = stamp_transactions.tenant_id));
CREATE POLICY "stamp_tx_insert" ON stamp_transactions FOR INSERT WITH CHECK (true);

-- Reward tiers: public read
CREATE POLICY "reward_tiers_read" ON reward_tiers FOR SELECT USING (true);

-- Reward claims
CREATE POLICY "reward_claims_read" ON reward_claims FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('band', 'admin') AND tenant_id = reward_claims.tenant_id));
CREATE POLICY "reward_claims_insert" ON reward_claims FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE POLICY "notifications_read" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);

-- Poll votes
CREATE POLICY "poll_votes_read" ON poll_votes FOR SELECT USING (true);
CREATE POLICY "poll_votes_insert" ON poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============ FUNCTIONS ============

-- Award stamps to a user
CREATE OR REPLACE FUNCTION public.award_stamps(
  target_user_id uuid,
  action_trigger_key text,
  p_tenant_id bigint DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  action_record record;
  tenant_id_val bigint;
BEGIN
  -- Get tenant_id from profile if not provided
  IF p_tenant_id IS NULL THEN
    SELECT tenant_id INTO tenant_id_val FROM profiles WHERE id = target_user_id LIMIT 1;
  ELSE
    tenant_id_val := p_tenant_id;
  END IF;

  -- Skip band/admin users
  IF EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id AND tenant_id = tenant_id_val AND role IN ('band', 'admin')) THEN
    RETURN;
  END IF;

  SELECT * INTO action_record FROM stamp_actions
  WHERE trigger_key = action_trigger_key AND tenant_id = tenant_id_val AND is_active = true;

  IF action_record IS NULL THEN RETURN; END IF;

  INSERT INTO stamp_transactions (user_id, tenant_id, action_id, points, description)
  VALUES (target_user_id, tenant_id_val, action_record.id, action_record.points, action_record.name);

  UPDATE profiles
  SET stamp_count = stamp_count + action_record.points,
      stamp_level = CASE
        WHEN stamp_count + action_record.points >= 1000 THEN 'inner_circle'
        WHEN stamp_count + action_record.points >= 500 THEN 'stamped'
        WHEN stamp_count + action_record.points >= 300 THEN 'inner_sleeve'
        WHEN stamp_count + action_record.points >= 150 THEN 'deep_cut'
        WHEN stamp_count + action_record.points >= 50 THEN 'b_side'
        ELSE 'first_press'
      END
  WHERE id = target_user_id AND tenant_id = tenant_id_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Show check-in
CREATE OR REPLACE FUNCTION public.checkin_show(
  p_show_id uuid,
  p_code text,
  p_tenant_id bigint DEFAULT NULL
)
RETURNS text AS $$
DECLARE
  show_record record;
  user_id uuid;
BEGIN
  user_id := auth.uid();
  IF user_id IS NULL THEN RETURN 'not authenticated'; END IF;

  SELECT * INTO show_record FROM shows WHERE id = p_show_id;
  IF show_record IS NULL THEN RETURN 'show not found'; END IF;
  IF show_record.checkin_code IS NULL OR lower(show_record.checkin_code) != lower(p_code) THEN RETURN 'wrong code'; END IF;

  IF EXISTS (SELECT 1 FROM show_attendance WHERE show_id = p_show_id AND user_id = auth.uid()) THEN
    RETURN 'already checked in';
  END IF;

  INSERT INTO show_attendance (show_id, user_id, tenant_id)
  VALUES (p_show_id, auth.uid(), show_record.tenant_id);

  UPDATE profiles SET show_count = show_count + 1 WHERE id = auth.uid();

  PERFORM award_stamps(auth.uid(), 'show_attended', show_record.tenant_id);

  RETURN 'success';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  target_user_id uuid,
  notif_type text,
  notif_title text,
  notif_body text DEFAULT NULL,
  notif_link text DEFAULT NULL,
  p_tenant_id bigint DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  tenant_id_val bigint;
BEGIN
  IF p_tenant_id IS NULL THEN
    SELECT tenant_id INTO tenant_id_val FROM profiles WHERE id = target_user_id LIMIT 1;
  ELSE
    tenant_id_val := p_tenant_id;
  END IF;

  INSERT INTO notifications (user_id, tenant_id, type, title, body, link)
  VALUES (target_user_id, tenant_id_val, notif_type, notif_title, notif_body, notif_link);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  tenant_id_val bigint;
BEGIN
  -- Get tenant_id from user metadata if set
  IF new.raw_user_meta_data ? 'tenant_id' THEN
    tenant_id_val := (new.raw_user_meta_data->>'tenant_id')::bigint;
    INSERT INTO public.profiles (id, tenant_id, display_name, avatar_url)
    VALUES (
      new.id,
      tenant_id_val,
      COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', 'fan'),
      COALESCE(new.raw_user_meta_data->>'avatar_url', null)
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============ SEED: The Stamps as tenant 1 ============
-- (Run separately after schema is created if needed)
-- INSERT INTO tenants (slug, name) VALUES ('the-stamps', 'The Stamps');
