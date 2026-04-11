import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { tenantId, fanName, fanEmail, rewardType, rewardDesc, levelName, shipping } = await request.json();
    if (!tenantId) return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return NextResponse.json({ ok: true });

    const db = getServiceSupabase();

    const { data: tenant } = await db.from('tenants').select('name, slug').eq('id', tenantId).single();
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    // Get artist email from profiles (role = admin or band)
    const { data: artistProfiles } = await db.from('profiles').select('id').eq('tenant_id', tenantId).in('role', ['admin', 'band']);
    if (!artistProfiles?.length) return NextResponse.json({ ok: true });

    const emailMap = {};
    let rPage = 1;
    while (true) {
      const { data: pageUsers } = await db.auth.admin.listUsers({ page: rPage, perPage: 1000 });
      if (!pageUsers?.users?.length) break;
      pageUsers.users.forEach(u => { if (artistIds.has(u.id)) emailMap[u.id] = u.email; });
      if (pageUsers.users.length < 1000) break;
      rPage++;
    }
    const artistEmails = Object.values(emailMap).filter(Boolean);
    if (!artistEmails.length) return NextResponse.json({ ok: true });

    const isPhysical = shipping && shipping.address;
    const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const dashboardUrl = `https://${tenant.slug}.${APP_DOMAIN}/dashboard?tab=rewards`;

    const shippingHtml = isPhysical ? `
      <div style="margin-top:16px;padding:14px 16px;background:#FAF5F0;border-radius:8px;border:1px solid #E8DDD4;">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">shipping details</div>
        <div style="font-size:13px;color:#1A1018;line-height:1.8;">
          <div style="font-weight:600;">${shipping.name}</div>
          <div>${shipping.address}</div>
          <div>${shipping.city} ${shipping.postcode}</div>
          <div>${shipping.country}</div>
        </div>
      </div>
    ` : '';

    for (const artistEmail of artistEmails) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `flock · ${tenant.name} <hello@fans-flock.com>`,
          to: artistEmail,
          subject: `${fanName?.toLowerCase() || 'a fan'} just claimed a reward ✦`,
          html: `
            <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:0 auto;background:#F5EFE6;padding:32px 24px;border-radius:12px;">
              <div style="font-size:22px;font-weight:700;color:#1A1018;text-transform:lowercase;margin-bottom:4px;">${tenant.name}</div>
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:24px;">reward claim</div>

              <div style="background:#FAF5F0;border-radius:10px;padding:16px;border:1px solid #E8DDD4;margin-bottom:20px;">
                <div style="font-family:'DM Mono',monospace;font-size:9px;color:#8B1A2B;letter-spacing:1px;margin-bottom:8px;text-transform:uppercase;">${levelName} · ${rewardType}</div>
                <div style="font-size:15px;font-weight:600;color:#1A1018;margin-bottom:4px;">${fanName?.toLowerCase() || 'a fan'}</div>
                <div style="font-size:13px;color:#6A5A62;">${rewardDesc}</div>
                ${fanEmail ? `<div style="font-family:'DM Mono',monospace;font-size:11px;color:#6A5A62;margin-top:8px;">${fanEmail}</div>` : ''}
              </div>

              ${shippingHtml}

              <a href="${dashboardUrl}" style="display:block;padding:12px 24px;background:#8B1A2B;color:#fff;text-decoration:none;border-radius:8px;text-align:center;font-size:13px;font-weight:600;margin-top:20px;">review in dashboard →</a>
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1px;margin-top:24px;padding-top:16px;border-top:1px solid #E8DDD4;">powered by flock · fan communities for independent artists</div>
            </div>
          `,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[email/reward-claimed] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
