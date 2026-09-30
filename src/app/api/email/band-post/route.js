import { NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/api-auth';
import { selectAll } from '@/lib/supabase-server';
import { getUserEmailMap, sendResendBatch, escapeHtml, fromHeader } from '@/lib/email';
import webpush from 'web-push';
import { isTrustedPushEndpoint } from '@/lib/push-endpoint';

// Notifies opted-in fans (email + web push) that the artist posted. Admin/band
// (or god) only, authenticated from the caller's access token. The post is
// loaded from the database by id rather than trusting content from the body,
// so this can't be used to push arbitrary text to a community's fans.
export async function POST(request) {
  try {
    const { tenantId, postId } = await request.json();
    const { db, error } = await requireTenantAdmin(request, tenantId);
    if (error) return error;
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });

    const [{ data: tenant }, { data: post }] = await Promise.all([
      db.from('tenants').select('name, slug').eq('id', tenantId).single(),
      db.from('posts').select('id, content, feed_type, author:profiles!posts_author_id_fkey(display_name)')
        .eq('id', postId).eq('tenant_id', tenantId).maybeSingle(),
    ]);
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    const authorName = post.author?.display_name || '';
    const content = post.content || '';
    const feedType = post.feed_type || 'community';

    const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const communityUrl = `https://${tenant.slug}.${APP_DOMAIN}`;
    const deepUrl = `${communityUrl}/?post=${encodeURIComponent(post.id)}`;

    // Fans who opted into notifications
    const subscribers = await selectAll(() => db.from('profiles')
      .select('id').eq('tenant_id', tenantId).eq('email_notifications', true).eq('role', 'fan').order('id'));
    const userIds = subscribers.map(s => s.id);

    // ── Email (Resend) ──────────────────────────────────────────────────────
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    let sent = 0;
    if (RESEND_API_KEY && userIds.length) {
      const emailMap = await getUserEmailMap(db);
      const emails = userIds.map(id => emailMap[id]).filter(Boolean);
      const byline = escapeHtml((authorName || 'the artist').toLowerCase());
      const html = `
              <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:0 auto;background:#F5EFE6;padding:32px 24px;border-radius:12px;">
                <div style="font-size:22px;font-weight:700;color:#1A1018;text-transform:lowercase;margin-bottom:20px;">${escapeHtml(tenant.name)}</div>
                <div style="background:#FAF5F0;border-radius:10px;padding:20px;border:1px solid #E8DDD4;margin-bottom:20px;">
                  <div style="font-family:'DM Mono',monospace;font-size:10px;color:#8B1A2B;margin-bottom:8px;">${byline} · ${escapeHtml(feedType)}</div>
                  <p style="font-size:14px;color:#1A1018;line-height:1.6;margin:0;">${escapeHtml(content.slice(0, 300))}${content.length > 300 ? '...' : ''}</p>
                </div>
                <a href="${deepUrl}" style="display:block;padding:12px 24px;background:#8B1A2B;color:#fff;text-decoration:none;border-radius:8px;text-align:center;font-size:13px;font-weight:600;">read in community →</a>
                <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1.5px;margin-top:24px;padding-top:16px;border-top:1px solid #E8DDD4;">you're getting this as a member of ${escapeHtml(tenant.name)}'s community · manage emails in your profile at ${tenant.slug}.${APP_DOMAIN}<br />powered by flock</div>
              </div>
            `;
      sent = await sendResendBatch(RESEND_API_KEY, emails, (email) => ({
        from: fromHeader(tenant.name),
        to: email,
        subject: `new post from ${(authorName || tenant.name).toLowerCase()} ✦`,
        html,
      }));
    }

    // ── Web push ────────────────────────────────────────────────────────────
    let pushed = 0;
    const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
    if (VAPID_PUBLIC && VAPID_PRIVATE) {
      try {
        webpush.setVapidDetails(`mailto:hello@${APP_DOMAIN}`, VAPID_PUBLIC, VAPID_PRIVATE);
        const subs = await selectAll(() => db.from('push_subscriptions').select('endpoint, p256dh, auth').eq('tenant_id', tenantId).order('endpoint'));
        const payload = JSON.stringify({
          title: tenant.name,
          body: `${authorName || 'the artist'}: ${content.slice(0, 120)}`,
          url: deepUrl,
          tag: `post-${post.id}`,
        });
        await Promise.all(subs.map(async (s) => {
          if (!isTrustedPushEndpoint(s.endpoint)) return;
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              payload,
            );
            pushed++;
          } catch (e) {
            // Prune subscriptions the push service has expired/removed.
            if (e?.statusCode === 404 || e?.statusCode === 410) {
              await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
            }
          }
        }));
      } catch (e) {
        console.error('[push] send failed:', e?.message);
      }
    }

    return NextResponse.json({ ok: true, sent, pushed });
  } catch (err) {
    console.error('[email/band-post] error:', err);
    return NextResponse.json({ error: 'Could not notify fans' }, { status: 500 });
  }
}
