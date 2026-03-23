import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request) {
  try {
    const { account, community, branding, currency, members } = await request.json();
    const db = getServiceClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { display_name: account.fullName },
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
    const userId = authData.user.id;

    // 2. Create tenant
    const { data: tenant, error: tenantError } = await db.from('tenants').insert({ slug: community.slug, name: community.name }).select('id').single();
    if (tenantError) { console.error('[onboarding] tenant error:', tenantError); return NextResponse.json({ error: tenantError.message }, { status: 400 }); }
    const tenantId = tenant.id;

    // 3. Tenant config
    const currencyName = currency?.name || 'points';
    const currencyIcon = currency?.icon || '✦';
    await db.from('tenant_config').insert([
      { tenant_id: tenantId, key: 'tagline', value: community.tagline || '' },
      { tenant_id: tenantId, key: 'color_ruby', value: branding.primaryColor },
      { tenant_id: tenantId, key: 'color_blush', value: branding.secondaryColor },
      { tenant_id: tenantId, key: 'site_title', value: community.name },
      { tenant_id: tenantId, key: 'currency_name', value: currencyName },
      { tenant_id: tenantId, key: 'currency_icon', value: currencyIcon },
    ]);

    // 4. Members
    const memberList = members.actType === 'solo'
      ? [{ name: members.members[0]?.name || account.fullName, slug: (members.members[0]?.name || account.fullName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'artist', accent_color: members.members[0]?.color || branding.primaryColor, display_order: 0, tenant_id: tenantId }]
      : (members.members || []).filter(m => m.name?.trim()).map((m, i) => ({ name: m.name.trim(), slug: m.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), accent_color: m.color || branding.primaryColor, display_order: i, tenant_id: tenantId }));
    if (memberList.length > 0) await db.from('tenant_members').insert(memberList);

    // 5. Admin profile
    await db.from('profiles').insert({ id: userId, tenant_id: tenantId, display_name: account.fullName, role: 'admin', stamp_count: 0, stamp_level: 'first_press', email_notifications: true });

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
        body: JSON.stringify({ name: `${community.slug}.${process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com'}` }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, tenantId, slug: community.slug });
  } catch (err) {
    console.error('[onboarding/complete] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
