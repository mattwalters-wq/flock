// The tenant's browser session is origin-scoped. Match onboarding's existing
// handoff: fragments never reach HTTP servers and AuthProvider scrubs them.
export function tenantSessionUrl(slug, session) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug || '')) return null;
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
  const url = new URL(`https://${slug}.${domain}/`);
  if (session?.access_token && session?.refresh_token) {
    url.hash = new URLSearchParams({ fl_at: session.access_token, fl_rt: session.refresh_token }).toString();
  }
  return url.href;
}
