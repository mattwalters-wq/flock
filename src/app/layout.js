import './globals.css';
import { headers } from 'next/headers';
import { getTenantBySlug, getTenantByDomain, getTenantPalette } from '@/lib/tenant';
import { AuthProvider } from '@/lib/auth-context';

export async function generateMetadata() {
  return {
    title: 'flock',
    description: 'fan communities for independent artists',
  };
}

export default async function RootLayout({ children }) {
  const headersList = headers();
  const tenantSlug = headersList.get('x-tenant-slug');
  const host = headersList.get('x-host') || '';

  let tenant = null;
  if (tenantSlug === '__custom__') {
    tenant = await getTenantByDomain(host);
  } else if (tenantSlug) {
    tenant = await getTenantBySlug(tenantSlug);
  }

  const palette = getTenantPalette(tenant);
  const tenantName = tenant?.name || 'flock';
  const tenantId = tenant?.id || null;

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
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
        <title>{tenantName} · flock</title>
        <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      </head>
      <body>
        <AuthProvider tenantId={tenantId}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
