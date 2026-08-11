import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';
import { stripeRequest } from '@/lib/stripe';

// Opens the Stripe customer portal (update card, cancel, invoices) for a
// tenant that already has billing set up. Same auth pattern as checkout.

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

    const { data: profile } = await db.from('profiles')
      .select('role').eq('id', userData.user.id).eq('tenant_id', tenantId).maybeSingle();
    if (!profile || !['admin', 'band'].includes(profile.role)) {
      return NextResponse.json({ error: 'Not authorized for this community' }, { status: 403 });
    }

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
