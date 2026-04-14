import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { email, displayName, tenantId } = await request.json();
    if (!email || !tenantId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const db = getServiceSupabase();
    const { data: tenant } = await db.from('tenants').select('name').eq('id', tenantId).single();
    const tenantName = tenant?.name || 'your community';

    const { data: configRows } = await db.from('tenant_config').select('key, value').eq('tenant_id', tenantId);
    const config = {};
    (configRows || []).forEach(({ key, value }) => { config[key] = value; });
    const welcomeMessage = config.welcome_message?.trim() || null;

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return NextResponse.json({ ok: true });

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${tenantName} <hello@fans-flock.com>`,
        to: email,
        subject: `welcome to ${tenantName} ✦`,
        html: `
          <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:0 auto;background:#F5EFE6;padding:32px 24px;border-radius:12px;">
            <div style="font-size:28px;font-weight:700;color:#1A1018;text-transform:lowercase;margin-bottom:8px;">${tenantName}</div>
            <div style="font-family:'DM Mono',monospace;font-size:10px;color:#6A5A62;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:24px;">fan community</div>
            <p style="font-size:15px;color:#1A1018;line-height:1.6;margin-bottom:16px;">hey ${displayName?.toLowerCase() || 'there'} ✦</p>
            ${welcomeMessage
              ? `<p style="font-size:14px;color:#1A1018;line-height:1.6;margin-bottom:16px;padding:16px;background:#FAF5F0;border-radius:8px;border-left:3px solid #8B1A2B;">${welcomeMessage}</p>`
              : `<p style="font-size:14px;color:#6A5A62;line-height:1.6;margin-bottom:24px;">you're in. welcome to the ${tenantName} community. earn stamps, unlock rewards, and connect with the artist and other fans.</p>`
            }
            <div style="font-family:'DM Mono',monospace;font-size:10px;color:#6A5A62;letter-spacing:1.5px;margin-top:32px;padding-top:16px;border-top:1px solid #E8DDD4;">powered by flock · fan communities for independent artists</div>
          </div>
        `,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[email/welcome] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
