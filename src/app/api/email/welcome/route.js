import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';
import { getRequestUser } from '@/lib/api-auth';
import { escapeHtml, fromHeader } from '@/lib/email';

// Welcome email for a fan who just joined. Sent only to the authenticated
// caller's own address (from their access token) — never to an address in the
// request body, which would let anyone use this route to email strangers.
export async function POST(request) {
  try {
    const { tenantId } = await request.json();
    if (!tenantId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const db = getServiceSupabase();
    const user = await getRequestUser(request, db);
    if (!user?.email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // One welcome per account, and only for a brand-new member of this tenant.
    const { data: profile } = await db.from('profiles')
      .select('display_name, created_at').eq('id', user.id).eq('tenant_id', tenantId).maybeSingle();
    if (!profile) return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 });
    if (Date.now() - new Date(profile.created_at).getTime() > 15 * 60 * 1000) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const { data: tenant } = await db.from('tenants').select('name').eq('id', tenantId).single();
    const tenantName = tenant?.name || 'your community';
    const displayName = profile.display_name || user.user_metadata?.display_name || '';

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return NextResponse.json({ ok: true });

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromHeader(tenantName),
        to: user.email,
        subject: `welcome to ${tenantName} ✦`,
        html: `
          <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:0 auto;background:#F5EFE6;padding:32px 24px;border-radius:12px;">
            <div style="font-size:28px;font-weight:700;color:#1A1018;text-transform:lowercase;margin-bottom:8px;">${escapeHtml(tenantName)}</div>
            <div style="font-family:'DM Mono',monospace;font-size:10px;color:#6A5A62;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:24px;">fan community</div>
            <p style="font-size:15px;color:#1A1018;line-height:1.6;margin-bottom:16px;">hey ${escapeHtml(displayName.toLowerCase() || 'there')} ✦</p>
            <p style="font-size:14px;color:#6A5A62;line-height:1.6;margin-bottom:24px;">you're in. welcome to the ${escapeHtml(tenantName)} community. earn stamps, unlock rewards, and connect with the artist and other fans.</p>
            <div style="font-family:'DM Mono',monospace;font-size:10px;color:#6A5A62;letter-spacing:1.5px;margin-top:32px;padding-top:16px;border-top:1px solid #E8DDD4;">powered by flock · fan communities for independent artists</div>
          </div>
        `,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[email/welcome] error:', err);
    return NextResponse.json({ error: 'Could not send welcome email' }, { status: 500 });
  }
}
