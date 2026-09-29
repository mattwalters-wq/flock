import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const HEX_RE = /^#[0-9a-f]{3,8}$/i;
// Subdomains that must never become a community (infra, auth, marketing).
const RESERVED_SLUGS = new Set([
  'www', 'app', 'api', 'admin', 'dashboard', 'auth', 'login', 'mail', 'email', 'smtp', 'ftp',
  'static', 'assets', 'cdn', 'status', 'help', 'support', 'blog', 'docs', 'dev', 'staging',
  'test', 'start', 'onboarding', 'billing', 'flock', 'root', 'security', 'abuse', 'postmaster',
]);
const clip = (v, n) => String(v ?? '').trim().slice(0, n);

export async function POST(request) {
  let db;
  let userId = null;
  let tenantId = null;
  try {
    const { account, community, branding = {}, currency, members = {}, referralCode } = await request.json();

    // ── Validate everything before creating anything ─────────────────────────
    const email = clip(account?.email, 320).toLowerCase();
    const password = String(account?.password || '');
    const fullName = clip(account?.fullName, 80);
    const slug = clip(community?.slug, 40).toLowerCase();
    const name = clip(community?.name, 80);
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'please enter a valid email' }, { status: 400 });
    if (password.length < 8 || password.length > 72) return NextResponse.json({ error: 'password must be 8-72 characters' }, { status: 400 });
    if (!fullName) return NextResponse.json({ error: 'please enter your name' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'please enter a community name' }, { status: 400 });
    if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) {
      return NextResponse.json({ error: 'that url is not available - use letters, numbers and dashes' }, { status: 400 });
    }
    const primaryColor = HEX_RE.test(branding.primaryColor || '') ? branding.primaryColor : '#8B1A2B';
    const secondaryColor = HEX_RE.test(branding.secondaryColor || '') ? branding.secondaryColor : '#D4A5A0';

    db = getServiceClient();
    const { data: taken } = await db.from('tenants').select('id').eq('slug', slug).maybeSingle();
    if (taken) return NextResponse.json({ error: 'that url is taken - try another' }, { status: 400 });

    // 1. Create auth user
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: fullName },
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
    userId = authData.user.id;

    // 2. Create tenant. founder_deadline opens the 14-day window to lock the
    // $1/mo founder rate (drives the dashboard countdown banner).
    const { data: tenant, error: tenantError } = await db.from('tenants').insert({
      slug,
      name,
      founder_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    }).select('id').single();
    if (tenantError) throw new Error(`tenant: ${tenantError.message}`);
    tenantId = tenant.id;

    // 2b. Referral attribution + crediting (best-effort). The referral code is
    // just the referrer's slug; we store it as referred_by on the new tenant and
    // write a credit row to the referral_credits ledger (1 free month, applied
    // when paid plans launch). The UNIQUE(referred_tenant_id) constraint makes
    // the credit idempotent. Wrapped so a bogus code — or the tables not being
    // migrated yet — can never break a signup.
    const refCode = (referralCode || '').trim().toLowerCase();
    if (refCode && refCode !== slug) {
      try {
        const { data: referrer } = await db.from('tenants').select('id').eq('slug', refCode).single();
        if (referrer?.id) {
          await db.from('tenants').update({ referred_by: referrer.id }).eq('id', tenantId);
          const { error: creditError } = await db.from('referral_credits').insert({
            referrer_tenant_id: referrer.id,
            referred_tenant_id: tenantId,
            months: 1,
            note: `referred ${slug}`,
          });
          if (creditError) console.error('[onboarding] referral credit skipped:', creditError.message);
        }
      } catch (e) {
        console.error('[onboarding] referral attribution skipped:', e?.message);
      }
    }

    // 3. Tenant config
    const currencyName = clip(currency?.name, 30) || 'points';
    const currencyIcon = clip(currency?.icon, 8) || '✦';
    const { error: configError } = await db.from('tenant_config').insert([
      { tenant_id: tenantId, key: 'tagline', value: clip(community.tagline, 200) },
      { tenant_id: tenantId, key: 'color_ruby', value: primaryColor },
      { tenant_id: tenantId, key: 'color_blush', value: secondaryColor },
      { tenant_id: tenantId, key: 'site_title', value: name },
      { tenant_id: tenantId, key: 'currency_name', value: currencyName },
      { tenant_id: tenantId, key: 'currency_icon', value: currencyIcon },
    ]);
    if (configError) throw new Error(`config: ${configError.message}`);

    // 4. Members
    const toSlug = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'artist';
    const memberColor = (c) => (HEX_RE.test(c || '') ? c : primaryColor);
    const rawMembers = Array.isArray(members.members) ? members.members.slice(0, 20) : [];
    const memberList = members.actType === 'solo'
      ? [{ name: clip(rawMembers[0]?.name, 80) || fullName, slug: toSlug(clip(rawMembers[0]?.name, 80) || fullName), accent_color: memberColor(rawMembers[0]?.color), display_order: 0, tenant_id: tenantId }]
      : rawMembers.filter(m => clip(m?.name, 80)).map((m, i) => ({ name: clip(m.name, 80), slug: toSlug(clip(m.name, 80)), accent_color: memberColor(m.color), display_order: i, tenant_id: tenantId }));
    if (memberList.length > 0) {
      const { error: membersError } = await db.from('tenant_members').insert(memberList);
      if (membersError) console.error('[onboarding] members skipped:', membersError.message);
    }

    // 5. Admin profile
    const { error: profileError } = await db.from('profiles').insert({ id: userId, tenant_id: tenantId, display_name: fullName, role: 'admin', stamp_count: 0, stamp_level: 'first_press', email_notifications: true });
    if (profileError) throw new Error(`profile: ${profileError.message}`);

    // 5b. Seed a welcome post so the community feed and the highlights (link-in-bio)
    // page aren't empty on day one. Flagged is_highlight so it shows on highlights,
    // and pinned to the top of the feed. It's a normal post the artist can edit or
    // delete, and keeps a brand-new site from looking abandoned to the first fans.
    // Best-effort: a failure here must never break an otherwise successful signup.
    try {
      await db.from('posts').insert({
        tenant_id: tenantId,
        author_id: userId,
        content: `welcome to ${name} ✦ this is home base. exclusive posts, show check-ins, and rewards for the people who show up early. this first post is yours: edit it or delete it and make it your own.`,
        feed_type: 'community',
        is_highlight: true,
        is_pinned: true,
        tag: 'general',
      });
    } catch (e) {
      console.error('[onboarding] welcome post skipped:', e?.message);
    }

    // 6. Stamp actions (using currency name)
    await db.from('stamp_actions').insert([
      { name: `Post in community`, points: 5, action_type: 'auto', trigger_key: 'post_created', is_active: true, tenant_id: tenantId },
      { name: `Comment on a post`, points: 2, action_type: 'auto', trigger_key: 'comment_created', is_active: true, tenant_id: tenantId },
      { name: `Daily check-in`, points: 3, action_type: 'auto', trigger_key: 'daily_login', is_active: true, tenant_id: tenantId },
      { name: `Attend a show`, points: 50, action_type: 'manual', trigger_key: 'show_attended', is_active: true, tenant_id: tenantId },
      { name: `Refer a friend`, points: 25, action_type: 'auto', trigger_key: 'referral_completed', is_active: true, tenant_id: tenantId },
    ]);

    // 7. Reward tiers
    await db.from('reward_tiers').insert([
      { key: 'first_press', name: 'First Press', stamps: 0, icon: '◐', reward_desc: `welcome to the community`, sort_order: 0, is_active: true, tenant_id: tenantId },
      { key: 'b_side', name: 'B-Side', stamps: 50, icon: '◑', reward_type: 'postcard', reward_desc: 'handwritten digital postcard from the artist', sort_order: 1, is_active: true, tenant_id: tenantId },
      { key: 'deep_cut', name: 'Deep Cut', stamps: 150, icon: '●', reward_type: 'tshirt', reward_desc: 'exclusive community t-shirt', sort_order: 2, is_active: true, tenant_id: tenantId },
      { key: 'inner_sleeve', name: 'Inner Sleeve', stamps: 300, icon: '◉', reward_type: 'vinyl', reward_desc: 'signed vinyl or limited edition release', sort_order: 3, is_active: true, tenant_id: tenantId },
      { key: 'stamped', name: 'Stamped', stamps: 500, icon: '✦', reward_type: 'zoom', reward_desc: 'monthly group hangout with the artist', sort_order: 4, is_active: true, tenant_id: tenantId },
      { key: 'inner_circle', name: 'Inner Circle', stamps: 1000, icon: '♛', reward_type: 'meetgreet', reward_desc: 'meet and greet at a show', sort_order: 5, is_active: true, tenant_id: tenantId },
    ]);

    // 8. Provision Vercel subdomain
    const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN;
    const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
    if (VERCEL_TOKEN && VERCEL_PROJECT_ID) {
      await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${slug}.${process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com'}` }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, tenantId, slug });
  } catch (err) {
    console.error('[onboarding/complete] error:', err);
    // Roll back a half-created signup so the email and slug can be retried
    // (tenant delete cascades to its config/members/profile rows).
    if (db) {
      if (tenantId) await db.from('tenants').delete().eq('id', tenantId).then(() => {}, () => {});
      if (userId) await db.auth.admin.deleteUser(userId).catch(() => {});
    }
    return NextResponse.json({ error: 'something went wrong setting up your community - please try again' }, { status: 500 });
  }
}
