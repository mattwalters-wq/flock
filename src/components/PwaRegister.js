'use client';
import { useEffect } from 'react';

// Registers the service worker so the app is installable and can receive web
// push. Registration is idempotent and silent; subscribing to push is a separate,
// user-initiated step (the "enable notifications" control on the profile tab).
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
