'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============ ONBOARDING FORM ============

const CURRENCY_PRESETS = [
  { name: 'points', icon: '✦', desc: 'universal, clean' },
  { name: 'stamps', icon: '◉', desc: 'classic, tactile' },
  { name: 'chips', icon: '◈', desc: 'playful, gamey' },
  { name: 'pins', icon: '○', desc: 'collectible, physical' },
  { name: 'echoes', icon: '◎', desc: 'ethereal, musical' },
  { name: 'drops', icon: '●', desc: 'electronic, hype' },
  { name: 'tokens', icon: '◐', desc: 'retro, tangible' },
  { name: 'sparks', icon: '✺', desc: 'energetic, bright' },
  { name: 'custom', icon: '✎', desc: 'name it yourself' },
];

function OnboardingForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const [account, setAccount] = useState({ email: '', password: '', fullName: '' });
  const [community, setCommunity] = useState({ name: '', slug: '', tagline: '' });
  const [branding, setBranding] = useState({ primaryColor: '#8B1A2B', secondaryColor: '#D4A5A0' });
  const [currency, setCurrency] = useState({ name: 'points', icon: '✦', customName: '', customIcon: '' });
  const [membersData, setMembersData] = useState({ actType: 'solo', members: [{ name: '', color: '#8B1A2B' }] });

  const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
  const INK = '#1A1018'; const CREAM = '#F5EFE6'; const RUBY = '#8B1A2B';
  const SLATE = '#6A5A62'; const SURFACE = '#FAF5F0'; const BORDER = '#E8DDD4';
  const WARM_GOLD = '#C9922A';

  const slugify = str => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const checkSlug = async (slug) => {
    if (!slug) return;
    setCheckingSlug(true);
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data } = await sb.from('tenants').select('id').eq('slug', slug).single();
    setSlugAvailable(!data);
    setCheckingSlug(false);
  };

  const handleComplete = async () => {
    setLoading(true); setError('');
    const finalCurrencyName = currency.name === 'custom' ? currency.customName : currency.name;
    const finalCurrencyIcon = currency.name === 'custom' ? (currency.customIcon || '✦') : (CURRENCY_PRESETS.find(p => p.name === currency.name)?.icon || '✦');
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, community, branding, currency: { name: finalCurrencyName, icon: finalCurrencyIcon }, members: membersData }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'something went wrong'); setLoading(false); return; }

      // Sign the user in before redirecting to their new community
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      await sb.auth.signInWithPassword({ email: account.email, password: account.password });

      // Redirect to their new community - they'll land logged in
      window.location.href = `https://${community.slug}.${APP_DOMAIN}?welcome=1`;
    } catch (e) { setError(e.message); setLoading(false); }
  };

  const stepTitles = ['account', 'community', 'currency', 'branding', 'members'];

  return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 20px 40px', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{ width: '100%', maxWidth: 480, animation: 'fadeIn 0.5s ease-out' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/start" style={{ textDecoration: 'none' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20, color: CREAM }}>✦</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>flock</div>
          </a>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 4 }}>fan communities for independent artists</div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, justifyContent: 'center' }}>
          {stepTitles.map((title, i) => (
            <div key={title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: step > i + 1 ? RUBY : step === i + 1 ? RUBY : BORDER, color: step >= i + 1 ? '#fff' : SLATE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono', monospace", transition: 'all 0.2s' }}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: step === i + 1 ? RUBY : SLATE }}>{title}</div>
            </div>
          ))}
        </div>

        <div style={{ background: SURFACE, borderRadius: 16, padding: '28px 24px', border: `1px solid ${BORDER}` }}>
          {step === 1 && (
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 6, textTransform: 'lowercase' }}>create your account</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 24 }}>you'll use this to manage your community</div>
              {[{ label: 'full name', key: 'fullName', type: 'text', placeholder: 'your name' }, { label: 'email', key: 'email', type: 'email', placeholder: 'you@example.com' }, { label: 'password', key: 'password', type: 'password', placeholder: 'at least 8 characters' }].map(({ label, key, type, placeholder }) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>{label}</label>
                  <input type={type} value={account[key]} onChange={e => setAccount(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} style={{ width: '100%', padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
                </div>
              ))}
              {error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginBottom: 12 }}>{error}</div>}
              <button onClick={() => { if (!account.email || !account.password || !account.fullName) { setError('all fields required'); return; } if (account.password.length < 8) { setError('password must be at least 8 characters'); return; } setError(''); setStep(2); }} style={{ width: '100%', padding: '13px', background: RUBY, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>continue →</button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 6, textTransform: 'lowercase' }}>name your community</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 24 }}>this is how fans will find you</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>community name</label>
                <input type="text" value={community.name} onChange={e => { const name = e.target.value; setCommunity(p => ({ ...p, name, slug: slugify(name) })); setSlugAvailable(null); }} placeholder="e.g. The Stamps, Emma Donovan" style={{ width: '100%', padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>url slug</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" value={community.slug} onChange={e => { setCommunity(p => ({ ...p, slug: slugify(e.target.value) })); setSlugAvailable(null); }} onBlur={() => community.slug && checkSlug(community.slug)} placeholder="your-artist-name" style={{ flex: 1, padding: '11px 14px', background: CREAM, border: `1px solid ${slugAvailable === false ? RUBY : slugAvailable === true ? '#7D8B6A' : BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Mono', monospace", boxSizing: 'border-box' }} />
                  <button onClick={() => checkSlug(community.slug)} disabled={!community.slug || checkingSlug} style={{ padding: '11px 14px', background: BORDER, color: SLATE, border: 'none', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}>{checkingSlug ? '...' : 'check'}</button>
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginTop: 6 }}>
                  {community.slug && <span style={{ color: SLATE + '88' }}>{community.slug}.{APP_DOMAIN}</span>}
                  {slugAvailable === true && <span style={{ color: '#7D8B6A', marginLeft: 8 }}>✓ available</span>}
                  {slugAvailable === false && <span style={{ color: RUBY, marginLeft: 8 }}>✗ taken</span>}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>tagline</label>
                <input type="text" value={community.tagline} onChange={e => setCommunity(p => ({ ...p, tagline: e.target.value }))} placeholder="a short description" style={{ width: '100%', padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
              </div>
              {error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginBottom: 12 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep(1)} style={{ padding: '13px 20px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>← back</button>
                <button onClick={() => { if (!community.name || !community.slug) { setError('name and slug required'); return; } if (slugAvailable === false) { setError('that slug is taken'); return; } setError(''); setStep(3); }} style={{ flex: 1, padding: '13px', background: RUBY, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>continue →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 6, textTransform: 'lowercase' }}>name your fan currency</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 24 }}>fans earn this for engaging. make it yours.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
                {CURRENCY_PRESETS.map(preset => (
                  <button key={preset.name} onClick={() => setCurrency(p => ({ ...p, name: preset.name }))} style={{ padding: '12px 8px', background: currency.name === preset.name ? RUBY + '11' : 'transparent', border: `1px solid ${currency.name === preset.name ? RUBY : BORDER}`, borderRadius: 10, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, marginBottom: 4, color: currency.name === preset.name ? RUBY : SLATE }}>{preset.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: currency.name === preset.name ? RUBY : INK }}>{preset.name}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: SLATE, marginTop: 2 }}>{preset.desc}</div>
                  </button>
                ))}
              </div>
              {currency.name === 'custom' && (
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 8, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 4 }}>currency name</label>
                    <input type="text" value={currency.customName} onChange={e => setCurrency(p => ({ ...p, customName: e.target.value }))} placeholder="e.g. crystals, vibes" style={{ width: '100%', padding: '10px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 4 }}>icon</label>
                    <input type="text" value={currency.customIcon} onChange={e => setCurrency(p => ({ ...p, customIcon: e.target.value.slice(0, 2) }))} placeholder="✦" style={{ width: '100%', padding: '10px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 18, color: INK, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} />
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep(2)} style={{ padding: '13px 20px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>← back</button>
                <button onClick={() => setStep(4)} style={{ flex: 1, padding: '13px', background: RUBY, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>continue →</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 6, textTransform: 'lowercase' }}>pick your colours</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 24 }}>defines your community's look and feel</div>
              {[{ label: 'primary colour', key: 'primaryColor', desc: 'buttons, accents, highlights' }, { label: 'secondary colour', key: 'secondaryColor', desc: 'soft accents and backgrounds' }].map(({ label, key, desc }) => (
                <div key={key} style={{ marginBottom: 20 }}>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>{label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <input type="color" value={branding[key]} onChange={e => setBranding(p => ({ ...p, [key]: e.target.value }))} style={{ width: 56, height: 44, padding: 3, border: `1px solid ${BORDER}`, borderRadius: 8, cursor: 'pointer' }} />
                    <div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: INK, fontWeight: 600 }}>{branding[key]}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, marginTop: 2 }}>{desc}</div>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep(3)} style={{ padding: '13px 20px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>← back</button>
                <button onClick={() => setStep(5)} style={{ flex: 1, padding: '13px', background: RUBY, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>continue →</button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 6, textTransform: 'lowercase' }}>add your members</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 20 }}>solo artist or a band?</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {['solo', 'band'].map(type => (
                  <button key={type} onClick={() => setMembersData(p => ({ ...p, actType: type, members: type === 'solo' ? [{ name: account.fullName || '', color: branding.primaryColor }] : p.members }))} style={{ flex: 1, padding: '10px', background: membersData.actType === type ? RUBY + '11' : 'transparent', border: `1px solid ${membersData.actType === type ? RUBY : BORDER}`, borderRadius: 8, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: membersData.actType === type ? RUBY : SLATE, fontWeight: membersData.actType === type ? 600 : 400 }}>
                    {type === 'solo' ? '○ solo artist' : '○○ band'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {membersData.members.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="text" value={m.name} onChange={e => setMembersData(p => ({ ...p, members: p.members.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} placeholder={membersData.actType === 'solo' ? 'your name' : `member ${i + 1}`} style={{ flex: 1, padding: '9px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
                    <input type="color" value={m.color} onChange={e => setMembersData(p => ({ ...p, members: p.members.map((x, j) => j === i ? { ...x, color: e.target.value } : x) }))} style={{ width: 40, height: 36, padding: 2, border: `1px solid ${BORDER}`, borderRadius: 6, cursor: 'pointer' }} />
                    {membersData.actType === 'band' && membersData.members.length > 1 && (
                      <button onClick={() => setMembersData(p => ({ ...p, members: p.members.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: RUBY + '66', fontSize: 16 }}>×</button>
                    )}
                  </div>
                ))}
              </div>
              {membersData.actType === 'band' && membersData.members.length < 6 && (
                <button onClick={() => setMembersData(p => ({ ...p, members: [...p.members, { name: '', color: '#888888' }] }))} style={{ background: 'none', border: `1px dashed ${BORDER}`, borderRadius: 8, padding: '8px', width: '100%', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, marginBottom: 16 }}>+ add member</button>
              )}
              {error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginBottom: 12 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep(4)} style={{ padding: '13px 20px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>← back</button>
                <button onClick={handleComplete} disabled={loading} style={{ flex: 1, padding: '13px', background: RUBY, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'launching...' : 'launch community ✦'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '77' }}>
          flock · fan communities for independent artists · <a href="/start" style={{ color: SLATE + '77', textDecoration: 'none' }}>← back to home</a>
        </div>
      </div>
    </div>
  );
}

// ============ MARKETING PAGE ============
function MarketingPage() {
  useEffect(() => {
    // Set meta tags for link previews
    const setMeta = (prop, content, attr = 'property') => {
      let el = document.querySelector(`meta[${attr}="${prop}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, prop); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    document.title = 'flock · fan communities for independent artists';
    setMeta('description', 'Social media broke the artist-fan relationship. Flock gives it back. Your community, your currency, your rules.', 'name');
    setMeta('og:type', 'website');
    setMeta('og:title', 'flock · fan communities for independent artists');
    setMeta('og:description', 'Social media broke the artist-fan relationship. Flock gives it back. Your community, your currency, your rules.');
    setMeta('og:image', 'https://fans-flock.com/og.png');
    setMeta('og:url', 'https://fans-flock.com/start');
    setMeta('twitter:card', 'summary_large_image', 'name');
    setMeta('twitter:title', 'flock · fan communities for independent artists', 'name');
    setMeta('twitter:description', 'Social media broke the artist-fan relationship. Flock gives it back.', 'name');
    setMeta('twitter:image', 'https://fans-flock.com/og.png', 'name');
  }, []);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#0E0C0F', color: '#F5EFE6', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .fade-1 { animation: fadeUp 0.8s ease-out 0.1s both; }
        .fade-2 { animation: fadeUp 0.8s ease-out 0.25s both; }
        .fade-3 { animation: fadeUp 0.8s ease-out 0.4s both; }
        .fade-4 { animation: fadeUp 0.8s ease-out 0.55s both; }
        .cta-btn { background: #8B1A2B; color: #F5EFE6; border: none; padding: 16px 36px; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; transition: all 0.2s; }
        .cta-btn:hover { background: #A31F33; transform: translateY(-1px); }
        .ghost-btn { background: transparent; color: #F5EFE6; border: 1px solid rgba(245,239,230,0.25); padding: 14px 28px; border-radius: 10px; font-size: 14px; cursor: pointer; text-decoration: none; display: inline-block; transition: all 0.2s; }
        .ghost-btn:hover { border-color: rgba(245,239,230,0.6); }
        .feature-card { background: rgba(245,239,230,0.04); border: 1px solid rgba(245,239,230,0.08); border-radius: 14px; padding: 28px; transition: all 0.2s; }
        .feature-card:hover { background: rgba(245,239,230,0.07); border-color: rgba(245,239,230,0.15); }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '18px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(14,12,15,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(245,239,230,0.06)' }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px' }}>flock <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#8B1A2B', letterSpacing: '2px', verticalAlign: 'middle', marginLeft: 4 }}>✦</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="#how" style={{ color: 'rgba(245,239,230,0.6)', textDecoration: 'none', fontSize: 13 }}>how it works</a>
          <a href="#pricing" style={{ color: 'rgba(245,239,230,0.6)', textDecoration: 'none', fontSize: 13 }}>pricing</a>
          <a href="/start?join=1" className="cta-btn" style={{ padding: '10px 22px', fontSize: 13 }}>get started</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: 800, height: 800, background: 'radial-gradient(circle, rgba(139,26,43,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="fade-1" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#8B1A2B', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 24 }}>✦ the future of fan relationships</div>
        <h1 className="fade-2" style={{ fontSize: 'clamp(48px, 8vw, 96px)', fontWeight: 700, lineHeight: 1.0, letterSpacing: '-2px', marginBottom: 28, maxWidth: 900 }}>
          social media<br /><span style={{ color: '#8B1A2B' }}>broke</span> the artist<br />fan relationship.
        </h1>
        <p className="fade-3" style={{ fontSize: 18, color: 'rgba(245,239,230,0.6)', lineHeight: 1.7, maxWidth: 540, marginBottom: 48 }}>
          You built an audience on platforms that own your fans, throttle your reach, and take the relationship hostage. Flock gives it back.
        </p>
        <div className="fade-4" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/start?join=1" className="cta-btn">launch your community ✦</a>
          <a href="#how" className="ghost-btn">see how it works</a>
        </div>
        <div className="fade-4" style={{ marginTop: 28 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#C9922A', background: 'rgba(201,146,42,0.1)', border: '1px solid rgba(201,146,42,0.25)', borderRadius: 20, padding: '8px 18px', letterSpacing: '0.5px' }}>✦ pricing coming soon · join free while we build</span>
        </div>
      </section>

      {/* PROBLEM */}
      <section style={{ padding: '100px 24px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#8B1A2B', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 20 }}>the problem</div>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 48 }}>
          you have 50,000 followers.<br /><span style={{ color: 'rgba(245,239,230,0.35)' }}>500 of them see your posts.</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {[
            { icon: '↓', title: 'organic reach is dead', desc: 'Instagram shows your post to 2-5% of followers. The rest costs money.' },
            { icon: '✗', title: "you don't own the list", desc: 'Platform shuts down or bans you. Your audience disappears overnight.' },
            { icon: '⌀', title: 'no real connection', desc: 'Likes and comments build dopamine loops for the platform, not loyalty for you.' },
            { icon: '↗', title: 'they take the relationship', desc: 'The platform has the data. The relationship. The leverage. You have the content.' },
          ].map(p => (
            <div key={p.title} className="feature-card">
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, color: '#8B1A2B', marginBottom: 12 }}>{p.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{p.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(245,239,230,0.5)', lineHeight: 1.6 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SOLUTION */}
      <section id="how" style={{ padding: '100px 24px', background: 'rgba(245,239,230,0.02)', borderTop: '1px solid rgba(245,239,230,0.06)', borderBottom: '1px solid rgba(245,239,230,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#8B1A2B', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 20 }}>the solution</div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 16 }}>your community.<br />your currency.<br />your rules.</h2>
          <p style={{ fontSize: 16, color: 'rgba(245,239,230,0.5)', lineHeight: 1.7, maxWidth: 520, marginBottom: 64 }}>Every artist gets a fully branded fan community with a custom loyalty system - their own economy, their own language, their own world. Oh, and it replaces your Linktree, your website, and your newsletter tool. All rolled into one.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 64 }}>
            {[
              { icon: '◎', title: 'your home on the internet', desc: 'A real URL that\'s yours. artist.fans-flock.com or your own domain. Replaces your Linktree, your bio link, your website - and actually does something.' },
              { icon: '✦', title: 'custom fan currency', desc: 'Call them stamps, points, chips, pins, echoes, drops - whatever fits your world. Your fans earn it, spend it, flex it.' },
              { icon: '○', title: 'member feeds', desc: 'Solo or band. Each member gets their own feed tab. Fans follow the people, not just the project.' },
              { icon: '♫', title: 'show check-ins', desc: 'Fans check in at shows with a code and earn currency. You get attendance data. Everyone wins.' },
              { icon: '♛', title: 'reward tiers', desc: 'Design a loyalty ladder. Postcards, merch, signed vinyl, zoom calls, meet and greets.' },
              { icon: '✉', title: 'direct email', desc: 'Send to every fan who opted in. No algorithm. No throttle. Your words in their inbox.' },
            ].map(f => (
              <div key={f.title} className="feature-card">
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, color: '#C9922A', marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(245,239,230,0.5)', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Replaces callout */}
          <div style={{ background: 'rgba(245,239,230,0.03)', border: '1px solid rgba(245,239,230,0.08)', borderRadius: 14, padding: '32px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(245,239,230,0.4)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 20 }}>flock replaces all of this</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { name: 'Linktree', price: '$9/mo', desc: 'bio link' },
                { name: 'Patreon', price: '10% cut', desc: 'memberships' },
                { name: 'Mailchimp', price: '$20/mo', desc: 'email list' },
                { name: 'Squarespace', price: '$23/mo', desc: 'website' },
                { name: 'Discord', price: 'your data', desc: 'community' },
              ].map(r => (
                <div key={r.name} style={{ background: 'rgba(245,239,230,0.04)', border: '1px solid rgba(245,239,230,0.08)', borderRadius: 10, padding: '14px 18px', minWidth: 120, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -8, right: -8, background: '#8B1A2B', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff' }}>✕</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{r.name}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#8B1A2B', marginBottom: 2 }}>{r.price}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'rgba(245,239,230,0.3)' }}>{r.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'rgba(245,239,230,0.4)' }}>
              all of that, in one place, for one price · and you own the data
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '100px 24px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#8B1A2B', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 20 }}>how it works</div>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 56 }}>up in minutes. yours forever.</h2>
        {[
          { num: '01', title: 'sign up and name your world', desc: 'Choose your community name, subdomain, colours, and what to call your fan currency. Takes 3 minutes.' },
          { num: '02', title: 'invite your fans', desc: 'Share your link. Fans sign up, create a profile, and start earning currency just by being there.' },
          { num: '03', title: 'post, connect, reward', desc: 'Post to your feed. Audio drops, videos, polls. Fans earn currency for engaging.' },
          { num: '04', title: 'play the long game', desc: 'Fans climb your loyalty ladder. The ones who show up most earn the rewards that matter.' },
        ].map((step, i) => (
          <div key={step.num} style={{ display: 'flex', gap: 32, padding: '32px 0', borderBottom: i < 3 ? '1px solid rgba(245,239,230,0.08)' : 'none' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#8B1A2B', minWidth: 36, paddingTop: 4 }}>{step.num}</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{step.title}</div>
              <div style={{ fontSize: 14, color: 'rgba(245,239,230,0.5)', lineHeight: 1.7 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '100px 24px', background: 'rgba(245,239,230,0.02)', borderTop: '1px solid rgba(245,239,230,0.06)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#8B1A2B', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 20 }}>pricing</div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 24 }}>instagram is free.<br /><span style={{ color: 'rgba(245,239,230,0.35)' }}>so is handing them everything.</span></h2>
          <p style={{ fontSize: 16, color: 'rgba(245,239,230,0.6)', lineHeight: 1.8, maxWidth: 580, marginBottom: 16 }}>
            Every post you make on their platform makes them richer and you more dependent. You're paying with your fan list, your relationship data, your reach, and your leverage.
          </p>
          <p style={{ fontSize: 16, color: 'rgba(245,239,230,0.6)', lineHeight: 1.8, maxWidth: 580, marginBottom: 56 }}>
            Flock will cost $29/month. In exchange, you own everything. No revenue share. No cuts. No one else's algorithm deciding whether your fans see you today.
          </p>

          {/* Cost comparison */}
          <div style={{ background: 'rgba(139,26,43,0.08)', border: '1px solid rgba(139,26,43,0.2)', borderRadius: 14, padding: '28px 32px', marginBottom: 48, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24 }}>
            {[
              { label: 'one facebook ad', cost: '$30+', result: 'reaches 200 people once' },
              { label: 'patreon at $5k/mo', cost: '$650/mo', result: 'just in platform fees' },
              { label: 'flock', cost: '$29/mo', result: 'your fans. yours forever.' },
            ].map(c => (
              <div key={c.label}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'rgba(245,239,230,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>{c.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: c.label === 'flock' ? '#8B1A2B' : '#F5EFE6', marginBottom: 4 }}>{c.cost}</div>
                <div style={{ fontSize: 12, color: 'rgba(245,239,230,0.5)', lineHeight: 1.5 }}>{c.result}</div>
              </div>
            ))}
          </div>

          {/* Coming soon plans */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {[
              { name: 'indie', price: '$29', period: '/month', desc: 'For solo artists. Less than a Spotify subscription.', features: ['1 community', 'up to 500 fans', 'custom fan currency', 'replaces your Linktree + website', 'show check-ins', 'direct email to fans'], highlight: false },
              { name: 'pro', price: '$69', period: '/month', desc: 'For artists serious about their community.', features: ['1 community', 'unlimited fans', 'custom domain', 'all core features', 'fan map & analytics', 'priority support'], highlight: true },
              { name: 'label', price: "let's talk", period: '', desc: 'For labels and managers running multiple artists.', features: ['multiple communities', 'white-label', 'custom integrations', 'dedicated support', 'SLA'], highlight: false },
            ].map(plan => (
              <div key={plan.name} style={{ background: plan.highlight ? 'rgba(139,26,43,0.12)' : 'rgba(245,239,230,0.04)', border: `1px solid ${plan.highlight ? 'rgba(139,26,43,0.4)' : 'rgba(245,239,230,0.08)'}`, borderRadius: 16, padding: '32px 28px', position: 'relative', opacity: 0.85 }}>
                <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(201,146,42,0.15)', border: '1px solid rgba(201,146,42,0.3)', borderRadius: 10, padding: '3px 10px', fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#C9922A', letterSpacing: '1px' }}>coming soon</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: plan.highlight ? '#8B1A2B' : 'rgba(245,239,230,0.4)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 16 }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-1px' }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: 'rgba(245,239,230,0.4)' }}>{plan.period}</span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(245,239,230,0.5)', marginBottom: 28, lineHeight: 1.5 }}>{plan.desc}</div>
                <div style={{ marginBottom: 28 }}>
                  {plan.features.map(f => <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontSize: 13, color: 'rgba(245,239,230,0.7)' }}><span style={{ color: '#8B1A2B', fontFamily: "'DM Mono', monospace" }}>✓</span> {f}</div>)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 40, padding: '24px', background: 'rgba(245,239,230,0.03)', borderRadius: 12, border: '1px solid rgba(245,239,230,0.06)' }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>free while we're building</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'rgba(245,239,230,0.4)', marginBottom: 20 }}>sign up now, get in early, shape what we build next</div>
            <a href="/start?join=1" className="cta-btn" style={{ fontSize: 14, padding: '14px 36px' }}>launch your community free ✦</a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '120px 24px', textAlign: 'center', maxWidth: 740, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-1px', marginBottom: 28 }}>
          the best fan relationships<br /><span style={{ color: 'rgba(245,239,230,0.35)' }}>were never built on social media.</span>
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(245,239,230,0.5)', lineHeight: 1.8, marginBottom: 52 }}>Direct. Unmediated. Real. A place you own, fans who chose to be there.</p>
        <a href="/start?join=1" className="cta-btn" style={{ fontSize: 16, padding: '18px 48px' }}>build your community ✦</a>
        <div style={{ marginTop: 20, fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(245,239,230,0.3)' }}>free for 14 days · no credit card needed</div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(245,239,230,0.06)', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>flock ✦</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(245,239,230,0.3)' }}>fan communities for independent artists · built by monda management</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <a href="/start?join=1" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(245,239,230,0.4)', textDecoration: 'none' }}>get started</a>
          <a href="mailto:hello@fans-flock.com" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(245,239,230,0.4)', textDecoration: 'none' }}>contact</a>
        </div>
      </footer>
    </div>
  );
}

// ============ ROOT EXPORT ============
export default function StartPage() {
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setShowForm(params.has('join'));
    }
  }, []);

  if (showForm) return <OnboardingForm />;
  return <MarketingPage />;
}
