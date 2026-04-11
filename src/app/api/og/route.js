import { ImageResponse } from 'next/og';
import { getServiceSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || 'flock';

  let tenantName = slug;
  let ruby = '#8B1A2B';
  let cream = '#F5EFE6';
  let ink = '#1A1018';
  let bannerUrl = null;
  let tagline = null;

  try {
    const db = getServiceSupabase();
    const { data: tenant } = await db.from('tenants').select('id, name').eq('slug', slug).single();
    if (tenant) {
      tenantName = tenant.name;
      const { data: config } = await db.from('tenant_config').select('key, value').eq('tenant_id', tenant.id);
      if (config) {
        config.forEach(({ key, value }) => {
          if (key === 'color_ruby') ruby = value;
          if (key === 'color_cream') cream = value;
          if (key === 'color_ink') ink = value;
          if (key === 'banner_url') bannerUrl = value;
          if (key === 'tagline') tagline = value;
        });
      }
    }
  } catch (_) {}

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: cream,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Banner image as background if available */}
        {bannerUrl && (
          <img
            src={bannerUrl}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.25,
            }}
          />
        )}

        {/* Colour overlay strip at top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: ruby, display: 'flex' }} />

        {/* Content */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 80px',
        }}>
          {/* ✦ icon */}
          <div style={{
            fontSize: '48px',
            color: ruby,
            marginBottom: '24px',
            display: 'flex',
          }}>✦</div>

          {/* Artist name */}
          <div style={{
            fontSize: '80px',
            fontWeight: 700,
            color: ink,
            lineHeight: 1.1,
            marginBottom: '16px',
            display: 'flex',
            textTransform: 'lowercase',
          }}>
            {tenantName.toLowerCase()}
          </div>

          {/* Tagline or default */}
          <div style={{
            fontSize: '28px',
            color: ink,
            opacity: 0.6,
            fontWeight: 400,
            display: 'flex',
          }}>
            {tagline || 'fan community'}
          </div>

          {/* Flock badge bottom right */}
          <div style={{
            position: 'absolute',
            bottom: '48px',
            right: '80px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: ruby,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              color: cream,
            }}>✦</div>
            <div style={{ fontSize: '18px', color: ink, opacity: 0.5, display: 'flex' }}>
              fans-flock.com
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
