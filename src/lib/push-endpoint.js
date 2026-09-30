// Subscriptions are client-written; never send server-side requests to arbitrary
// endpoints. These are the browser push services supported by this app.
export function isTrustedPushEndpoint(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.port || url.username || url.password) return false;
    return url.hostname === 'fcm.googleapis.com' ||
      url.hostname === 'updates.push.services.mozilla.com' ||
      url.hostname === 'web.push.apple.com' ||
      (url.hostname.endsWith('.notify.windows.com') && url.hostname !== 'notify.windows.com');
  } catch { return false; }
}
