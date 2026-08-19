import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';
import { isGod } from '@/lib/god';
import { getUserEmailMap, sendResendBatch } from '@/lib/email';

// Artist-composed email broadcast to their opted-in fans — the "replace the
// mailing list" feature (pre-save announcements, release news, tour drops).
// Unlike the digest (auto-assembled roundup), the artist writes the whole
// thing: subject, message, and an optional call-to-action button (e.g. a
// pre-save link).
//
// Auth: same as /api/invites — admin/band profile on the tenant, or god.
// Audience: fans with email_notifications = true only; every email says how
// to opt out (profile toggle). Each send is recorded in email_broadcasts.

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function POST(request) {
  try {
    const { tenantId, subject, body, ctaText, ctaUrl } = await request.json();
    if (!tenantId || !subject?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'Missing tenantId, subject or body' }, { status: 400 });
    }
    if (ctaUrl && !/^https?:\/\//i.test(ctaUrl.trim())) {
      return NextResponse.json({ error: 'Button link must start with http(s)://' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const db = getServiceSupabase();
    const { data: userData, error: userError } = await db.auth.getUser(token);
    if (userError || !userData?.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: profile } = await db.from('profiles')
      .select('role').eq('id', userData.user.id).eq('tenant_id', tenantId).maybeSingle();
    if (!isGod(userData.user) && (!profile || !['admin', 'band'].includes(profile.role))) {
      return NextResponse.json({ error: 'Not authorized for this community' }, { status: 403 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return NextResponse.json({ error: 'No Resend key configured' }, { status: 500 });

    const { data: tenant } = await db.from('tenants').select('name, slug').eq('id', tenantId).single();
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    // Opted-in fans only — same audience rule as the digest.
    const { data: subscribers } = await db.from('profiles')
      .select('id').eq('tenant_id', tenantId).eq('email_notifications', true).eq('role', 'fan');
    if (!subscribers?.length) return NextResponse.json({ ok: true, sent: 0, total: 0 });

    const emailMap = await getUserEmailMap(db);
    const emails = subscribers.map(s => emailMap[s.id]).filter(Boolean);

    const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const communityUrl = `https://${tenant.slug}.${APP_DOMAIN}`;

    const safeBody = escapeHtml(body.trim()).replace(/\n/g, '<br />');
    const button = ctaText?.trim() && ctaUrl?.trim()
      ? `<a href="${escapeHtml(ctaUrl.trim())}" style="display:block;padding:14px 24px;background:#8B1A2B;color:#fff;text-decoration:none;border-radius:8px;text-align:center;font-size:14px;font-weight:600;margin:24px 0;">${escapeHtml(ctaText.trim())}</a>`
      : '';

    const html = `
      <div style="font-family:'DM Sans',sans-serif;max-width:520px;margin:0 auto;background:#F5EFE6;padding:32px 24px;border-radius:12px;">
        <div style="font-size:24px;font-weight:700;color:#1A1018;text-transform:lowercase;margin-bottom:4px;">${escapeHtml(tenant.name)}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:24px;">a note from the artist</div>
        <div style="font-size:14px;color:#1A1018;line-height:1.7;">${safeBody}</div>
        ${button}
        <a href="${communityUrl}" style="font-family:'DM Mono',monospace;font-size:11px;color:#8B1A2B;text-decoration:none;">visit the community →</a>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1px;border-top:1px solid #E8DDD4;padding-top:16px;margin-top:24px;">
          you're getting this as a member of ${escapeHtml(tenant.name)}'s community · manage emails in your profile at ${tenant.slug}.${APP_DOMAIN}<br />powered by flock
        </div>
      </div>
    `;

    const sent = await sendResendBatch(RESEND_API_KEY, emails, (email) => ({
      from: `${tenant.name} <hello@fans-flock.com>`,
      to: email,
      subject: subject.trim(),
      html,
    }));

    // Record the send (best-effort — the emails are already out).
    try {
      await db.from('email_broadcasts').insert({
        tenant_id: tenantId,
        sender_id: userData.user.id,
        subject: subject.trim(),
        body: body.trim(),
        cta_text: ctaText?.trim() || null,
        cta_url: ctaUrl?.trim() || null,
        sent_count: sent,
      });
    } catch (e) {
      console.error('[email/broadcast] history skipped:', e?.message);
    }

    return NextResponse.json({ ok: true, sent, total: emails.length });
  } catch (err) {
    console.error('[email/broadcast] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
