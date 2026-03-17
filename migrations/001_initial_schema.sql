-- =================================================================
-- Flock: migrations/001_initial_schema.sql
-- Full schema for the Flock Supabase project (pzcajxpqljulokvowcev)
-- Multi-tenant from day one. tenant_id is NEVER optional.
-- Run against: Flock Supabase ONLY — never stamps-land.
-- =================================================================

-- =================================================================
-- EXTENSIONS
-- =================================================================
create extension if not exists "uuid-ossp";

-- =================================================================
-- TENANT TABLES
-- =================================================================

create table if not exists tenants (
  id            bigint generated always as identity primary key,
  slug          text        not null unique,
  name          text        not null,
  custom_domain text        unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists tenants_slug_idx          on tenants (slug);
create index if not exists tenants_custom_domain_idx on tenants (custom_domain);

create table if not exists tenant_config (
  id         bigint generated always as identity primary key,
  tenant_id  bigint not null references tenants (id) on delete cascade,
  key        text   not null,
  value      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, key)
);
create index if not exists tenant_config_tenant_id_idx on tenant_config (tenant_id);

create table if not exists tenant_members (
  id            bigint generated always as identity primary key,
  tenant_id     bigint not null references tenants (id) on delete cascade,
  slug          text   not null,
  name          text   not null,
  accent_color  text,
  bio           text,
  avatar_url    text,
  display_order int    not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tenant_id, slug)
);
create index if not exists tenant_members_tenant_id_idx on tenant_members (tenant_id);

-- =================================================================
-- TENANT HELPER FUNCTIONS
-- =================================================================

create or replace function public.set_tenant(p_slug text)
  returns void language sql security definer
as $$ select set_config('app.tenant_slug', p_slug, true); $$;

create or replace function public.current_tenant_id()
  returns bigint language sql stable security definer
as $$ select id from tenants where slug = current_setting('app.tenant_slug', true); $$;

-- =================================================================
-- COMMUNITY TABLES (tenant_id NOT NULL, no default)
-- =================================================================

create table if not exists profiles (
  id                   uuid        not null primary key references auth.users (id) on delete cascade,
  tenant_id            bigint      not null references tenants (id),
  display_name         text        not null,
  avatar_url           text,
  bio                  text,
  city                 text,
  stamp_count          int         not null default 0,
  stamp_level          text        not null default 'first_press',
  role                 text        not null default 'fan',
  band_member          text,
  joined_at            timestamptz not null default now(),
  last_seen_at         timestamptz default now(),
  login_streak         int         default 0,
  show_count           int         default 0,
  referral_code        text        unique,
  referred_by          uuid,
  referral_count       int         default 0,
  email_notifications  boolean     default true,
  signup_country       text,
  signup_city          text,
  signup_region        text,
  signup_lat           numeric,
  signup_lng           numeric,
  signup_ip            text
);
create index if not exists profiles_tenant_id_idx on profiles (tenant_id);

create table if not exists posts (
  id              uuid        not null primary key default gen_random_uuid(),
  tenant_id       bigint      not null references tenants (id),
  author_id       uuid        not null references profiles (id) on delete cascade,
  content         text        not null,
  feed_type       text        not null default 'community',
  is_exclusive    boolean     default false,
  exclusive_level text        default 'stamped',
  like_count      int         default 0,
  comment_count   int         default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz default now(),
  image_url       text,
  audio_url       text,
  images          jsonb
);
create index if not exists posts_tenant_id_idx  on posts (tenant_id);
create index if not exists posts_author_id_idx  on posts (author_id);
create index if not exists posts_created_at_idx on posts (created_at desc);

create table if not exists comments (
  id         uuid        not null primary key default gen_random_uuid(),
  tenant_id  bigint      not null references tenants (id),
  post_id    uuid        not null references posts (id) on delete cascade,
  author_id  uuid        not null references profiles (id) on delete cascade,
  content    text        not null,
  like_count int         default 0,
  created_at timestamptz default now(),
  image_url  text,
  parent_id  uuid        references comments (id) on delete cascade
);
create index if not exists comments_tenant_id_idx on comments (tenant_id);
create index if not exists comments_post_id_idx   on comments (post_id);

create table if not exists post_likes (
  post_id    uuid        not null references posts (id) on delete cascade,
  user_id    uuid        not null references profiles (id) on delete cascade,
  tenant_id  bigint      not null references tenants (id),
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
create index if not exists post_likes_tenant_id_idx on post_likes (tenant_id);

create table if not exists shows (
  id           uuid        not null primary key default gen_random_uuid(),
  tenant_id    bigint      not null references tenants (id),
  date         date        not null,
  city         text        not null,
  venue        text        not null,
  country      text,
  region       text,
  ticket_url   text,
  status       text        default 'on_sale',
  sort_order   int         default 0,
  created_at   timestamptz default now(),
  checkin_code text
);
create index if not exists shows_tenant_id_idx on shows (tenant_id);

create table if not exists show_attendance (
  show_id       uuid        not null references shows (id) on delete cascade,
  user_id       uuid        not null references profiles (id) on delete cascade,
  tenant_id     bigint      not null references tenants (id),
  checked_in_at timestamptz default now(),
  primary key (show_id, user_id)
);
create index if not exists show_attendance_tenant_id_idx on show_attendance (tenant_id);

create table if not exists stamp_actions (
  id          uuid        not null primary key default gen_random_uuid(),
  tenant_id   bigint      not null references tenants (id),
  name        text        not null,
  description text,
  points      int         not null,
  action_type text        not null,
  trigger_key text        unique,
  is_active   boolean     default true,
  created_at  timestamptz default now()
);
create index if not exists stamp_actions_tenant_id_idx on stamp_actions (tenant_id);

create table if not exists stamp_transactions (
  id          uuid        not null primary key default gen_random_uuid(),
  tenant_id   bigint      not null references tenants (id),
  user_id     uuid        not null references profiles (id) on delete cascade,
  action_id   uuid        references stamp_actions (id),
  points      int         not null,
  description text,
  awarded_by  uuid,
  created_at  timestamptz default now()
);
create index if not exists stamp_transactions_tenant_id_idx on stamp_transactions (tenant_id);
create index if not exists stamp_transactions_user_id_idx   on stamp_transactions (user_id);

create table if not exists reward_tiers (
  id          uuid        not null primary key default gen_random_uuid(),
  tenant_id   bigint      not null references tenants (id),
  name        text        not null,
  key         text        not null,
  stamps      int         not null default 0,
  icon        text        default '✦',
  reward_type text,
  reward_desc text,
  sort_order  int         default 0,
  is_active   boolean     default true,
  created_at  timestamptz default now(),
  unique (tenant_id, key)
);
create index if not exists reward_tiers_tenant_id_idx on reward_tiers (tenant_id);

create table if not exists reward_claims (
  id                uuid        not null primary key default gen_random_uuid(),
  tenant_id         bigint      not null references tenants (id),
  user_id           uuid        not null references profiles (id) on delete cascade,
  level_key         text        not null,
  reward_type       text        not null,
  status            text        default 'pending',
  shipping_name     text,
  shipping_address  text,
  shipping_city     text,
  shipping_country  text,
  shipping_postcode text,
  notes             text,
  claimed_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  unique (tenant_id, user_id, level_key)
);
create index if not exists reward_claims_tenant_id_idx on reward_claims (tenant_id);
create index if not exists reward_claims_user_id_idx   on reward_claims (user_id);

create table if not exists notifications (
  id         uuid        not null primary key default gen_random_uuid(),
  tenant_id  bigint      not null references tenants (id),
  user_id    uuid        not null references profiles (id) on delete cascade,
  type       text        not null,
  title      text        not null,
  body       text,
  link       text,
  is_read    boolean     default false,
  created_at timestamptz default now()
);
create index if not exists notifications_tenant_id_idx on notifications (tenant_id);
create index if not exists notifications_user_id_idx   on notifications (user_id);

create table if not exists links (
  id         uuid        not null primary key default gen_random_uuid(),
  tenant_id  bigint      not null references tenants (id),
  label      text        not null,
  url        text        not null,
  icon       text,
  category   text        not null,
  sort_order int         default 0,
  is_active  boolean     default true
);
create index if not exists links_tenant_id_idx on links (tenant_id);

create table if not exists site_settings (
  key        text    not null,
  tenant_id  bigint  not null references tenants (id),
  value      text    not null,
  updated_at timestamptz default now(),
  primary key (tenant_id, key)
);
create index if not exists site_settings_tenant_id_idx on site_settings (tenant_id);

create table if not exists email_subscribers (
  id            uuid        not null primary key default gen_random_uuid(),
  tenant_id     bigint      not null references tenants (id),
  email         text        not null,
  subscribed_at timestamptz not null default now(),
  unique (tenant_id, email)
);
create index if not exists email_subscribers_tenant_id_idx on email_subscribers (tenant_id);

create table if not exists email_log (
  id           uuid        not null primary key default gen_random_uuid(),
  tenant_id    bigint      not null references tenants (id),
  recipient_id uuid,
  email_type   text        not null,
  subject      text,
  sent_at      timestamptz default now()
);
create index if not exists email_log_tenant_id_idx on email_log (tenant_id);

-- =================================================================
-- ROW LEVEL SECURITY
-- =================================================================
alter table profiles           enable row level security;
alter table posts              enable row level security;
alter table comments           enable row level security;
alter table post_likes         enable row level security;
alter table shows              enable row level security;
alter table show_attendance    enable row level security;
alter table stamp_actions      enable row level security;
alter table stamp_transactions enable row level security;
alter table reward_tiers       enable row level security;
alter table reward_claims      enable row level security;
alter table notifications      enable row level security;
alter table links              enable row level security;
alter table site_settings      enable row level security;
alter table email_subscribers  enable row level security;
alter table email_log          enable row level security;

-- profiles
create policy profiles_read on profiles for select to public using (tenant_id = current_tenant_id());
create policy profiles_update on profiles for update to authenticated using (tenant_id = current_tenant_id() and (auth.uid() = id or exists (select 1 from profiles p2 where p2.id = auth.uid() and p2.role = 'admin' and p2.tenant_id = current_tenant_id())));

-- posts
create policy posts_read on posts for select to public using (tenant_id = current_tenant_id());
create policy posts_create on posts for insert to authenticated with check (tenant_id = current_tenant_id());
create policy posts_update_own on posts for update to authenticated using (tenant_id = current_tenant_id() and auth.uid() = author_id);
create policy posts_delete on posts for delete to authenticated using (tenant_id = current_tenant_id() and (auth.uid() = author_id or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['band','admin']) and profiles.tenant_id = current_tenant_id())));

-- comments
create policy comments_read on comments for select to public using (tenant_id = current_tenant_id());
create policy comments_create on comments for insert to authenticated with check (tenant_id = current_tenant_id());
create policy comments_update on comments for update to public using (tenant_id = current_tenant_id() and auth.uid() = author_id) with check (tenant_id = current_tenant_id() and auth.uid() = author_id);
create policy comments_delete on comments for delete to authenticated using (tenant_id = current_tenant_id() and (auth.uid() = author_id or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['band','admin']) and profiles.tenant_id = current_tenant_id())));

-- post_likes
create policy likes_read on post_likes for select to public using (tenant_id = current_tenant_id());
create policy likes_create on post_likes for insert to authenticated with check (tenant_id = current_tenant_id());
create policy likes_delete on post_likes for delete to authenticated using (tenant_id = current_tenant_id());

-- shows
create policy shows_read on shows for select to public using (tenant_id = current_tenant_id());
create policy shows_manage on shows for all to public using (tenant_id = current_tenant_id() and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['band','admin']) and profiles.tenant_id = current_tenant_id()));

-- show_attendance
create policy attendance_read on show_attendance for select to public using (tenant_id = current_tenant_id());
create policy attendance_manage on show_attendance for all to public using (tenant_id = current_tenant_id() and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['band','admin']) and profiles.tenant_id = current_tenant_id()));

-- stamp_actions
create policy stamp_actions_read on stamp_actions for select to public using (tenant_id = current_tenant_id());
create policy stamp_actions_manage on stamp_actions for all to public using (tenant_id = current_tenant_id() and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['band','admin']) and profiles.tenant_id = current_tenant_id()));

-- stamp_transactions
create policy stamp_tx_read_own on stamp_transactions for select to public using (tenant_id = current_tenant_id() and (auth.uid() = user_id or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['band','admin']) and profiles.tenant_id = current_tenant_id())));
create policy stamp_tx_create on stamp_transactions for insert to public with check (tenant_id = current_tenant_id() and (auth.uid() = user_id or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['band','admin']) and profiles.tenant_id = current_tenant_id())));

-- reward_tiers
create policy reward_tiers_read on reward_tiers for select to public using (tenant_id = current_tenant_id());
create policy reward_tiers_write on reward_tiers for all to public using (tenant_id = current_tenant_id() and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','band']) and profiles.tenant_id = current_tenant_id())) with check (tenant_id = current_tenant_id() and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','band']) and profiles.tenant_id = current_tenant_id()));

-- reward_claims
create policy claims_create on reward_claims for insert to authenticated with check (tenant_id = current_tenant_id() and user_id = auth.uid());
create policy claims_read_own on reward_claims for select to authenticated using (tenant_id = current_tenant_id() and (user_id = auth.uid() or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['band','admin']) and profiles.tenant_id = current_tenant_id())));
create policy claims_update on reward_claims for update to authenticated using (tenant_id = current_tenant_id() and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['band','admin']) and profiles.tenant_id = current_tenant_id()));
create policy reward_claims_admin_read on reward_claims for select to public using (tenant_id = current_tenant_id() and auth.uid() in (select id from profiles where role = any (array['admin','band']) and tenant_id = current_tenant_id()));
create policy reward_claims_admin_update on reward_claims for update to public using (tenant_id = current_tenant_id() and auth.uid() in (select id from profiles where role = any (array['admin','band']) and tenant_id = current_tenant_id()));

-- notifications
create policy notifications_insert on notifications for insert to public with check (tenant_id = current_tenant_id());
create policy notifications_read_own on notifications for select to authenticated using (tenant_id = current_tenant_id() and user_id = auth.uid());
create policy notifications_update_own on notifications for update to authenticated using (tenant_id = current_tenant_id() and user_id = auth.uid());

-- links
create policy links_read on links for select to public using (tenant_id = current_tenant_id());
create policy links_manage on links for all to public using (tenant_id = current_tenant_id() and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['band','admin']) and profiles.tenant_id = current_tenant_id()));

-- site_settings
create policy settings_read on site_settings for select to public using (tenant_id = current_tenant_id());
create policy settings_manage on site_settings for all to authenticated using (tenant_id = current_tenant_id() and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['band','admin']) and profiles.tenant_id = current_tenant_id()));

-- email_subscribers
create policy email_sub_insert on email_subscribers for insert to public with check (tenant_id = current_tenant_id());
create policy email_sub_read on email_subscribers for select to public using (tenant_id = current_tenant_id() and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['band','admin']) and profiles.tenant_id = current_tenant_id()));

-- email_log
create policy email_log_insert on email_log for insert to public with check (tenant_id = current_tenant_id());
create policy email_log_read on email_log for select to authenticated using (tenant_id = current_tenant_id() and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin' and profiles.tenant_id = current_tenant_id()));

-- =================================================================
-- SQL FUNCTIONS
-- =================================================================

create or replace function public.award_stamps(target_user_id uuid, action_trigger_key text, awarded_by_id uuid default null, p_tenant_id bigint default null)
  returns void language plpgsql security definer as $$
declare action_record record; user_role text; v_tenant_id bigint;
begin
  v_tenant_id := coalesce(p_tenant_id, current_tenant_id());
  select role into user_role from profiles where id = target_user_id and tenant_id = v_tenant_id;
  if user_role in ('band', 'admin') then return; end if;
  select * into action_record from stamp_actions where trigger_key = action_trigger_key and is_active = true and tenant_id = v_tenant_id;
  if action_record is null then return; end if;
  insert into stamp_transactions (user_id, action_id, points, description, awarded_by, tenant_id) values (target_user_id, action_record.id, action_record.points, action_record.name, awarded_by_id, v_tenant_id);
  update profiles set stamp_count = stamp_count + action_record.points, stamp_level = case when stamp_count + action_record.points >= 500 then 'stamped' when stamp_count + action_record.points >= 300 then 'inner_sleeve' when stamp_count + action_record.points >= 150 then 'deep_cut' when stamp_count + action_record.points >= 50 then 'b_side' else 'first_press' end where id = target_user_id and tenant_id = v_tenant_id;
end; $$;

create or replace function public.checkin_show(p_show_id uuid, p_code text, p_tenant_id bigint default null)
  returns text language plpgsql security definer as $$
declare v_checkin_code text; v_already boolean; v_tenant_id bigint;
begin
  v_tenant_id := coalesce(p_tenant_id, current_tenant_id());
  select checkin_code into v_checkin_code from shows where id = p_show_id and tenant_id = v_tenant_id;
  if v_checkin_code is null or v_checkin_code = '' then return 'no_code'; end if;
  if upper(v_checkin_code) != upper(p_code) then return 'wrong_code'; end if;
  select exists(select 1 from show_attendance where show_id = p_show_id and user_id = auth.uid() and tenant_id = v_tenant_id) into v_already;
  if v_already then return 'already'; end if;
  insert into show_attendance (show_id, user_id, tenant_id) values (p_show_id, auth.uid(), v_tenant_id);
  update profiles set show_count = coalesce(show_count, 0) + 1 where id = auth.uid() and tenant_id = v_tenant_id;
  perform award_stamps(target_user_id := auth.uid(), action_trigger_key := 'show_attended', awarded_by_id := null, p_tenant_id := v_tenant_id);
  return 'success';
end; $$;

create or replace function public.process_referral(referrer_code text, p_tenant_id bigint default null)
  returns void language plpgsql security definer as $$
declare referrer_id uuid; v_tenant_id bigint;
begin
  v_tenant_id := coalesce(p_tenant_id, current_tenant_id());
  select id into referrer_id from profiles where referral_code = referrer_code and tenant_id = v_tenant_id;
  if referrer_id is null then return; end if;
  if referrer_id = auth.uid() then return; end if;
  if exists (select 1 from profiles where id = auth.uid() and referred_by is not null and tenant_id = v_tenant_id) then return; end if;
  update profiles set referred_by = referrer_id where id = auth.uid() and tenant_id = v_tenant_id;
  update profiles set referral_count = referral_count + 1 where id = referrer_id and tenant_id = v_tenant_id;
  perform award_stamps(auth.uid(), 'referral_completed', null, v_tenant_id);
  perform award_stamps(referrer_id, 'referral_completed', null, v_tenant_id);
end; $$;

create or replace function public.create_notification(target_user_id uuid, notif_type text, notif_title text, notif_body text default null, notif_link text default null, p_tenant_id bigint default null)
  returns void language plpgsql security definer as $$
declare v_tenant_id bigint;
begin
  v_tenant_id := coalesce(p_tenant_id, current_tenant_id());
  if target_user_id = auth.uid() then return; end if;
  insert into notifications (user_id, type, title, body, link, tenant_id) values (target_user_id, notif_type, notif_title, notif_body, notif_link, v_tenant_id);
end; $$;

create or replace function public.auto_create_reward_claims()
  returns trigger language plpgsql security definer as $$
declare tier record;
begin
  if new.stamp_count > coalesce(old.stamp_count, 0) then
    for tier in select * from reward_tiers where is_active = true and reward_type is not null and reward_type != '' and stamps <= new.stamp_count and tenant_id = new.tenant_id loop
      insert into reward_claims (user_id, level_key, reward_type, status, tenant_id) values (new.id, tier.key, tier.reward_type, 'pending', new.tenant_id) on conflict (tenant_id, user_id, level_key) do nothing;
    end loop;
  end if;
  return new;
end; $$;

create trigger trg_auto_reward_claims
  after update of stamp_count on profiles
  for each row execute function auto_create_reward_claims();

-- =================================================================
-- SEED: The Stamps (tenant_id = 1)
-- =================================================================
insert into tenants (slug, name, custom_domain) values ('the-stamps', 'The Stamps', 'stamps-land.com');

insert into tenant_config (tenant_id, key, value)
select t.id, cfg.key, cfg.value from tenants t,
(values ('site_title','Stamps Land'),('site_tagline','The official home of The Stamps'),('meta_description','Stamps Land — music, merch, and community for fans of The Stamps'),('color_ink','#1A1A1A'),('color_cream','#F5F0E8'),('color_surface','#FFFFFF'),('color_ruby','#C41E3A'),('color_blush','#F2D7D5'),('color_hot_pink','#FF69B4'),('color_warm_gold','#D4A017'),('color_slate','#708090'),('color_border','#E0D8CC'),('spotify_embed_url_1','https://open.spotify.com/embed/'),('link_spotify','https://open.spotify.com/artist/'),('link_apple_music','https://music.apple.com/'),('link_youtube_music','https://music.youtube.com/'),('link_bandcamp','https://thestamps.bandcamp.com'),('link_soundcloud','https://soundcloud.com/thestamps'),('link_instagram','https://instagram.com/thestamps'),('link_twitter','https://twitter.com/thestamps'),('link_facebook','https://facebook.com/thestamps'),('link_tiktok','https://tiktok.com/@thestamps'),('resend_from_address','hello@stamps-land.com'),('resend_sending_domain','stamps-land.com')
) as cfg (key, value) where t.slug = 'the-stamps';

insert into tenant_members (tenant_id, slug, name, accent_color, display_order)
select t.id, m.slug, m.name, m.accent_color, m.display_order from tenants t,
(values ('sofia','Sofia','#C41E3A',1),('scarlett','Scarlett','#FF69B4',2),('rubina','Rubina','#D4A017',3)
) as m (slug, name, accent_color, display_order) where t.slug = 'the-stamps';
