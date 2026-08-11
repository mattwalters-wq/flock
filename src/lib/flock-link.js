// Builds the attributed marketing link used by every fan-facing "powered by
// flock" mark. Deep-links straight to /start (the artist pitch) rather than the
// apex root, which only client-redirects there, and carries both:
//   * utm_* params for analytics, and
//   * ref=<slug> so that if an artist clicks through and launches their own
//     community, the onboarding wizard pre-fills the referral code and the
//     originating tenant gets referral credit.
export function flockPitchUrl({ slug, medium } = {}) {
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
  const s = (slug || (typeof window !== 'undefined' ? window.location.hostname.split('.')[0] : '') || '').toLowerCase();
  const params = new URLSearchParams({ utm_source: 'tenant', utm_medium: medium || 'powered_by', utm_campaign: s });
  if (s) params.set('ref', s);
  return `https://${domain}/start?${params.toString()}`;
}
