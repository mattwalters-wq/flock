import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';
import { verifyStripeSignature } from '@/lib/stripe';

// Stripe webhook: the source of truth for billing state on tenants.
// Configure in Stripe: endpoint https://fans-flock.com/api/billing/webhook
// with events checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted — then set STRIPE_WEBHOOK_SECRET.

export async function POST(request) {
  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  if (!verifyStripeSignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const event = JSON.parse(rawBody);
    const db = getServiceSupabase();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const tenantId = Number(session.metadata?.tenant_id);
      if (tenantId && session.subscription) {
        await db.from('tenants').update({
          stripe_subscription_id: session.subscription,
          plan: 'founder',
          billing_status: 'active',
        }).eq('id', tenantId);
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const status = event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status;
      const update = {
        billing_status: status,
        billing_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
      };
      // Keep the founder plan label even through cancel — the locked rate is
      // the founder promise; a canceled founder can resubscribe at it.
      const tenantId = Number(sub.metadata?.tenant_id);
      if (tenantId) {
        await db.from('tenants').update(update).eq('id', tenantId);
      } else if (sub.customer) {
        await db.from('tenants').update(update).eq('stripe_customer_id', sub.customer);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[billing/webhook] error:', err);
    // 200 anyway for parse/db hiccups on verified events — Stripe retries
    // aggressively and the next subscription.updated will reconverge state.
    return NextResponse.json({ received: true, note: 'processing error logged' });
  }
}
