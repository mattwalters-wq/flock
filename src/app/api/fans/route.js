import { NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/api-auth';
import { getAuthUserMap } from '@/lib/email';
import { selectAll } from '@/lib/supabase-server';

// Fan list (with emails) for the artist dashboard. The caller is identified
// from their access token — never from a user id in the body, which anyone
// could set to an admin's id to dump every fan's email address.
export async function POST(request) {
  try {
    const { tenantId } = await request.json();
    const { db, error } = await requireTenantAdmin(request, tenantId);
    if (error) return error;

    // Get all fan profiles
    const profiles = await selectAll(() => db.from('profiles')
      .select('id, display_name, role, city, stamp_count, stamp_level, referral_count, created_at, email_notifications, signup_city, signup_country, signup_lat, signup_lng')
      .eq('tenant_id', tenantId)
      .order('stamp_count', { ascending: false })
      .order('id'));

    // Emails + last sign-in from auth.users (paginated — one page silently
    // drops everyone past the first 1000 users), and this tenant's activity,
    // fetched in parallel.
    const [authUsers, claims, postCounts, commentCounts] = await Promise.all([
      getAuthUserMap(db),
      selectAll(() => db.from('reward_claims').select('user_id, status').eq('tenant_id', tenantId).order('id')),
      selectAll(() => db.from('posts').select('author_id').eq('tenant_id', tenantId).order('id')),
      selectAll(() => db.from('comments').select('author_id').eq('tenant_id', tenantId).order('id')),
    ]);
    const emailMap = {};
    Object.entries(authUsers).forEach(([id, u]) => { emailMap[id] = { email: u.email, last_sign_in: u.last_sign_in_at }; });

    const claimMap = {};
    if (claims) claims.forEach(c => {
      if (!claimMap[c.user_id]) claimMap[c.user_id] = [];
      claimMap[c.user_id].push(c.status);
    });

    const postMap = {};
    if (postCounts) postCounts.forEach(p => { postMap[p.author_id] = (postMap[p.author_id] || 0) + 1; });

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
    return NextResponse.json({ error: 'Could not load fans' }, { status: 500 });
  }
}
