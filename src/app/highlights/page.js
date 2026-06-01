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
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const ruby = config.color_ruby || '#8B1A2B';
  const cream = config.color_cream || '#F5EFE6';
  const ink = config.color_ink || '#1A1018';
  const SLATE = '#6A5A62';

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

      const [cfgRes, memRes, postsRes, showsRes] = await Promise.all([
        sb.from('tenant_config').select('key, value').eq('tenant_id', t.id),
        sb.from('tenant_members').select('*').eq('tenant_id', t.id).order('display_order'),
        sb.from('posts').select('*, profiles!posts_author_id_fkey(display_name, role, band_member)').eq('is_highlight', true).eq('tenant_id', t.id).order('created_at', { ascending: false }).limit(12),
        sb.from('shows').select('*').eq('tenant_id', t.id).gte('date', new Date().toISOString().split('T')[0]).order('date').limit(4),
      ]);

      const cfg = {};
      (cfgRes.data || []).forEach(({ key, value }) => { cfg[key] = value; });
      setConfig(cfg);

      const map = {};
      (memRes.data || []).forEach(m => { map[m.slug] = { name: m.name, accentColor: m.accent_color }; });
      setMemberMap(map);
      setPosts(postsRes.data || []);
      setShows(showsRes.data || []);

      setLoading(false);
    })();
  }, []);

  const tenantName = tenant?.name || 'flock';
  const tagline = config.tagline || `the official fan community for ${tenantName}`;
  const logoUrl = config.logo_url || null;
  const bannerUrl = config.banner_url || null;
  const joinUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const socials = [
    config.social_instagram && { label: 'instagram', url: `https://instagram.com/${config.social_instagram}` },
    config.social_tiktok && { label: 'tiktok', url: `https://tiktok.com/@${config.social_tiktok}` },
    config.social_spotify && { label: 'spotify', url: config.social_spotify.startsWith('http') ? config.social_spotify : `https://open.spotify.com/${config.social_spotify}` },
    config.social_apple_music && { label: 'apple music', url: config.social_apple_music },
    config.social_youtube && { label: 'youtube', url: config.social_youtube },
    config.social_website && { label: 'website', url: config.social_website },
  ].filter(Boolean);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, color: ruby }}>✦</div>
    </div>
  );

  const mono = { fontFamily: "'DM Mono', monospace" };
  const sans = { fontFamily: "'DM Sans', sans-serif" };

  return (
    <div style={{ minHeight: '100vh', background: cream, ...sans, color: ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        a { color: inherit; }
      `}</style>

      {/* HERO */}
      <div style={{ position: 'relative', overflow: 'hidden', background: ink }}>
        {bannerUrl && (
          <img src={bannerUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.28 }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${ink}55, ${ink})` }} />

        <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto', padding: '80px 28px 56px', animation: 'fadeUp 0.6s ease-out' }}>
          {logoUrl ? (
            <img src={logoUrl} alt={tenantName} style={{ height: 52, maxWidth: 240, objectFit: 'contain', display: 'block', marginBottom: 18, filter: 'brightness(0) invert(1)' }} />
          ) : (
            <div style={{ ...sans, fontSize: 46, fontWeight: 700, color: cream, textTransform: 'lowercase', lineHeight: 1, marginBottom: 18, letterSpacing: '-1.5px' }}>
              {tenantName}
            </div>
          )}

          <div style={{ ...mono, fontSize: 9, color: cream + '66', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 14 }}>
            highlights
          </div>

          <div style={{ fontSize: 15, color: cream + 'AA', lineHeight: 1.6, marginBottom: 28, maxWidth: 420, fontWeight: 400 }}>
            {tagline}
          </div>

          {socials.length > 0 && (
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 34 }}>
              {socials.map(s => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{ ...mono, fontSize: 11, color: cream + '88', letterSpacing: '0.5px', textDecoration: 'none', borderBottom: `1px solid ${cream}22`, paddingBottom: 2 }}>
                  {s.label}
                </a>
              ))}
            </div>
          )}

          <a href={joinUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: ruby, color: cream, padding: '14px 30px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14, letterSpacing: '-0.2px' }}>
            join the community
            <span style={{ ...mono, fontSize: 13 }}>✦</span>
          </a>
          <div style={{ marginTop: 12, ...mono, fontSize: 9, color: cream + '44', letterSpacing: '0.5px' }}>free to join · posts, rewards &amp; exclusive content</div>
        </div>

        <div style={{ position: 'absolute', top: 18, right: 24, ...mono, fontSize: 9, color: cream + '33', letterSpacing: '1px' }}>
          powered by flock
        </div>
      </div>

      {/* UPCOMING SHOWS */}
      {shows.length > 0 && (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '44px 28px 0' }}>
          <div style={{ ...mono, fontSize: 9, color: SLATE, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 18 }}>upcoming shows</div>
          <div>
            {shows.map((show, i) => (
              <div key={show.id} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '16px 0', borderTop: i === 0 ? 'none' : `1px solid ${ink}10` }}>
                <div style={{ textAlign: 'center', minWidth: 44 }}>
                  <div style={{ ...mono, fontSize: 22, fontWeight: 500, color: ink, lineHeight: 1 }}>
                    {new Date(show.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric' })}
                  </div>
                  <div style={{ ...mono, fontSize: 9, color: SLATE, marginTop: 3, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {new Date(show.date + 'T00:00:00').toLocaleDateString('en-AU', { month: 'short' })}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: ink }}>{show.city}</div>
                  <div style={{ ...mono, fontSize: 11, color: SLATE, marginTop: 3 }}>{show.venue}</div>
                </div>
                {show.ticket_url ? (
                  <a href={show.ticket_url} target="_blank" rel="noopener noreferrer"
                    style={{ ...mono, fontSize: 11, color: ruby, textDecoration: 'none', letterSpacing: '0.5px', borderBottom: `1px solid ${ruby}44`, paddingBottom: 2 }}>tickets</a>
                ) : (
                  <div style={{ ...mono, fontSize: 10, color: SLATE + '88' }}>free entry</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HIGHLIGHTS FEED */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '44px 28px 40px' }}>
        {posts.length > 0 && (
          <div style={{ ...mono, fontSize: 9, color: SLATE, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 24 }}>from inside the community</div>
        )}

        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '72px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 18, color: ruby }}>✦</div>
            <div style={{ ...mono, fontSize: 12, color: SLATE, lineHeight: 1.8 }}>
              {tenantName} hasn't shared any highlights yet.<br />join to be first in the door.
            </div>
            <a href={joinUrl} style={{ display: 'inline-block', marginTop: 26, background: ruby, color: cream, padding: '13px 30px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              join the community ✦
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {posts.map((post, idx) => {
              const prof = post.profiles || {};
              const isBand = prof.role === 'band' || prof.role === 'admin';
              const memberKey = prof.band_member;
              const memberInfo = memberKey ? memberMap[memberKey] : null;
              const memberColor = memberInfo?.accentColor || ruby;
              const name = isBand ? (memberInfo?.name?.toLowerCase() || prof.display_name?.toLowerCase()) : prof.display_name?.toLowerCase();
              const images = post.images?.length ? post.images : (post.image_url ? [post.image_url] : []);
              const hasImage = images.length > 0;

              return (
                <article key={post.id} style={{ animation: `fadeUp 0.5s ease-out ${idx * 0.04}s both` }}>
                  {/* Author meta */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: isBand ? memberColor : 'transparent', border: isBand ? 'none' : `1px solid ${ink}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, ...mono, color: isBand ? cream : SLATE, fontWeight: 500, flexShrink: 0 }}>
                      {name?.charAt(0)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: ink }}>{name}</span>
                      {isBand && <span style={{ ...mono, fontSize: 8, color: memberColor, letterSpacing: '1px', textTransform: 'uppercase' }}>artist</span>}
                    </div>
                    <span style={{ ...mono, fontSize: 10, color: SLATE + '88', marginLeft: 'auto' }}>{timeAgo(post.created_at)}</span>
                  </div>

                  {/* Image(s) */}
                  {hasImage && (
                    <div onClick={() => setLightboxUrl(images[0])} style={{ cursor: 'pointer', position: 'relative', marginBottom: post.content ? 16 : 0, borderRadius: 14, overflow: 'hidden' }}>
                      <img src={images[0]} alt="" style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block' }} />
                      {images.length > 1 && (
                        <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', color: '#fff', borderRadius: 20, padding: '4px 12px', ...mono, fontSize: 10 }}>+{images.length - 1} more</div>
                      )}
                    </div>
                  )}

                  {/* Audio */}
                  {post.audio_url && !hasImage && (
                    <div style={{ background: ink, borderRadius: 14, padding: '22px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: post.content ? 16 : 0 }}>
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: ruby, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: cream, flexShrink: 0 }}>♫</div>
                      <audio controls style={{ flex: 1, height: 34 }}><source src={post.audio_url} /></audio>
                    </div>
                  )}

                  {/* Text */}
                  {post.content && (
                    <p style={{ fontSize: 16, lineHeight: 1.7, color: ink + 'DD', whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {post.content}
                    </p>
                  )}

                  {post.content?.length > 280 && (
                    <a href={joinUrl} style={{ display: 'inline-block', marginTop: 10, ...mono, fontSize: 11, color: ruby, textDecoration: 'none', letterSpacing: '0.3px' }}>join to read more →</a>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* STICKY JOIN BANNER */}
      <div style={{ position: 'sticky', bottom: 0, zIndex: 50, background: ink + 'F2', backdropFilter: 'blur(16px)', borderTop: `1px solid ${cream}12`, padding: '14px 20px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: cream, textTransform: 'lowercase' }}>want in?</div>
            <div style={{ ...mono, fontSize: 9, color: cream + '55', marginTop: 2, letterSpacing: '0.3px' }}>posts · exclusive content · rewards · shows</div>
          </div>
          <a href={joinUrl} style={{ background: ruby, color: cream, padding: '11px 22px', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
            join free ✦
          </a>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <img src={lightboxUrl} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }} />
          <button onClick={() => setLightboxUrl(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 20, width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      )}
    </div>
  );
}
