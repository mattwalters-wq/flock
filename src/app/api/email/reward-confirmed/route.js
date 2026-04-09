import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { tenantId, fanEmail, fanName, rewardType, rewardDesc, levelName, shipping } = await request.json();
    if (!tenantId || !fanEmail) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return NextResponse.json({ ok: true });

    const db = getServiceSupabase();
    const { data: tenant } = await db.from('tenants').select('name, slug').eq('id', tenantId).single();
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const isPhysical = shipping && shipping.address;
    const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const communityUrl = `https://${tenant.slug}.${APP_DOMAIN}`;

    const shippingHtml = isPhysical ? `
      <div style="margin-top:16px;padding:14px 16px;background:#FAF5F0;border-radius:8px;border:1px solid #E8DDD4;">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">sending to</div>
        <div style="font-size:13px;color:#1A1018;line-height:1.8;">
          <div style="font-weight:600;">${shipping.name}</div>
          <div>${shipping.address}</div>
          <div>${shipping.city} ${shipping.postcode}</div>
          <div>${shipping.country}</div>
        </div>
      </div>
    ` : '';

    const bodyText = isPhysical
      ? `you've unlocked <strong>${rewardDesc}</strong>. we've got your details and the artist will be in touch once it's on its way.`
      : `you've unlocked <strong>${rewardDesc}</strong>. the artist has been notified and will be in touch with next steps.`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${tenant.name} <hello@fans-flock.com>`,
        to: fanEmail,
        subject: `your reward is on its way ✦`,
        html: `
          <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:0 auto;background:#F5EFE6;padding:32px 24px;border-radius:12px;">
            <div style="font-size:22px;font-weight:700;color:#1A1018;text-transform:lowercase;margin-bottom:4px;">${tenant.name}</div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:24px;">reward claimed</div>

            <p style="font-size:15px;color:#1A1018;line-height:1.6;margin-bottom:16px;">hey ${fanName?.toLowerCase() || 'there'} ✦</p>

            <div style="background:#FAF5F0;border-radius:10px;padding:16px;border:1px solid #E8DDD4;margin-bottom:16px;">
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:#C9922A;letter-spacing:1px;margin-bottom:8px;text-transform:uppercase;">${levelName}</div>
              <p style="font-size:14px;color:#1A1018;line-height:1.6;margin:0;">${bodyText}</p>
            </div>

            ${shippingHtml}

            <a href="${communityUrl}" style="display:block;padding:12px 24px;background:#8B1A2B;color:#fff;text-decoration:none;border-radius:8px;text-align:center;font-size:13px;font-weight:600;margin-top:20px;">back to community →</a>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1px;margin-top:24px;padding-top:16px;border-top:1px solid #E8DDD4;">powered by flock · fan communities for independent artists</div>
          </div>
        `,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[email/reward-confirmed] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
