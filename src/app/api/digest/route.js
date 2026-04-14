import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { tenantId, customIntro } = await request.json();
    if (!tenantId) return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return NextResponse.json({ error: 'No Resend key configured' }, { status: 500 });

    const db = getServiceSupabase();
    const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';

    const { data: tenant } = await db.from('tenants').select('name, slug').eq('id', tenantId).single();
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    // Get recent posts
    const { data: recentPosts } = await db.from('posts').select('content, feed_type, created_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5);

    // Get upcoming shows
    const today = new Date().toISOString().slice(0, 10);
    const { data: upcomingShows } = await db.from('shows').select('date, city, venue, status').eq('tenant_id', tenantId).gte('date', today).order('date').limit(3);

    // Get top collectors
    const { data: topFans } = await db.from('profiles').select('display_name, stamp_count').eq('tenant_id', tenantId).eq('role', 'fan').order('stamp_count', { ascending: false }).limit(5);

    // Get subscribers
    const { data: subscribers } = await db.from('profiles').select('id').eq('tenant_id', tenantId).eq('email_notifications', true).eq('role', 'fan');
    if (!subscribers || subscribers.length === 0) return NextResponse.json({ ok: true, sent: 0, total: 0 });

    const emailMap = {};
    let digestPage = 1;
    while (true) {
      const { data: pageUsers } = await db.auth.admin.listUsers({ page: digestPage, perPage: 1000 });
      if (!pageUsers?.users?.length) break;
      pageUsers.users.forEach(u => { emailMap[u.id] = u.email; });
      if (pageUsers.users.length < 1000) break;
      digestPage++;
    }
    const emails = subscribers.map(s => emailMap[s.id]).filter(Boolean);

    const communityUrl = `https://${tenant.slug}.${APP_DOMAIN}`;

    const postsHtml = (recentPosts || []).map(p => `
      <div style="padding:14px 0;border-bottom:1px solid #E8DDD4;">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:#8B1A2B;margin-bottom:6px;letter-spacing:0.5px;">${p.feed_type}</div>
        <p style="font-size:13px;color:#1A1018;line-height:1.5;margin:0;">${p.content?.slice(0, 200)}${p.content?.length > 200 ? '...' : ''}</p>
      </div>
    `).join('');

    const showsHtml = (upcomingShows || []).map(s => `
      <div style="padding:10px 0;border-bottom:1px solid #E8DDD4;display:flex;gap:12px;">
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:#6A5A62;min-width:60px;">${new Date(s.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div>
        <div><div style="font-size:13px;font-weight:600;color:#1A1018;">${s.city}</div><div style="font-size:11px;color:#6A5A62;">${s.venue}</div></div>
      </div>
    `).join('');

    const leaderboardHtml = (topFans || []).map((f, i) => `
      <div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #E8DDD4;">
        <span style="font-family:'DM Mono',monospace;font-size:11px;color:${i === 0 ? '#C9922A' : '#6A5A62'};width:20px;">${i + 1}</span>
        <span style="flex:1;font-size:12px;color:#1A1018;">${f.display_name}</span>
        <span style="font-family:'DM Mono',monospace;font-size:11px;color:#6A5A62;">${f.stamp_count} ✦</span>
      </div>
    `).join('');

    let sent = 0;
    for (const email of emails) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${tenant.name} <hello@fans-flock.com>`,
          to: email,
          subject: `${tenant.name.toLowerCase()} · community roundup ✦`,
          html: `
            <div style="font-family:'DM Sans',sans-serif;max-width:520px;margin:0 auto;background:#F5EFE6;padding:32px 24px;border-radius:12px;">
              <div style="font-size:24px;font-weight:700;color:#1A1018;text-transform:lowercase;margin-bottom:4px;">${tenant.name}</div>
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:24px;">community roundup</div>

              ${customIntro ? `<p style="font-size:14px;color:#1A1018;line-height:1.6;margin-bottom:24px;padding:16px;background:#FAF5F0;border-radius:8px;border-left:3px solid #8B1A2B;">${customIntro}</p>` : ''}

              ${recentPosts?.length ? `
                <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">recent posts</div>
                <div style="background:#FAF5F0;border-radius:10px;padding:0 16px;border:1px solid #E8DDD4;margin-bottom:24px;">${postsHtml}</div>
              ` : ''}

              ${upcomingShows?.length ? `
                <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">upcoming shows</div>
                <div style="background:#FAF5F0;border-radius:10px;padding:0 16px;border:1px solid #E8DDD4;margin-bottom:24px;">${showsHtml}</div>
              ` : ''}

              ${topFans?.length ? `
                <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">top collectors</div>
                <div style="background:#FAF5F0;border-radius:10px;padding:0 16px;border:1px solid #E8DDD4;margin-bottom:24px;">${leaderboardHtml}</div>
              ` : ''}

              <a href="${communityUrl}" style="display:block;padding:14px 24px;background:#8B1A2B;color:#fff;text-decoration:none;border-radius:8px;text-align:center;font-size:14px;font-weight:600;margin-bottom:24px;">visit community →</a>
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1px;border-top:1px solid #E8DDD4;padding-top:16px;">powered by flock · fan communities for independent artists</div>
            </div>
          `,
        }),
      }).catch(() => {});
      sent++;
    }

    return NextResponse.json({ ok: true, sent, total: emails.length });
  } catch (err) {
    console.error('[digest] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
