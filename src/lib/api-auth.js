// Server-side request authentication for API routes.
//
// Every route that reads private data or sends email/push on a tenant's behalf
// must identify the caller from their Supabase access token (Authorization:
// Bearer <jwt>) — never from a user id in the request body, which anyone can
// forge. The browser attaches the token via authFetch() in supabase-browser.js.
import { NextResponse } from 'next/server';
import { getServiceSupabase } from './supabase-server';
import { isGod } from './god';

export async function getRequestUser(request, db = getServiceSupabase()) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// Resolves { db, user } when the caller is an admin/band member of tenantId
// (or the platform owner); otherwise { error } holding the response to return.
export async function requireTenantAdmin(request, tenantId) {
  if (!tenantId) return { error: NextResponse.json({ error: 'Missing tenantId' }, { status: 400 }) };
  const db = getServiceSupabase();
  const user = await getRequestUser(request, db);
  if (!user) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  if (isGod(user)) return { db, user };
  const { data: profile } = await db.from('profiles')
    .select('role').eq('id', user.id).eq('tenant_id', tenantId).maybeSingle();
  if (!profile || !['admin', 'band'].includes(profile.role)) {
    return { error: NextResponse.json({ error: 'Not authorized for this community' }, { status: 403 }) };
  }
  return { db, user };
}
