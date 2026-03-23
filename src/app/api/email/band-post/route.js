import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { tenantId, authorName, content, feedType } = await request.json();
    if (!tenantId) return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return NextResponse.json({ ok: true });

    const db = getServiceSupabase();

    // Get tenant info
    const { data: tenant } = await db.from('tenants').select('name, slug').eq('id', tenantId).single();
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    // Get all fans with email notifications on
    const { data: subscribers } = await db
      .from('profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email_notifications', true)
      .eq('role', 'fan');

    if (!subscribers || subscribers.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    // Get emails from auth.users
    const userIds = subscribers.map(s => s.id);
    const { data: users } = await db.auth.admin.listUsers();
    const emailMap = {};
    (users?.users || []).forEach(u => { emailMap[u.id] = u.email; });

    const emails = userIds.map(id => emailMap[id]).filter(Boolean);
    const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const communityUrl = `https://${tenant.slug}.${APP_DOMAIN}`;

    let sent = 0;
    for (const email of emails) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${tenant.name} <hello@fans-flock.com>`,
          to: email,
          subject: `new post from ${authorName?.toLowerCase() || tenant.name.toLowerCase()} ✦`,
          html: `
            <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:0 auto;background:#F5EFE6;padding:32px 24px;border-radius:12px;">
              <div style="font-size:22px;font-weight:700;color:#1A1018;text-transform:lowercase;margin-bottom:20px;">${tenant.name}</div>
              <div style="background:#FAF5F0;border-radius:10px;padding:20px;border:1px solid #E8DDD4;margin-bottom:20px;">
                <div style="font-family:'DM Mono',monospace;font-size:10px;color:#8B1A2B;margin-bottom:8px;">${authorName?.toLowerCase() || 'the artist'} · ${feedType || 'community'}</div>
                <p style="font-size:14px;color:#1A1018;line-height:1.6;margin:0;">${content?.slice(0, 300)}${content?.length > 300 ? '...' : ''}</p>
              </div>
              <a href="${communityUrl}" style="display:block;padding:12px 24px;background:#8B1A2B;color:#fff;text-decoration:none;border-radius:8px;text-align:center;font-size:13px;font-weight:600;">read in community →</a>
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1.5px;margin-top:24px;padding-top:16px;border-top:1px solid #E8DDD4;">powered by flock · fan communities for independent artists</div>
            </div>
          `,
        }),
      }).catch(() => {});
      sent++;
    }

    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error('[email/band-post] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
