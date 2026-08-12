import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';
import { stripeRequest, getFounderPriceId } from '@/lib/stripe';
import { isGod } from '@/lib/god';

// Starts a Stripe Checkout session for the $1/month founder subscription.
// Auth: same pattern as /api/invites — a valid Supabase token whose profile is
// admin/band for the tenant. Banked referral credits (referral_credits rows
// with applied_at IS NULL) are consumed here as trial days, 30 per free month.

export async function POST(request) {
  try {
    const { tenantId } = await request.json();
    if (!tenantId) return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const db = getServiceSupabase();
    const { data: userData, error: userError } = await db.auth.getUser(token);
    if (userError || !userData?.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Tenant admins/band members, or the platform owner (god mode has no
    // per-tenant profile rows — mirrors the client-side isGod checks).
    const { data: profile } = await db.from('profiles')
      .select('role').eq('id', userData.user.id).eq('tenant_id', tenantId).maybeSingle();
    if (!isGod(userData.user) && (!profile || !['admin', 'band'].includes(profile.role))) {
      return NextResponse.json({ error: 'Not authorized for this community' }, { status: 403 });
    }

    const { data: tenant } = await db.from('tenants')
      .select('id, slug, name, stripe_customer_id, billing_status').eq('id', tenantId).single();
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    if (['active', 'trialing'].includes(tenant.billing_status)) {
      return NextResponse.json({ error: 'Billing is already set up - use manage billing instead' }, { status: 400 });
    }

    // Reuse or create the Stripe customer for this tenant.
    let customerId = tenant.stripe_customer_id;
    if (!customerId) {
      const customer = await stripeRequest('POST', '/customers', {
        email: userData.user.email,
        name: tenant.name,
        metadata: { tenant_id: String(tenantId), tenant_slug: tenant.slug },
      });
      customerId = customer.id;
      await db.from('tenants').update({ stripe_customer_id: customerId }).eq('id', tenantId);
    }

    // Consume banked referral credits as trial days (30 per free month).
    const { data: credits } = await db.from('referral_credits')
      .select('id, months').eq('referrer_tenant_id', tenantId).is('applied_at', null);
    const freeMonths = (credits || []).reduce((s, c) => s + (c.months || 0), 0);

    const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const dashboardUrl = `https://${tenant.slug}.${APP_DOMAIN}/dashboard`;

    const session = await stripeRequest('POST', '/checkout/sessions', {
      mode: 'subscription',
      customer: customerId,
      line_items: { 0: { price: await getFounderPriceId(), quantity: 1 } },
      success_url: `${dashboardUrl}?billing=success`,
      cancel_url: `${dashboardUrl}?billing=cancelled`,
      subscription_data: {
        metadata: { tenant_id: String(tenantId) },
        ...(freeMonths > 0 ? { trial_period_days: freeMonths * 30 } : {}),
      },
      metadata: { tenant_id: String(tenantId) },
    });

    // Mark credits applied only after the session exists. (If the artist
    // abandons checkout the trial offer is burned with them — acceptable v1
    // trade-off vs. double-applying; the webhook is the source of truth for
    // the subscription itself.)
    if (freeMonths > 0) {
      await db.from('referral_credits').update({ applied_at: new Date().toISOString() })
        .in('id', credits.map(c => c.id));
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[billing/checkout] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
