import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { name, email, message } = await request.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'all fields required' }, { status: 400 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.error('[api/contact] RESEND_API_KEY not set');
      return NextResponse.json({ error: 'email not configured' }, { status: 500 });
    }

    const CONTACT_EMAIL = 'info@mondamgmt.com';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Flock Contact <hello@fans-flock.com>',
        to: CONTACT_EMAIL,
        reply_to: email.trim(),
        subject: `Flock contact: ${name.trim()}`,
        html: `
          <div style="font-family:'DM Sans',sans-serif;max-width:520px;margin:0 auto;background:#F5EFE6;padding:32px 24px;border-radius:12px;">
            <div style="font-size:20px;font-weight:700;color:#1A1018;margin-bottom:20px;">new contact form submission</div>
            <div style="background:#FAF5F0;border-radius:10px;padding:20px;border:1px solid #E8DDD4;margin-bottom:16px;">
              <div style="font-family:monospace;font-size:10px;color:#6A5A62;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">from</div>
              <div style="font-size:15px;color:#1A1018;font-weight:600;">${name.trim()}</div>
              <div style="font-size:13px;color:#6A5A62;margin-top:2px;">${email.trim()}</div>
            </div>
            <div style="background:#FAF5F0;border-radius:10px;padding:20px;border:1px solid #E8DDD4;">
              <div style="font-family:monospace;font-size:10px;color:#6A5A62;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">message</div>
              <div style="font-size:14px;color:#1A1018;line-height:1.7;white-space:pre-wrap;">${message.trim()}</div>
            </div>
            <div style="font-family:monospace;font-size:9px;color:#6A5A62;letter-spacing:1px;margin-top:24px;padding-top:16px;border-top:1px solid #E8DDD4;">via fans-flock.com/contact</div>
          </div>
        `,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/contact] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
