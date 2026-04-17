import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { tenantId, senderId, recipientId, content } = await request.json();
    if (!tenantId || !senderId || !recipientId) return NextResponse.json({ ok: true });

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return NextResponse.json({ ok: true });

    const db = getServiceSupabase();

    const [{ data: tenant }, { data: senderProfile }, { data: recipientProfile }] = await Promise.all([
      db.from('tenants').select('name, slug').eq('id', tenantId).single(),
      db.from('profiles').select('display_name, role').eq('id', senderId).eq('tenant_id', tenantId).single(),
      db.from('profiles').select('display_name, email_notifications').eq('id', recipientId).eq('tenant_id', tenantId).single(),
    ]);

    if (!tenant || !recipientProfile?.email_notifications) return NextResponse.json({ ok: true });

    // Get recipient email
    const { data: { users } } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const recipientUser = users?.find(u => u.id === recipientId);
    if (!recipientUser?.email) return NextResponse.json({ ok: true });

    const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const communityUrl = `https://${tenant.slug}.${APP_DOMAIN}`;
    const senderName = senderProfile?.display_name?.toLowerCase() || 'the artist';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${tenant.name} <hello@fans-flock.com>`,
        to: recipientUser.email,
        subject: `new message from ${senderName} ✦`,
        html: `
          <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:0 auto;background:#F5EFE6;padding:32px 24px;border-radius:12px;">
            <div style="font-size:22px;font-weight:700;color:#1A1018;text-transform:lowercase;margin-bottom:20px;">${tenant.name}</div>
            <div style="background:#FAF5F0;border-radius:10px;padding:20px;border:1px solid #E8DDD4;margin-bottom:20px;">
              <div style="font-family:'DM Mono',monospace;font-size:10px;color:#8B1A2B;margin-bottom:8px;">${senderName} sent you a message</div>
              ${content ? `<p style="font-size:14px;color:#1A1018;line-height:1.6;margin:0;">${content.slice(0, 200)}${content.length > 200 ? '...' : ''}</p>` : '<p style="font-size:14px;color:#6A5A62;margin:0;">sent you a photo</p>'}
            </div>
            <a href="${communityUrl}" style="display:block;padding:12px 24px;background:#8B1A2B;color:#fff;text-decoration:none;border-radius:8px;text-align:center;font-size:13px;font-weight:600;">reply in community →</a>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1px;margin-top:24px;padding-top:16px;border-top:1px solid #E8DDD4;">powered by flock</div>
          </div>
        `,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[email/new-message] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
