import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';

// Sends "you're invited" emails for an artist's imported mailing list.
//
// Unlike the digest (which only reaches already-opted-in members), this route
// emails arbitrary addresses the artist pastes in — so it authenticates the
// caller: a valid Supabase access token whose profile is admin/band for the
// target tenant. Without that, anyone could use flock as a spam cannon.
//
// One-shot invitations to a list the artist already owns (their mailing list)
// — not a recurring campaign tool. Batch is capped per call; the dashboard
// chunks bigger lists.

const MAX_PER_CALL = 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request) {
  try {
    const { tenantId, emails } = await request.json();
    if (!tenantId || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Missing tenantId or emails' }, { status: 400 });
    }
    if (emails.length > MAX_PER_CALL) {
      return NextResponse.json({ error: `Max ${MAX_PER_CALL} emails per request` }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const db = getServiceSupabase();
    const { data: userData, error: userError } = await db.auth.getUser(token);
    if (userError || !userData?.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: profile } = await db.from('profiles')
      .select('role').eq('id', userData.user.id).eq('tenant_id', tenantId).maybeSingle();
    if (!profile || !['admin', 'band'].includes(profile.role)) {
      return NextResponse.json({ error: 'Not authorized for this community' }, { status: 403 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return NextResponse.json({ error: 'No Resend key configured' }, { status: 500 });

    const { data: tenant } = await db.from('tenants').select('name, slug').eq('id', tenantId).single();
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const communityUrl = `https://${tenant.slug}.${APP_DOMAIN}?utm_source=invite&utm_medium=email`;

    const cleaned = [...new Set(
      emails.map(e => String(e || '').trim().toLowerCase()).filter(e => EMAIL_RE.test(e))
    )];

    let sent = 0;
    for (const email of cleaned) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${tenant.name} <hello@fans-flock.com>`,
          to: email,
          subject: `${tenant.name.toLowerCase()} has a new home for fans ✦`,
          html: `
            <div style="font-family:'DM Sans',sans-serif;max-width:480px;margin:0 auto;background:#F5EFE6;padding:32px 24px;border-radius:12px;">
              <div style="font-size:28px;font-weight:700;color:#1A1018;text-transform:lowercase;margin-bottom:8px;">${tenant.name}</div>
              <div style="font-family:'DM Mono',monospace;font-size:10px;color:#6A5A62;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:24px;">you're invited</div>
              <p style="font-size:14px;color:#1A1018;line-height:1.6;margin-bottom:16px;">you're on ${tenant.name}'s mailing list, so you're first to know: there's now a home base for fans — exclusive posts, show check-ins, and rewards for the people who show up.</p>
              <p style="font-size:14px;color:#6A5A62;line-height:1.6;margin-bottom:24px;">it's free to join, and early members get founding-member numbers.</p>
              <a href="${communityUrl}" style="display:block;padding:14px 24px;background:#8B1A2B;color:#fff;text-decoration:none;border-radius:8px;text-align:center;font-size:14px;font-weight:600;margin-bottom:24px;">join the community →</a>
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:#6A5A62;letter-spacing:1px;border-top:1px solid #E8DDD4;padding-top:16px;">sent because you're on ${tenant.name}'s mailing list · powered by flock</div>
            </div>
          `,
        }),
      }).catch(() => null);
      if (res?.ok) sent++;
    }

    return NextResponse.json({ ok: true, sent, valid: cleaned.length, received: emails.length });
  } catch (err) {
    console.error('[invites] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
