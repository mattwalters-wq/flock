import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { tenantId, commentAuthorName, commentAuthorRole, commentContent, postAuthorId, postContent } = await request.json();
    if (!tenantId || !postAuthorId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return NextResponse.json({ ok: true });

    const db = getServiceSupabase();

    const { data: tenant } = await db.from('tenants').select('name, slug').eq('id', tenantId).single();
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    // Only notify if:
    // - artist commented on a fan's post (notify the fan)
    // - fan commented on an artist's post (notify the artist)
    const isArtistCommenting = ['admin', 'band'].includes(commentAuthorRole);

    // Get the post author's profile to check their role
    const { data: postAuthorProfile } = await db.from('profiles').select('role, email_notifications').eq('id', postAuthorId).eq('tenant_id', tenantId).single();
    if (!postAuthorProfile) return NextResponse.json({ ok: true });

    const postAuthorIsArtist = ['admin', 'band'].includes(postAuthorProfile.role);

    // Only send if: artist commenting on fan post, OR fan commenting on artist post (and artist has notifications on)
    if (!isArtistCommenting && !postAuthorIsArtist) return NextResponse.json({ ok: true });
    if (!isArtistCommenting && postAuthorIsArtist) {
      // fan commented on artist post - notify artist regardless of email_notifications (artists always want to know)
    }
    if (isArtistCommenting && !postAuthorProfile.email_notifications) return NextResponse.json({ ok: true });

    // Get recipient email
    const emailMap = {};
    let page = 1;
    while (true) {
      const { data: pageUsers } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (!pageUsers?.users?.length) break;
      pageUsers.users.forEach(u => { if (u.id === postAuthorId) emailMap[u.id] = u.email; });
      if (pageUsers.users.length < 1000) break;
      page++;
    }

    const recipientEmail = emailMap[postAuthorId];
    if (!recipientEmail) return NextResponse.json({ ok: true });

    const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const communityUrl = `https://${tenant.slug}.${APP_DOMAIN}`;

    const subject = isArtistCommenting
      ? `${commentAuthorName?.toLowerCase() || tenant.name.toLowerCase()} replied to your post ✦`
      : `new comment on your post ✦`;

    const intro = isArtistCommenting
      ? `<strong>${commentAuthorName?.toLowerCase() || 'the artist'}</strong> replied to your post in the ${tenant.name} community.`
      : `someone commented on your post in the ${tenant.name} community.`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${tenant.name} <hello@fans-flock.com>`,
        to: recipientEmail,
        subject,
        html: `
          <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:0 auto;background:#F5EFE6;padding:32px 24px;border-radius:12px;">
            <div style="font-size:22px;font-weight:700;color:#1A1018;text-transform:lowercase;margin-bottom:20px;">${tenant.name}</div>

            <p style="font-size:14px;color:#1A1018;line-height:1.6;margin-bottom:16px;">${intro}</p>

            ${postContent ? `
            <div style="background:#FAF5F0;border-radius:10px;padding:14px 16px;border:1px solid #E8DDD4;margin-bottom:12px;">
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1px;margin-bottom:6px;text-transform:uppercase;">your post</div>
              <p style="font-size:13px;color:#6A5A62;line-height:1.5;margin:0;">${postContent.slice(0, 150)}${postContent.length > 150 ? '...' : ''}</p>
            </div>
            ` : ''}

            <div style="background:#FAF5F0;border-radius:10px;padding:14px 16px;border-left:3px solid #8B1A2B;border-right:1px solid #E8DDD4;border-top:1px solid #E8DDD4;border-bottom:1px solid #E8DDD4;margin-bottom:20px;">
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:#8B1A2B;letter-spacing:1px;margin-bottom:6px;text-transform:uppercase;">${commentAuthorName?.toLowerCase() || 'comment'}</div>
              <p style="font-size:14px;color:#1A1018;line-height:1.6;margin:0;">${commentContent?.slice(0, 300)}${commentContent?.length > 300 ? '...' : ''}</p>
            </div>

            <a href="${communityUrl}" style="display:block;padding:12px 24px;background:#8B1A2B;color:#fff;text-decoration:none;border-radius:8px;text-align:center;font-size:13px;font-weight:600;">reply in community →</a>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1.5px;margin-top:24px;padding-top:16px;border-top:1px solid #E8DDD4;">powered by flock · fan communities for independent artists</div>
          </div>
        `,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[email/comment-notification] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
