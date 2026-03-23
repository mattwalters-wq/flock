import './globals.css';
import { headers } from 'next/headers';
import { getTenantBySlug, getTenantByDomain, getTenantPalette } from '@/lib/tenant';
import { AuthProvider } from '@/lib/auth-context';
import MarketingPage from './start/marketing';

export default async function RootLayout({ children }) {
  const headersList = headers();
  const tenantSlug = headersList.get('x-tenant-slug');
  const host = headersList.get('x-host') || '';
  const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';

  // Root domain - serve marketing page directly
  const isRootDomain = host === APP_DOMAIN || host === `www.${APP_DOMAIN}`;

  let tenant = null;
  if (!isRootDomain) {
    if (tenantSlug === '__custom__') {
      tenant = await getTenantByDomain(host);
    } else if (tenantSlug && tenantSlug !== '__custom__') {
      tenant = await getTenantBySlug(tenantSlug);
    }
  }

  const palette = getTenantPalette(tenant);
  const tenantId = tenant?.id || null;
  const tenantName = tenant?.name || 'flock';

  const cssVars = `
    :root {
      --ink: ${palette.ink};
      --cream: ${palette.cream};
      --ruby: ${palette.ruby};
      --blush: ${palette.blush};
      --warm-gold: ${palette.warmGold};
      --slate: ${palette.slate};
      --surface: ${palette.surface};
      --border: ${palette.border};
    }
  `;

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
        <title>{isRootDomain ? 'flock · fan communities for independent artists' : `${tenantName} · flock`}</title>
        {!isRootDomain && <style dangerouslySetInnerHTML={{ __html: cssVars }} />}
      </head>
      <body>
        {isRootDomain ? (
          <MarketingPage />
        ) : (
          <AuthProvider tenantId={tenantId}>
            {children}
          </AuthProvider>
        )}
      </body>
    </html>
  );
}
