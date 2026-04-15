import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || searchParams.get('slug') || 'flock';
  const ruby = '#8B1A2B';
  const cream = '#F5EFE6';
  const ink = '#1A1018';
  const tagline = searchParams.get('tagline') || 'fan community';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: ink,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: ruby, display: 'flex' }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px 80px',
        }}>
          <div style={{ fontSize: '36px', color: ruby, marginBottom: '20px', display: 'flex' }}>✦</div>
          <div style={{ fontSize: '120px', fontWeight: 700, color: cream, lineHeight: 1, marginBottom: '20px', display: 'flex' }}>
            {name.toLowerCase()}
          </div>
          <div style={{ fontSize: '26px', color: cream, opacity: 0.35, display: 'flex' }}>
            {tagline}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: '48px', right: '80px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: ruby, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: cream }}>✦</div>
          <div style={{ fontSize: '16px', color: cream, opacity: 0.25, display: 'flex' }}>fans-flock.com</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
