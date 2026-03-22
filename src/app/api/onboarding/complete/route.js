import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { account, community, branding, members } = await request.json();

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

        console.log('[onboarding] key prefix:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20));
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
    const { data: tenant, error: tenantError } = await db.from('tenants').insert({
      slug: community.slug,
      name: community.name,
      custom_domain: null,
    }).select('id').single();

    if (tenantError) return NextResponse.json({ error: tenantError.message }, { status: 400 });
    const tenantId = tenant.id;

    // 3. Insert tenant config
    const configRows = [
      { tenant_id: tenantId, key: 'tagline', value: community.tagline || '' },
      { tenant_id: tenantId, key: 'color_ruby', value: branding.primaryColor },
      { tenant_id: tenantId, key: 'color_blush', value: branding.secondaryColor },
      { tenant_id: tenantId, key: 'site_title', value: community.name },
    ];
    await db.from('tenant_config').insert(configRows);

    // 4. Insert members
    const memberList = members.actType === 'solo'
      ? [{ name: members.members[0]?.name || account.fullName, slug: (members.members[0]?.name || account.fullName).toLowerCase().replace(/[^a-z0-9]+/g, '-'), accent_color: members.members[0]?.color || branding.primaryColor, display_order: 0 }]
      : (members.members || []).filter(m => m.name?.trim()).map((m, i) => ({ name: m.name.trim(), slug: m.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'), accent_color: m.color || branding.primaryColor, display_order: i }));

    if (memberList.length > 0) {
      await db.from('tenant_members').insert(memberList.map(m => ({ ...m, tenant_id: tenantId })));
    }

    // 5. Create profile for this user as admin
    await db.from('profiles').insert({
      id: userId,
      tenant_id: tenantId,
      display_name: account.fullName,
      role: 'admin',
      stamp_count: 0,
      stamp_level: 'first_press',
      email_notifications: true,
    });

    // 6. Seed default stamp actions
    const defaultActions = [
      { name: 'Post in community', description: 'Create a post', points: 5, action_type: 'auto', trigger_key: 'post_created', is_active: true },
      { name: 'Comment on a post', description: 'Leave a comment', points: 2, action_type: 'auto', trigger_key: 'comment_created', is_active: true },
      { name: 'Daily check-in', description: 'Log in each day', points: 3, action_type: 'auto', trigger_key: 'daily_login', is_active: true },
      { name: 'Attend a show', description: 'Check in at a show', points: 50, action_type: 'manual', trigger_key: 'show_attended', is_active: true },
      { name: 'Refer a friend', description: 'Invite someone who signs up', points: 25, action_type: 'auto', trigger_key: 'referral_completed', is_active: true },
    ];
    await db.from('stamp_actions').insert(defaultActions.map(a => ({ ...a, tenant_id: tenantId })));

    // 7. Seed default reward tiers
    const defaultTiers = [
      { key: 'first_press', name: 'First Press', stamps: 0, icon: '◐', reward_type: null, reward_desc: 'welcome to the community', sort_order: 0, is_active: true },
      { key: 'b_side', name: 'B-Side', stamps: 50, icon: '◑', reward_type: 'postcard', reward_desc: 'handwritten digital postcard from the artist', sort_order: 1, is_active: true },
      { key: 'deep_cut', name: 'Deep Cut', stamps: 150, icon: '●', reward_type: 'tshirt', reward_desc: 'exclusive community t-shirt', sort_order: 2, is_active: true },
      { key: 'inner_sleeve', name: 'Inner Sleeve', stamps: 300, icon: '◉', reward_type: 'vinyl', reward_desc: 'signed vinyl or limited edition release', sort_order: 3, is_active: true },
      { key: 'stamped', name: 'Stamped', stamps: 500, icon: '✦', reward_type: 'zoom', reward_desc: 'monthly group hangout with the artist', sort_order: 4, is_active: true },
      { key: 'inner_circle', name: 'Inner Circle', stamps: 1000, icon: '♛', reward_type: 'meetgreet', reward_desc: 'meet and greet at a show', sort_order: 5, is_active: true },
    ];
    await db.from('reward_tiers').insert(defaultTiers.map(t => ({ ...t, tenant_id: tenantId })));

    // 8. Add subdomain to Vercel if API token is set
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
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
