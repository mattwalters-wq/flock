import { NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/api-auth';
import { stripeRequest } from '@/lib/stripe';

// Opens the Stripe customer portal (update card, cancel, invoices) for a
// tenant that already has billing set up. Same auth pattern as checkout.

export async function POST(request) {
  try {
    const { tenantId } = await request.json();
    const { db, error } = await requireTenantAdmin(request, tenantId);
    if (error) return error;

    const { data: tenant } = await db.from('tenants')
      .select('slug, stripe_customer_id').eq('id', tenantId).single();
    if (!tenant?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing set up yet' }, { status: 400 });
    }

    const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const session = await stripeRequest('POST', '/billing_portal/sessions', {
      customer: tenant.stripe_customer_id,
      return_url: `https://${tenant.slug}.${APP_DOMAIN}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[billing/portal] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
