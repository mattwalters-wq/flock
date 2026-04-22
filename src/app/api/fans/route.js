import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';

const SUPER_ADMIN_ID = '5cdcf898-6bda-42b7-860e-0964562c9c22';

export async function POST(request) {
  try {
    const { tenantId, requestingUserId } = await request.json();
    if (!tenantId || !requestingUserId) return NextResponse.json({ error: 'missing params' }, { status: 400 });

    const db = getServiceSupabase();

    // Check requesting user is admin/band or super admin
    if (requestingUserId !== SUPER_ADMIN_ID) {
      const { data: profile } = await db.from('profiles').select('role').eq('id', requestingUserId).eq('tenant_id', tenantId).single();
      if (!profile || !['admin', 'band'].includes(profile.role)) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
      }
    }

    // Get all fan profiles
    const { data: profiles } = await db.from('profiles')
      .select('id, display_name, role, city, stamp_count, stamp_level, referral_count, created_at, email_notifications')
      .eq('tenant_id', tenantId)
      .order('stamp_count', { ascending: false });

    if (!profiles) return NextResponse.json({ fans: [] });

    // Get emails from auth.users
    const { data: { users } } = await db.auth.admin.listUsers({ page: 1, perPage: 10000 });
    const emailMap = {};
    if (users) users.forEach(u => { emailMap[u.id] = { email: u.email, last_sign_in: u.last_sign_in_at }; });

    // Get reward claims for this tenant
    const { data: claims } = await db.from('reward_claims')
      .select('user_id, status')
      .eq('tenant_id', tenantId);
    const claimMap = {};
    if (claims) claims.forEach(c => {
      if (!claimMap[c.user_id]) claimMap[c.user_id] = [];
      claimMap[c.user_id].push(c.status);
    });

    // Get post counts per user
    const { data: postCounts } = await db.from('posts')
      .select('author_id')
      .eq('tenant_id', tenantId);
    const postMap = {};
    if (postCounts) postCounts.forEach(p => { postMap[p.author_id] = (postMap[p.author_id] || 0) + 1; });

    // Get comment counts per user
    const { data: commentCounts } = await db.from('comments')
      .select('author_id')
      .eq('tenant_id', tenantId);
    const commentMap = {};
    if (commentCounts) commentCounts.forEach(c => { commentMap[c.author_id] = (commentMap[c.author_id] || 0) + 1; });

    const fans = profiles.map(p => ({
      ...p,
      email: emailMap[p.id]?.email || null,
      last_sign_in: emailMap[p.id]?.last_sign_in || null,
      posts: postMap[p.id] || 0,
      comments: commentMap[p.id] || 0,
      rewards_claimed: claimMap[p.id]?.length || 0,
    }));

    return NextResponse.json({ fans });
  } catch (err) {
    console.error('[api/fans] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
