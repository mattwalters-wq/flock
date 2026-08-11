// Server-only Stripe helpers. Deliberately no stripe npm dependency — the
// codebase keeps its runtime deps minimal, and the three calls we make
// (customers, checkout sessions, billing portal) are plain form-encoded REST.
//
// Pricing model: one product/price, the $1/month founder rate, identified by a
// lookup_key so it can be found (or lazily created on first checkout) in
// whichever Stripe account/mode the keys point at. No dashboard setup needed:
// point STRIPE_SECRET_KEY at a fresh account and the first checkout creates it.
import crypto from 'crypto';

const STRIPE_API = 'https://api.stripe.com/v1';
export const FOUNDER_LOOKUP_KEY = 'flock_founder_monthly';

function key() {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new Error('STRIPE_SECRET_KEY not configured');
  return k;
}

// Flatten nested params into Stripe's form encoding:
// { a: { b: 1 }, c: ['x'] } -> a[b]=1&c[0]=x
function encodeForm(params, prefix = '', out = new URLSearchParams()) {
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const name = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') encodeForm(v, name, out);
    else out.append(name, String(v));
  });
  return out;
}

export async function stripeRequest(method, path, params) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: method === 'GET' ? undefined : encodeForm(params).toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `Stripe ${path} failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// Find (or create, first time) the founder price. Cached per lambda instance.
let cachedPriceId = null;
export async function getFounderPriceId() {
  if (cachedPriceId) return cachedPriceId;
  const existing = await stripeRequest('GET', `/prices?lookup_keys[0]=${FOUNDER_LOOKUP_KEY}&active=true&limit=1`);
  if (existing.data?.[0]?.id) {
    cachedPriceId = existing.data[0].id;
    return cachedPriceId;
  }
  const price = await stripeRequest('POST', '/prices', {
    currency: 'aud',
    unit_amount: 100, // $1.00/month founder rate
    recurring: { interval: 'month' },
    lookup_key: FOUNDER_LOOKUP_KEY,
    product_data: { name: 'flock · founder rate' },
  });
  cachedPriceId = price.id;
  return cachedPriceId;
}

// Verify a Stripe webhook signature (Stripe-Signature: t=...,v1=...) without
// the SDK: v1 is HMAC-SHA256 of `${t}.${rawBody}` with the endpoint secret.
export function verifyStripeSignature(rawBody, sigHeader, secret, toleranceSeconds = 300) {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(
    sigHeader.split(',').map(p => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)]; })
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSeconds) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v1, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
