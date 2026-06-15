// flock service worker — web push notifications + deep-link on tap + installability.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// A push arrives → show a notification. Payload is JSON: { title, body, url, icon, tag }.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { title: 'flock', body: event.data ? event.data.text() : '' }; }

  const title = data.title || 'flock';
  const options = {
    body: data.body || '',
    icon: data.icon || '/apple-touch-icon.svg',
    badge: '/favicon.svg',
    tag: data.tag,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping the notification focuses an existing tab (and navigates it to the
// deep-linked post) or opens a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      try {
        await client.focus();
        if ('navigate' in client) await client.navigate(url);
        return;
      } catch { /* try next */ }
    }
    await self.clients.openWindow(url);
  })());
});
