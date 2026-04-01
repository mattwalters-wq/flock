'use client';
import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase-browser';

const STREAMING_ICONS = {
  spotify: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>,
  apple_music: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043A5.022 5.022 0 0019.7.25C18.96.085 18.21.04 17.46.012c-.15-.01-.3-.01-.44-.012H6.98c-.15.002-.3.002-.44.012C5.79.04 5.04.085 4.3.25a5.023 5.023 0 00-1.874.64C1.307 1.634.562 2.634.245 3.944a9.23 9.23 0 00-.24 2.19C.003 6.284 0 6.43 0 6.58v10.84c0 .15.003.3.005.45a9.23 9.23 0 00.24 2.19c.317 1.31 1.062 2.31 2.18 3.043a5.022 5.022 0 001.874.64c.74.165 1.49.21 2.24.238.15.01.3.01.44.012h10.04c.15-.002.3-.002.44-.012.75-.028 1.5-.073 2.24-.238a5.022 5.022 0 001.874-.64c1.118-.733 1.863-1.733 2.18-3.043a9.23 9.23 0 00.24-2.19c.002-.15.005-.3.005-.45V6.58c0-.15-.003-.3-.005-.45zM17.46 12v3.72c0 .03 0 .05-.002.08a1.17 1.17 0 01-.362.795 1.594 1.594 0 01-.9.395c-.39.06-.78-.03-1.09-.27-.31-.24-.5-.58-.55-.96a1.236 1.236 0 01.21-.87c.22-.31.55-.51.92-.58l.63-.13c.22-.05.37-.2.41-.42.01-.05.01-.11.01-.17V9.35c0-.27-.13-.42-.39-.38l-4.87.95c-.23.06-.33.19-.34.43v6.09a1.766 1.766 0 01-.088.47 1.17 1.17 0 01-.362.545 1.594 1.594 0 01-.9.395c-.39.06-.78-.03-1.09-.27-.31-.24-.5-.58-.55-.96a1.236 1.236 0 01.21-.87c.22-.31.55-.51.92-.58l.63-.13c.22-.05.37-.2.41-.42.02-.1.02-.2.02-.3V8.18c0-.35.14-.59.46-.68l5.83-1.34c.1-.02.2-.04.3-.04.32 0 .49.17.49.5V12z"/></svg>,
  youtube: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  bandcamp: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M0 18.75l7.437-13.5H24l-7.438 13.5H0z"/></svg>,
  instagram: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
  tiktok: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
};

function getSpotifyEmbedUrl(url) {
  if (!url) return null;
  // Convert spotify URL to embed URL
  // e.g. https://open.spotify.com/artist/xxx -> https://open.spotify.com/embed/artist/xxx
  if (url.includes('spotify.com/embed')) return url;
  if (url.includes('open.spotify.com')) {
    return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
  }
  return null;
}

export function PublicPage({ tenantId }) {
  const [tenant, setTenant] = useState(null);
  const [config, setConfig] = useState({});
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [shows, setShows] = useState([]);
  const [fanCount, setFanCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAllShows, setShowAllShows] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [todayShow, setTodayShow] = useState(null);
  const [modalMode, setModalMode] = useState('join'); // join | password
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    const sb = getSupabase();
    (async () => {
      const [tRes, cfgRes, memRes, postsRes, showsRes, fansRes] = await Promise.all([
        sb.from('tenants').select('*').eq('id', tenantId).single(),
        sb.from('tenant_config').select('key, value').eq('tenant_id', tenantId),
        sb.from('tenant_members').select('*').eq('tenant_id', tenantId).order('display_order'),
        sb.from('posts').select('*, profiles!posts_author_id_fkey(display_name, role, band_member)').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(4),
        sb.from('shows').select('*').eq('tenant_id', tenantId).gte('date', new Date().toISOString().split('T')[0]).order('date'),
        sb.from('profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      ]);

      if (tRes.data) setTenant(tRes.data);
      const cfg = {};
      (cfgRes.data || []).forEach(({ key, value }) => { cfg[key] = value; });
      setConfig(cfg);

      if (cfg.color_ruby) document.documentElement.style.setProperty('--ruby', cfg.color_ruby);
      if (cfg.color_cream) document.documentElement.style.setProperty('--cream', cfg.color_cream);
      if (cfg.color_ink) document.documentElement.style.setProperty('--ink', cfg.color_ink);

      setMembers(memRes.data || []);
      setPosts(postsRes.data || []);
      setShows(showsRes.data || []);
      setFanCount(fansRes.count || 0);

      // Check for today's show
      const todayStr = new Date().toISOString().split('T')[0];
      const todayMatch = (showsRes.data || []).find(s => s.date === todayStr);
      if (todayMatch) setTodayShow(todayMatch);

      setLoading(false);

      // Show welcome modal after 800ms - same as stamps-land
      setTimeout(() => setShowModal(true), 800);
    })();
  }, [tenantId]);

  const ruby = config.color_ruby || '#8B1A2B';
  const cream = config.color_cream || '#F5EFE6';
  const ink = config.color_ink || '#1A1018';
  const SLATE = '#8A7A82';
  const OFF_WHITE = '#F5EFE6';
  const BORDER = '#E8E2D8';

  const tenantName = tenant?.name || 'flock';
  const tagline = config.tagline || '';
  const bio = config.bio || '';
  const logoUrl = config.logo_url || null;
  const currencyName = config.currency_name || 'points';
  const currencyIcon = config.currency_icon || '✦';
  const spotifyEmbed = getSpotifyEmbedUrl(config.social_spotify);

  const memberNames = members.map(m => m.name?.toLowerCase()).filter(Boolean);

  const streamingLinks = [
    config.social_spotify && { key: 'spotify', label: 'Spotify', url: config.social_spotify.startsWith('http') ? config.social_spotify : `https://open.spotify.com/artist/${config.social_spotify}` },
    config.social_apple_music && { key: 'apple_music', label: 'Apple Music', url: config.social_apple_music },
    config.social_youtube && { key: 'youtube', label: 'YouTube', url: config.social_youtube },
    config.social_website && { key: 'website', label: 'Website', url: config.social_website.startsWith('http') ? config.social_website : `https://${config.social_website}` },
  ].filter(Boolean);

  const socialLinks = [
    config.social_instagram && { key: 'instagram', url: `https://instagram.com/${config.social_instagram}` },
    config.social_tiktok && { key: 'tiktok', url: `https://tiktok.com/@${config.social_tiktok}` },
  ].filter(Boolean);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  };

  const signInWithPassword = async () => {
    if (!email.trim() || !password) { setAuthError('email and password required'); return; }
    setSubmitting(true); setAuthError('');
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setAuthError(error.message); setSubmitting(false); return; }
    if (data?.session) window.location.href = '/';
  };

  const signUp = async () => {
    if (!displayName.trim() || !email.trim() || !password) { setAuthError('all fields required'); return; }
    if (password.length < 8) { setAuthError('password must be at least 8 characters'); return; }
    setSubmitting(true); setAuthError('');
    const sb = getSupabase();
    try {
      const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim() } } });
      if (error) { setAuthError(error.message); setSubmitting(false); return; }
      // Try immediate sign-in so user goes straight to feed
      const { data: signInData } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      const session = signInData?.session || data?.session;
      if (session && tenantId) {
        try { await sb.from('profiles').insert({ id: data.user.id, tenant_id: tenantId, display_name: displayName.trim(), role: 'fan', stamp_count: 0, stamp_level: 'first_press', email_notifications: true }); } catch (_) {}
        window.location.href = '/';
      } else if (data?.user && tenantId) {
        try { await sb.from('profiles').insert({ id: data.user.id, tenant_id: tenantId, display_name: displayName.trim(), role: 'fan', stamp_count: 0, stamp_level: 'first_press', email_notifications: true }); } catch (_) {}
        window.location.href = '/';
      } else {
        setAuthError('something went wrong, please try again');
        setSubmitting(false);
      }
    } catch (err) {
      setAuthError('something went wrong, please try again');
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: ink || '#1A1018', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, color: '#F5EFE6' + '44' }}>✦</div>
    </div>
  );

  const visibleShows = showAllShows ? shows : shows.slice(0, 4);

  return (
    <div style={{ minHeight: '100vh', background: ink, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* WELCOME MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,16,24,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn 0.3s ease-out' }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: ink, borderRadius: 16, padding: '36px 28px', maxWidth: 340, width: '100%', textAlign: 'center', position: 'relative', border: `1px solid ${ruby}22`, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', animation: 'modalIn 0.3s ease-out' }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: cream + '44', fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>×</button>

            <div style={{ fontSize: 28, color: ruby, marginBottom: 14 }}>{currencyIcon}</div>

            {todayShow ? (
              <>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: ruby, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>tonight's show</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: cream, marginBottom: 4, lineHeight: 1.1 }}>{todayShow.city}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: cream + '77', marginBottom: 18 }}>{todayShow.venue}</div>
              </>
            ) : (
              <div style={{ fontSize: 24, fontWeight: 700, color: cream, marginBottom: 8, lineHeight: 1.2, textTransform: 'lowercase' }}>
                welcome to {tenantName.toLowerCase()}
              </div>
            )}

            <p style={{ fontSize: 13, color: cream + 'AA', lineHeight: 1.65, marginBottom: 22, maxWidth: 260, margin: '0 auto 22px' }}>
              {todayShow
                ? `join to check in at the show, earn ${currencyName}, and connect with the artist and other fans.`
                : bio || `the ${tenantName.toLowerCase()} fan community. post, earn ${currencyName}, and unlock exclusive rewards.`}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => { setShowModal(false); setModalMode('join'); setTimeout(() => document.getElementById('bottom-sheet-trigger')?.click(), 100); }}
                style={{ display: 'block', width: '100%', padding: '14px 28px', background: ruby, color: cream, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
                {todayShow ? `join and check in ${currencyIcon}` : `join free ${currencyIcon}`}
              </button>
              <button onClick={() => { setShowModal(false); setModalMode('password'); setTimeout(() => document.getElementById('bottom-sheet-trigger')?.click(), 100); }}
                style={{ display: 'block', width: '100%', padding: '12px 28px', background: 'transparent', color: cream + '77', border: `1px solid ${cream}22`, borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                sign in
              </button>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: cream + '33', marginTop: 14 }}>it's free · takes 30 seconds</div>
          </div>
        </div>
      )}

      {/* DARK HERO */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '52px 24px 36px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 320, height: 320, background: `radial-gradient(ellipse, ${ruby}11, transparent 70%)`, pointerEvents: 'none' }} />

        {/* Artist name / logo */}
        <div style={{ animation: 'fadeIn 0.6s ease-out', marginBottom: 6 }}>
          {logoUrl
            ? <img src={logoUrl} alt={tenantName} style={{ height: 56, maxWidth: 240, objectFit: 'contain', display: 'block', margin: '0 auto 8px', filter: 'brightness(0) invert(1)' }} />
            : <div style={{ fontSize: 44, fontWeight: 700, color: cream, textTransform: 'lowercase', lineHeight: 1, letterSpacing: '-1px' }}>{tenantName}</div>
          }
        </div>

        {/* Member names */}
        {memberNames.length > 0 && (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: cream + '66', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 32, animation: 'fadeIn 0.6s ease-out 0.1s both' }}>
            {memberNames.join(' · ')}
          </div>
        )}
        {memberNames.length === 0 && tagline && (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: cream + '77', marginBottom: 32, lineHeight: 1.6, animation: 'fadeIn 0.6s ease-out 0.1s both' }}>{tagline}</div>
        )}

        {/* Spotify embed */}
        {spotifyEmbed && (
          <div style={{ marginBottom: 28, animation: 'fadeIn 0.6s ease-out 0.2s both' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: cream + '44', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10 }}>now playing</div>
            <div style={{ borderRadius: 10, overflow: 'hidden' }}>
              <iframe style={{ border: 'none', display: 'block' }} src={spotifyEmbed} width="100%" height="152"
                allowFullScreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
            </div>
          </div>
        )}

        {/* Streaming links */}
        {streamingLinks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, animation: 'fadeIn 0.6s ease-out 0.3s both' }}>
            {streamingLinks.map(link => (
              <a key={link.key} href={link.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: cream, textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = `${ruby}22`; e.currentTarget.style.borderColor = `${ruby}44`; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                {STREAMING_ICONS[link.key] || null}
                {link.label}
              </a>
            ))}
          </div>
        )}

        {/* Social icon circles */}
        {socialLinks.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, animation: 'fadeIn 0.6s ease-out 0.4s both' }}>
            {socialLinks.map(link => (
              <a key={link.key} href={link.url} target="_blank" rel="noopener noreferrer"
                style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cream, textDecoration: 'none', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = `${ruby}22`; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
                {STREAMING_ICONS[link.key] || null}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* GRADIENT TRANSITION dark -> light */}
      <div style={{ background: `linear-gradient(180deg, ${ink} 0%, ${ink}CC 30%, ${cream} 100%)`, height: 80 }} />

      {/* LIGHT SECTION */}
      <div style={{ background: cream }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px 60px' }}>

          {/* Shows */}
          {shows.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 12 }}>
                upcoming shows · {shows.length} {shows.length === 1 ? 'date' : 'dates'}
              </div>
              {visibleShows.map(show => (
                <div key={show.id} onClick={() => show.ticket_url && window.open(show.ticket_url, '_blank')}
                  style={{ background: OFF_WHITE, borderRadius: 4, padding: '13px 16px', marginBottom: 6, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 14, cursor: show.ticket_url ? 'pointer' : 'default' }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, minWidth: 52 }}>{formatDate(show.date)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>
                      {show.city}
                      {show.country && show.country !== 'AU' && <span style={{ color: SLATE, fontWeight: 400 }}> {show.country}</span>}
                    </div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + 'AA', marginTop: 2 }}>{show.venue}</div>
                  </div>
                  {show.status === 'sold_out'
                    ? <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: ruby, letterSpacing: '0.8px', textTransform: 'uppercase' }}>sold out</span>
                    : show.status === 'door_sales'
                    ? <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#C9922A', letterSpacing: '0.8px', textTransform: 'uppercase' }}>on the door</span>
                    : show.ticket_url
                    ? <span style={{ background: ink, color: cream, borderRadius: 3, padding: '6px 12px', fontSize: 10, fontWeight: 600 }}>tickets</span>
                    : null}
                </div>
              ))}
              {shows.length > 4 && (
                <button onClick={() => setShowAllShows(s => !s)}
                  style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: 8, padding: '10px', background: 'transparent', border: `1px solid ${SLATE}44`, borderRadius: 4, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: ruby }}>
                  {showAllShows ? 'show less' : `see all ${shows.length} dates`}
                </button>
              )}
            </div>
          )}

          {/* Community teaser posts */}
          {posts.length > 0 && (
            <div style={{ marginBottom: 24, position: 'relative' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 12 }}>
                inside {tenantName.toLowerCase()}
              </div>
              <div style={{ position: 'relative' }}>
                {posts.slice(0, 3).map((post, i) => {
                  const prof = post.profiles || {};
                  const isBand = prof.role === 'band' || prof.role === 'admin';
                  const name = isBand
                    ? (members.find(m => m.slug === prof.band_member)?.name?.toLowerCase() || prof.display_name?.toLowerCase() || 'band')
                    : prof.display_name?.toLowerCase() || 'fan';
                  const memberColor = isBand ? ruby : null;
                  const borderLeft = isBand ? `3px solid ${memberColor}` : undefined;

                  return (
                    <div key={post.id} style={{ background: OFF_WHITE, borderRadius: 4, padding: '14px 16px', marginBottom: 6, border: `1px solid ${BORDER}`, borderLeft, filter: i === 0 ? 'none' : `blur(${i * 2}px)`, opacity: 1 - (i * 0.2), pointerEvents: 'none', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 4, background: isBand ? ruby : BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: "'DM Mono', monospace", color: isBand ? cream : SLATE, fontWeight: 600 }}>
                          {isBand ? currencyIcon : name.charAt(0)}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{name}</span>
                        {isBand && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: ruby, border: `1px solid ${ruby}44`, padding: '1px 5px', borderRadius: 2 }}>band</span>}
                      </div>
                      <p style={{ fontSize: 12, color: ink + 'BB', lineHeight: 1.55, margin: 0 }}>
                        {post.content?.length > 100 ? post.content.slice(0, 100) + '...' : post.content}
                      </p>
                    </div>
                  );
                })}

                {/* Fade + CTA overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: `linear-gradient(180deg, transparent 0%, ${cream} 55%)`, padding: '60px 0 0', display: 'flex', justifyContent: 'center' }}>
                  <button id="bottom-sheet-trigger" onClick={() => { setModalMode('join'); setShowModal(false); document.getElementById('auth-sheet').style.display = 'flex'; }}
                    style={{ background: ruby, color: cream, borderRadius: 4, padding: '14px 28px', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, boxShadow: `0 2px 12px ${ruby}44` }}>
                    join {tenantName.toLowerCase()} {currencyIcon}
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: 12, fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + '88' }}>
                post, comment, earn {currencyName}, unlock exclusive content
              </div>
            </div>
          )}

          {/* Community CTA card */}
          <div style={{ background: ink, borderRadius: 4, padding: '32px 22px', textAlign: 'center', border: `1px solid ${ruby}22`, marginBottom: 32 }}>
            <div style={{ fontSize: 28, marginBottom: 12, color: ruby }}>{currencyIcon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: cream, textTransform: 'lowercase', marginBottom: 14 }}>{tenantName.toLowerCase()}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300, margin: '0 auto 22px', textAlign: 'left' }}>
              {[
                memberNames.length > 0 ? `personal feeds from ${memberNames.join(', ')}` : `direct posts from ${tenantName.toLowerCase()}`,
                `earn ${currencyName} for posting, commenting, and showing up`,
                `unlock rewards as your ${currencyName} grow`,
                `connect with fans around the world`,
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: ruby, flexShrink: 0, marginTop: 1 }}>
                    {['◎', currencyIcon, '♛', '↩'][i]}
                  </span>
                  <span style={{ fontSize: 12, color: cream + 'AA', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => { setModalMode('join'); document.getElementById('auth-sheet').style.display = 'flex'; }}
                style={{ padding: '13px 28px', background: ruby, color: cream, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                join free
              </button>
              <button onClick={() => { setModalMode('password'); document.getElementById('auth-sheet').style.display = 'flex'; }}
                style={{ padding: '13px 28px', background: 'transparent', color: cream + '77', border: `1px solid ${cream}22`, borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                sign in
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '77', letterSpacing: '0.5px' }}>
            © 2026 {tenantName.toLowerCase()} · powered by <a href="https://fans-flock.com" style={{ color: SLATE + '55', textDecoration: 'none' }}>flock</a>
          </div>
        </div>
      </div>

      {/* AUTH BOTTOM SHEET */}
      <div id="auth-sheet" style={{ display: 'none', position: 'fixed', inset: 0, zIndex: 200, alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={() => { document.getElementById('auth-sheet').style.display = 'none'; }}>
        <div style={{ background: cream, borderRadius: '20px 20px 0 0', padding: '24px 24px 48px', width: '100%', maxWidth: 480, animation: 'sheetUp 0.3s ease-out' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E8DDD4', margin: '0 auto 20px' }} />

          <>
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E8DDD4', marginBottom: 20 }}>
                {[{ id: 'join', label: 'join' }, { id: 'password', label: 'sign in' }].map(tab => (
                  <button key={tab.id} onClick={() => { setModalMode(tab.id); setAuthError(''); }}
                    style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: modalMode === tab.id ? `2px solid ${ruby}` : '2px solid transparent', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: modalMode === tab.id ? ruby : SLATE, fontWeight: modalMode === tab.id ? 600 : 400, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {modalMode === 'join' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 5 }}>your name</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="how you'll appear in the community" autoFocus
                    style={{ width: '100%', padding: '12px 14px', background: '#FAF5F0', border: '1px solid #E8DDD4', borderRadius: 10, fontSize: 14, color: ink, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 5 }}>email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus={modalMode === 'password'}
                  style={{ width: '100%', padding: '12px 14px', background: '#FAF5F0', border: '1px solid #E8DDD4', borderRadius: 10, fontSize: 14, color: ink, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
              </div>
              <div style={{ marginBottom: 16, position: 'relative' }}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 5 }}>password</label>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="at least 8 characters"
                  style={{ width: '100%', padding: '12px 44px 12px 14px', background: '#FAF5F0', border: '1px solid #E8DDD4', borderRadius: 10, fontSize: 14, color: ink, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
                <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, top: '60%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE + '88', padding: 4 }}>{showPw ? 'hide' : 'show'}</button>
              </div>
              {authError && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: ruby, marginBottom: 12 }}>{authError}</div>}
              <button onClick={modalMode === 'password' ? signInWithPassword : signUp} disabled={submitting}
                style={{ width: '100%', padding: '14px', background: ruby, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}>
                {submitting ? '...' : modalMode === 'password' ? 'sign in' : `join ${tenantName.toLowerCase()} ${currencyIcon}`}
              </button>
            </>
        </div>
      </div>
    </div>
  );
}
