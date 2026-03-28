'use client';
import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase-browser';

function timeAgo(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export function PublicPage({ tenantId }) {
  const [tenant, setTenant] = useState(null);
  const [config, setConfig] = useState({});
  const [members, setMembers] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [shows, setShows] = useState([]);
  const [fanCount, setFanCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [joining, setJoining] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('join'); // join | magic
  const [authError, setAuthError] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState(null);

  useEffect(() => {
    if (!tenantId) return;
    const sb = getSupabase();
    (async () => {
      const [tRes, cfgRes, memRes, postsRes, showsRes, fansRes] = await Promise.all([
        sb.from('tenants').select('*').eq('id', tenantId).single(),
        sb.from('tenant_config').select('key, value').eq('tenant_id', tenantId),
        sb.from('tenant_members').select('*').eq('tenant_id', tenantId).order('display_order'),
        sb.from('posts').select('*, profiles!posts_author_id_fkey(display_name, role, band_member)').eq('tenant_id', tenantId).eq('is_highlight', true).order('created_at', { ascending: false }).limit(6),
        sb.from('shows').select('*').eq('tenant_id', tenantId).gte('date', new Date().toISOString().split('T')[0]).order('date').limit(4),
        sb.from('profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      ]);

      if (tRes.data) setTenant(tRes.data);
      const cfg = {};
      (cfgRes.data || []).forEach(({ key, value }) => { cfg[key] = value; });
      setConfig(cfg);

      // Apply brand colours
      if (cfg.color_ruby) document.documentElement.style.setProperty('--ruby', cfg.color_ruby);
      if (cfg.color_cream) document.documentElement.style.setProperty('--cream', cfg.color_cream);
      if (cfg.color_ink) document.documentElement.style.setProperty('--ink', cfg.color_ink);

      const map = {};
      (memRes.data || []).forEach(m => { map[m.slug] = m; });
      setMembers(memRes.data || []);
      setHighlights(postsRes.data || []);
      setShows(showsRes.data || []);
      setFanCount(fansRes.count || 0);
      setLoading(false);
    })();
  }, [tenantId]);

  const sendMagicLink = async () => {
    if (!email.trim()) { setAuthError('enter your email'); return; }
    setJoining(true); setAuthError('');
    const sb = getSupabase();
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    if (error) { setAuthError(error.message); setJoining(false); return; }
    setMagicSent(true); setJoining(false);
  };

  const signUp = async () => {
    if (!displayName.trim() || !email.trim() || !password) { setAuthError('all fields required'); return; }
    if (password.length < 8) { setAuthError('password must be at least 8 characters'); return; }
    setJoining(true); setAuthError('');
    const sb = getSupabase();
    const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim() } } });
    if (error) { setAuthError(error.message); setJoining(false); return; }
    if (data?.session && tenantId) {
      await sb.from('profiles').insert({ id: data.user.id, tenant_id: tenantId, display_name: displayName.trim(), role: 'fan', stamp_count: 0, stamp_level: 'first_press', email_notifications: true }).catch(() => {});
      window.location.href = '/';
    } else {
      setAuthError('check your email to confirm your account');
      setJoining(false);
    }
  };

  const ruby = config.color_ruby || '#8B1A2B';
  const cream = config.color_cream || '#F5EFE6';
  const ink = config.color_ink || '#1A1018';
  const SLATE = '#6A5A62'; const BORDER = '#E8DDD4'; const SURFACE = '#FAF5F0';
  const tenantName = tenant?.name || 'flock';
  const tagline = config.tagline || '';
  const logoUrl = config.logo_url || null;
  const bannerUrl = config.banner_url || null;
  const currencyName = config.currency_name || 'points';
  const currencyIcon = config.currency_icon || '✦';

  const socials = [
    config.social_instagram && { label: 'instagram', url: `https://instagram.com/${config.social_instagram}`, icon: '◉' },
    config.social_tiktok && { label: 'tiktok', url: `https://tiktok.com/@${config.social_tiktok}`, icon: '◈' },
    config.social_spotify && { label: 'spotify', url: config.social_spotify.startsWith('http') ? config.social_spotify : `https://open.spotify.com/artist/${config.social_spotify}`, icon: '♫' },
    config.social_apple_music && { label: 'apple music', url: config.social_apple_music, icon: '♪' },
    config.social_youtube && { label: 'youtube', url: config.social_youtube, icon: '▶' },
    config.social_website && { label: 'website', url: config.social_website.startsWith('http') ? config.social_website : `https://${config.social_website}`, icon: '↗' },
  ].filter(Boolean);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, color: ruby }}>✦</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: cream, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        * { box-sizing: border-box; }
      `}</style>

      {/* HERO */}
      <div style={{ position: 'relative', overflow: 'hidden', background: ink, minHeight: 340 }}>
        {bannerUrl && <img src={bannerUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${ink}66, ${ink}EE)` }} />

        {/* Flock badge */}
        <div style={{ position: 'absolute', top: 16, right: 20, display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: cream + '44', letterSpacing: '1px' }}>powered by</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: cream + '55' }}>flock</div>
        </div>

        <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto', padding: '56px 24px 44px', animation: 'fadeUp 0.6s ease-out' }}>
          {logoUrl
            ? <img src={logoUrl} alt={tenantName} style={{ height: 52, maxWidth: 220, objectFit: 'contain', display: 'block', marginBottom: 16, filter: 'brightness(0) invert(1)' }} />
            : <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 44, fontWeight: 700, color: cream, textTransform: 'lowercase', lineHeight: 1, marginBottom: 10, letterSpacing: '-1px' }}>{tenantName}</div>
          }
          {tagline && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: cream + '88', lineHeight: 1.6, marginBottom: 20 }}>{tagline}</div>}

          {/* Fan count */}
          {fanCount > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: cream + '12', border: `1px solid ${cream}1A`, borderRadius: 20, padding: '5px 12px', marginBottom: 20 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: cream + '77' }}>{fanCount} {fanCount === 1 ? 'fan' : 'fans'} inside</span>
            </div>
          )}

          {/* Socials */}
          {socials.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
              {socials.map(s => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: cream + '10', border: `1px solid ${cream}18`, borderRadius: 20, textDecoration: 'none' }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: cream + '77' }}>{s.icon} {s.label}</span>
                </a>
              ))}
            </div>
          )}

          {/* Join CTA */}
          <button onClick={() => setShowLogin(true)}
            style={{ background: ruby, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            join the community {currencyIcon}
          </button>
          <div style={{ marginTop: 10, fontFamily: "'DM Mono', monospace", fontSize: 9, color: cream + '44' }}>
            free to join · earn {currencyName} · exclusive content
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px' }}>

        {/* UPCOMING SHOWS */}
        {shows.length > 0 && (
          <div style={{ padding: '28px 0' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 14 }}>upcoming shows</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {shows.map(show => (
                <div key={show.id} style={{ background: SURFACE, borderRadius: 10, padding: '14px 16px', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ background: ink, borderRadius: 8, padding: '10px 12px', textAlign: 'center', minWidth: 52, flexShrink: 0 }}>
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
                  {show.ticket_url
                    ? <a href={show.ticket_url} target="_blank" rel="noopener noreferrer" style={{ background: ruby, color: '#fff', padding: '8px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>tickets</a>
                    : <button onClick={() => setShowLogin(true)} style={{ background: 'transparent', color: ruby, border: `1px solid ${ruby}44`, padding: '7px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>check in {currencyIcon}</button>
                  }
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HIGHLIGHTS */}
        {highlights.length > 0 && (
          <div style={{ padding: '4px 0 32px' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 14 }}>from inside the community</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {highlights.map((post, idx) => {
                const prof = post.profiles || {};
                const isBand = prof.role === 'band' || prof.role === 'admin';
                const name = prof.display_name?.toLowerCase() || 'fan';
                const hasImage = post.image_url || post.images?.length > 0;
                return (
                  <div key={post.id} style={{ background: SURFACE, borderRadius: 12, overflow: 'hidden', border: `1px solid ${BORDER}`, animation: `fadeUp 0.4s ease-out ${idx * 0.05}s both` }}>
                    {hasImage && (
                      <img src={post.images?.[0] || post.image_url} alt="" onClick={() => setLightboxUrl(post.images?.[0] || post.image_url)}
                        style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block', cursor: 'pointer' }} />
                    )}
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 6, background: isBand ? ink : BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: "'DM Mono', monospace", color: isBand ? cream : SLATE, fontWeight: 600 }}>
                          {isBand ? '✦' : name.charAt(0)}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: ink }}>{name}</div>
                        {isBand && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: ruby, border: `1px solid ${ruby}44`, padding: '1px 5px', borderRadius: 3 }}>band</div>}
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '77', marginLeft: 'auto' }}>{timeAgo(post.created_at)}</div>
                      </div>
                      {post.content && (
                        <p style={{ fontSize: 13, lineHeight: 1.6, color: ink + 'CC', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {post.content}
                        </p>
                      )}
                      {post.content?.length > 120 && (
                        <button onClick={() => setShowLogin(true)} style={{ marginTop: 6, fontFamily: "'DM Mono', monospace", fontSize: 10, color: ruby, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          join to read more →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No highlights - show teaser */}
        {highlights.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>{currencyIcon}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE, lineHeight: 1.7 }}>
              exclusive posts, show check-ins, rewards.<br />join to be part of it.
            </div>
          </div>
        )}
      </div>

      {/* STICKY JOIN BAR */}
      {!showLogin && (
        <div style={{ position: 'sticky', bottom: 0, zIndex: 50, background: ink + 'F2', backdropFilter: 'blur(16px)', borderTop: `1px solid ${cream}10`, padding: '12px 20px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: cream, textTransform: 'lowercase' }}>want in?</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: cream + '55', marginTop: 1 }}>free to join · {currencyName} · exclusive content</div>
            </div>
            <button onClick={() => setShowLogin(true)}
              style={{ background: ruby, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
              join free {currencyIcon}
            </button>
          </div>
        </div>
      )}

      {/* JOIN / LOGIN SHEET */}
      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setShowLogin(false)}>
          <div style={{ background: cream, borderRadius: '20px 20px 0 0', padding: '28px 24px 48px', width: '100%', maxWidth: 560, animation: 'fadeUp 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: BORDER, margin: '0 auto 24px' }} />

            {magicSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✉</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: ink, textTransform: 'lowercase', marginBottom: 8 }}>check your email</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, lineHeight: 1.7 }}>
                  magic link sent to <strong style={{ color: ruby }}>{email}</strong>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${BORDER}`, marginBottom: 24 }}>
                  {[{ id: 'join', label: 'join' }, { id: 'magic', label: 'sign in' }].map(tab => (
                    <button key={tab.id} onClick={() => { setAuthMode(tab.id); setAuthError(''); }}
                      style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: authMode === tab.id ? `2px solid ${ruby}` : '2px solid transparent', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: authMode === tab.id ? ruby : SLATE, fontWeight: authMode === tab.id ? 600 : 400, letterSpacing: '1px', textTransform: 'uppercase' }}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {authMode === 'join' && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>your name</label>
                    <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="how you'll appear in the community" autoFocus
                      style={{ width: '100%', padding: '12px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, color: ink, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && (authMode === 'magic' ? sendMagicLink() : signUp())} placeholder="you@example.com" autoFocus={authMode === 'magic'}
                    style={{ width: '100%', padding: '12px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, color: ink, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
                </div>

                {authMode === 'join' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && signUp()} placeholder="at least 8 characters"
                      style={{ width: '100%', padding: '12px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, color: ink, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
                  </div>
                )}

                {authMode === 'magic' && (
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + '99', marginBottom: 16, lineHeight: 1.6 }}>
                    we'll email you a link · click it · you're in
                  </div>
                )}

                {authError && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: ruby, marginBottom: 12 }}>{authError}</div>}

                <button onClick={authMode === 'magic' ? sendMagicLink : signUp} disabled={joining}
                  style={{ width: '100%', padding: '14px', background: ruby, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: joining ? 0.7 : 1 }}>
                  {joining ? '...' : authMode === 'magic' ? 'send magic link' : `join ${tenantName} ${currencyIcon}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
