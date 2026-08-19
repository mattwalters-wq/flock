// Shared server-side email helpers for routes that fan out to many fans.
//
// getUserEmailMap: auth.admin.listUsers() returns ONE PAGE (50 users) by
// default — building an id→email map from a single call silently drops every
// fan past the first page. (This is exactly why Grace's first broadcast went
// to 29 of 144 fans.) Always paginate.
//
// sendResendBatch: Resend's /emails/batch takes up to 100 emails per call —
// one request per 100 recipients instead of one per fan, which stays clear of
// both Resend's per-second rate limit and the serverless function timeout.

export async function getUserEmailMap(db) {
  const map = {};
  let page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    const users = data?.users || [];
    users.forEach(u => { map[u.id] = u.email; });
    if (users.length < 1000) break;
    page++;
  }
  return map;
}

export async function sendResendBatch(apiKey, recipients, buildEmail) {
  let sent = 0;
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk.map(buildEmail)),
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json().catch(() => null);
      sent += data?.data?.length ?? chunk.length;
    }
  }
  return sent;
}
