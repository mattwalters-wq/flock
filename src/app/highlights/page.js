'use client';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';

function timeAgo(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export default function HighlightsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [config, setConfig] = useState({});
  const [memberMap, setMemberMap] = useState({});
  const [shows, setShows] = useState([]);
  const [fanCount, setFanCount] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [joined, setJoined] = useState(false);

  const ruby = config.color_ruby || '#8B1A2B';
  const cream = config.color_cream || '#F5EFE6';
  const ink = config.color_ink || '#1A1018';
  const SLATE = '#6A5A62';
  const BORDER = '#E8DDD4';
  const SURFACE = '#FAF5F0';
  const WARM_GOLD = '#C9922A';

  useEffect(() => {
    const sb = getSupabase();
    const host = window.location.hostname;
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const slug = host.endsWith(`.${appDomain}`) ? host.replace(`.${appDomain}`, '') : null;

    (async () => {
      if (!slug) { setLoading(false); return; }

      const { data: t } = await sb.from('tenants').select('*').eq('slug', slug).single();
      if (!t) { setLoading(false); return; }
      setTenant(t);

      const [cfgRes, memRes, postsRes, showsRes, fansRes] = await Promise.all([
        sb.from('tenant_config').select('key, value').eq('tenant_id', t.id),
        sb.from('tenant_members').select('*').eq('tenant_id', t.id).order('display_order'),
        sb.from('posts').select('*, profiles!posts_author_id_fkey(display_name, role, band_member)').eq('is_highlight', true).eq('tenant_id', t.id).order('created_at', { ascending: false }).limit(12),
        sb.from('shows').select('*').eq('tenant_id', t.id).gte('date', new Date().toISOString().split('T')[0]).order('date').limit(4),
        sb.from('profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id),
      ]);

      const cfg = {};
      (cfgRes.data || []).forEach(({ key, value }) => { cfg[key] = value; });
      setConfig(cfg);

      const map = {};
      (memRes.data || []).forEach(m => { map[m.slug] = { name: m.name, accentColor: m.accent_color }; });
      setMemberMap(map);
      setPosts(postsRes.data || []);
      setShows(showsRes.data || []);
      setFanCount(fansRes.count || 0);

      // Apply brand colours to page
      if (cfg.color_ruby) document.documentElement.style.setProperty('--page-ruby', cfg.color_ruby);
      if (cfg.color_cream) document.documentElement.style.setProperty('--page-cream', cfg.color_cream);
      if (cfg.color_ink) document.documentElement.style.setProperty('--page-ink', cfg.color_ink);

      setLoading(false);
    })();
  }, []);

  const tenantName = tenant?.name || 'flock';
  const tagline = config.tagline || `the official fan community for ${tenantName}`;
  const logoUrl = config.logo_url || null;
  const bannerUrl = config.banner_url || null;
  const joinUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const highlightsUrl = typeof window !== 'undefined' ? window.location.href : '';

  const socials = [
    config.social_instagram && { label: 'instagram', url: `https://instagram.com/${config.social_instagram}`, icon: '◉' },
    config.social_tiktok && { label: 'tiktok', url: `https://tiktok.com/@${config.social_tiktok}`, icon: '◈' },
    config.social_spotify && { label: 'spotify', url: config.social_spotify.startsWith('http') ? config.social_spotify : `https://open.spotify.com/${config.social_spotify}`, icon: '♫' },
    config.social_apple_music && { label: 'apple music', url: config.social_apple_music, icon: '♪' },
    config.social_youtube && { label: 'youtube', url: config.social_youtube, icon: '▶' },
    config.social_website && { label: 'website', url: config.social_website, icon: '↗' },
  ].filter(Boolean);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, color: ruby }}>✦</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: cream, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* HERO */}
      <div style={{ position: 'relative', overflow: 'hidden', background: ink, minHeight: 320 }}>
        {bannerUrl && (
          <img src={bannerUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${ink}88, ${ink})` }} />

        {/* Flock branding - small */}
        <div style={{ position: 'absolute', top: 16, right: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: cream + '44', letterSpacing: '1px' }}>powered by</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: cream + '66', letterSpacing: '-0.3px' }}>flock</div>
        </div>

        <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto', padding: '64px 24px 48px', animation: 'fadeUp 0.6s ease-out' }}>
          {/* Artist name or logo */}
          {logoUrl ? (
            <img src={logoUrl} alt={tenantName} style={{ height: 56, maxWidth: 260, objectFit: 'contain', display: 'block', marginBottom: 12, filter: 'brightness(0) invert(1)' }} />
          ) : (
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 48, fontWeight: 700, color: cream, textTransform: 'lowercase', lineHeight: 1, marginBottom: 12, letterSpacing: '-1px' }}>
              {tenantName}
            </div>
          )}

          {/* Tagline */}
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: cream + '99', lineHeight: 1.6, marginBottom: 24, maxWidth: 380 }}>
            {tagline}
          </div>

          {/* Fan count */}
          {fanCount !== null && fanCount > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: cream + '15', borderRadius: 20, padding: '6px 14px', marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: -4 }}>
                {[...Array(Math.min(3, fanCount))].map((_, i) => (
                  <div key={i} style={{ width: 20, height: 20, borderRadius: '50%', background: ruby, border: `2px solid ${ink}`, marginLeft: i > 0 ? -6 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 8, color: cream, fontWeight: 700 }}>{String.fromCharCode(65 + i)}</div>
                ))}
              </div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: cream + '88' }}>{fanCount} {fanCount === 1 ? 'fan' : 'fans'} inside</span>
            </div>
          )}

          {/* Social links */}
          {socials.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
              {socials.map(s => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: cream + '12', border: `1px solid ${cream}22`, borderRadius: 20, textDecoration: 'none', transition: 'all 0.15s' }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: cream + '88' }}>{s.icon} {s.label}</span>
                </a>
              ))}
            </div>
          )}

          {/* Join CTA */}
          <a href={joinUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: ruby, color: cream, padding: '14px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px' }}>
            join the community
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14 }}>✦</span>
          </a>
          <div style={{ marginTop: 10, fontFamily: "'DM Mono', monospace", fontSize: 9, color: cream + '44' }}>free to join · posts, rewards & exclusive content</div>
        </div>
      </div>

      {/* UPCOMING SHOWS */}
      {shows.length > 0 && (
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px 0' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 14 }}>upcoming shows</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shows.map(show => (
              <div key={show.id} style={{ background: SURFACE, borderRadius: 10, padding: '14px 16px', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ background: ink, borderRadius: 8, padding: '10px 12px', textAlign: 'center', minWidth: 52 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: cream, lineHeight: 1 }}>
                    {new Date(show.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric' })}
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: cream + '77', marginTop: 2, textTransform: 'uppercase' }}>
                    {new Date(show.date + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short' })}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: ink }}>{show.city}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + '99', marginTop: 2 }}>{show.venue}</div>
                </div>
                {show.ticket_url ? (
                  <a href={show.ticket_url} target="_blank" rel="noopener noreferrer"
                    style={{ background: ruby, color: cream, padding: '8px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>tickets</a>
                ) : (
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '66' }}>free entry</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HIGHLIGHTS */}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px' }}>
        {posts.length > 0 && (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 14 }}>from inside the community</div>
        )}

        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>✦</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE, lineHeight: 1.7 }}>
              {tenantName} hasn't shared any highlights yet.<br />join to be first in the door.
            </div>
            <a href={joinUrl} style={{ display: 'inline-block', marginTop: 24, background: ruby, color: cream, padding: '12px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              join the community ✦
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {posts.map((post, idx) => {
              const prof = post.profiles || {};
              const isBand = prof.role === 'band' || prof.role === 'admin';
              const memberKey = prof.band_member;
              const memberInfo = memberKey ? memberMap[memberKey] : null;
              const memberColor = memberInfo?.accentColor || ruby;
              const name = isBand ? (memberInfo?.name?.toLowerCase() || prof.display_name?.toLowerCase()) : prof.display_name?.toLowerCase();
              const hasImage = post.image_url || (post.images?.length > 0);

              return (
                <div key={post.id} style={{ background: SURFACE, borderRadius: 12, overflow: 'hidden', border: `1px solid ${BORDER}`, animation: `fadeUp 0.4s ease-out ${idx * 0.05}s both` }}>
                  {/* Image */}
                  {hasImage && (
                    <div onClick={() => setLightboxUrl(post.images?.[0] || post.image_url)} style={{ cursor: 'pointer', position: 'relative' }}>
                      <img src={post.images?.[0] || post.image_url} alt="" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                      {(post.images?.length > 1) && (
                        <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontFamily: "'DM Mono', monospace", fontSize: 9 }}>+{post.images.length - 1}</div>
                      )}
                    </div>
                  )}

                  {/* Audio */}
                  {post.audio_url && !hasImage && (
                    <div style={{ background: ink, padding: '20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: ruby, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: cream, flexShrink: 0 }}>♫</div>
                      <audio controls style={{ flex: 1, height: 32 }}><source src={post.audio_url} /></audio>
                    </div>
                  )}

                  {/* Content */}
                  <div style={{ padding: '14px 16px' }}>
                    {/* Author */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: isBand ? memberColor : BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: "'DM Mono', monospace", color: isBand ? cream : SLATE, fontWeight: 600 }}>
                        {isBand ? '✦' : name?.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: ink }}>{name}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '77' }}>{timeAgo(post.created_at)}</div>
                      </div>
                      {isBand && <div style={{ marginLeft: 'auto', fontFamily: "'DM Mono', monospace", fontSize: 8, color: memberColor, border: `1px solid ${memberColor}44`, padding: '2px 6px', borderRadius: 3 }}>band</div>}
                    </div>

                    {/* Text */}
                    {post.content && (
                      <p style={{ fontSize: 13.5, lineHeight: 1.65, color: ink + 'CC', whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {post.content}
                      </p>
                    )}

                    {/* Blurred CTA overlay for long posts */}
                    {post.content?.length > 200 && (
                      <div style={{ marginTop: 6 }}>
                        <a href={joinUrl} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: ruby, textDecoration: 'none' }}>join to read more →</a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* STICKY JOIN BANNER */}
      <div style={{ position: 'sticky', bottom: 0, zIndex: 50, background: ink + 'F5', backdropFilter: 'blur(16px)', borderTop: `1px solid ${cream}15`, padding: '14px 20px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: cream, textTransform: 'lowercase' }}>want in?</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: cream + '55', marginTop: 2 }}>posts · exclusive content · rewards · shows</div>
          </div>
          <a href={joinUrl} style={{ background: ruby, color: cream, padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
            join free ✦
          </a>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <img src={lightboxUrl} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }} />
          <button onClick={() => setLightboxUrl(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 20, width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}
    </div>
  );
}
