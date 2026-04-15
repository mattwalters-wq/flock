import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';

const SUPER_ADMIN_ID = '5cdcf898-6bda-42b7-860e-0964562c9c22';

export async function POST(request) {
  try {
    const { userIds, requestingUserId } = await request.json();

    // Only super admin can call this
    if (requestingUserId !== SUPER_ADMIN_ID) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!userIds?.length) return NextResponse.json({ emails: {} });

    const db = getServiceSupabase();
    const emailMap = {};
    const idSet = new Set(userIds);

    let page = 1;
    while (true) {
      const { data: usersPage, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !usersPage?.users?.length) break;
      usersPage.users.forEach(u => { if (idSet.has(u.id)) emailMap[u.id] = u.email; });
      if (usersPage.users.length < 1000) break;
      page++;
    }

    return NextResponse.json({ emails: emailMap });
  } catch (err) {
    console.error('[user-emails] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
