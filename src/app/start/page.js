'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const INK = '#1A1018';
const CREAM = '#F5EFE6';
const RUBY = '#8B1A2B';
const SLATE = '#6A5A62';
const SURFACE = '#FAF5F0';
const BORDER = '#E8DDD4';

export default function StartPage() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [slugAvailable, setSlugAvailable] = useState(null);
    const [checkingSlug, setCheckingSlug] = useState(false);
    const [account, setAccount] = useState({ email: '', password: '', fullName: '' });
    const [community, setCommunity] = useState({ name: '', slug: '', tagline: '' });
    const [branding, setBranding] = useState({ primaryColor: '#8B1A2B', secondaryColor: '#D4A5A0' });
    const [membersData, setMembersData] = useState({ actType: 'solo', members: [{ name: '', color: '#8B1A2B' }] });

  const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';

  const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleNameChange = (name) => {
        setCommunity(prev => ({ ...prev, name, slug: slugify(name) }));
        setSlugAvailable(null);
  };

  const checkSlug = async (slug) => {
        if (!slug) return;
        setCheckingSlug(true);
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        const { data } = await sb.from('tenants').select('id').eq('slug', slug).single();
        setSlugAvailable(!data);
        setCheckingSlug(false);
  };

  const handleComplete = async () => {
        setLoading(true);
        setError('');
        try {
                const res = await fetch('/api/onboarding/complete', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ account, community, branding, members: membersData }),
                });
                const data = await res.json();
                if (!res.ok) {
                          setError(data.error || 'Something went wrong');
                          setLoading(false);
                          return;
                }
                window.location.href = `https://${community.slug}.${APP_DOMAIN}?welcome=1`;
        } catch (e) {
                setError(e.message);
                setLoading(false);
        }
  };

  const stepTitles = ['account', 'community', 'branding', 'members'];

  return (
        <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20 }}>✦</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>flock</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 4 }}>fan communities for independent artists</div>
  </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
{stepTitles.map((title, i) => (
              <div key={title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: step > i + 1 ? RUBY : step === i + 1 ? RUBY : BORDER, color: step >= i + 1 ? '#fff' : SLATE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace", transition: 'all 0.2s' }}>
                {step > i + 1 ? '✓' : i + 1}
</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: step === i + 1 ? RUBY : SLATE, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{title}</div>
                </div>
                          ))}
</div>

        <div style={{ background: SURFACE, borderRadius: 16, padding: '28px 24px', border: `1px solid ${BORDER}` }}>
{step === 1 && (
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 6, textTransform: 'lowercase' }}>create your account</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 24 }}>you'll use this to manage your community</div>
{[
  { label: 'full name', key: 'fullName', type: 'text', placeholder: 'your name' },
  { label: 'email', key: 'email', type: 'email', placeholder: 'you@example.com' },
  { label: 'password', key: 'password', type: 'password', placeholder: 'at least 8 characters' },
                ].map(({ label, key, type, placeholder }) => (
                                  <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>{label}</label>
                                        <input type={type} value={account[key]} onChange={e => setAccount(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} style={{ width: '100%', padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
  </div>
              ))}
{error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginBottom: 12 }}>{error}</div>}
              <button onClick={() => { if (!account.email || !account.password || !account.fullName) { setError('all fields required'); return; } if (account.password.length < 8) { setError('password must be at least 8 characters'); return; } setError(''); setStep(2); }} style={{ width: '100%', padding: '13px', background: RUBY, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                continue →
</button>
  </div>
          )}

{step === 2 && (
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 6, textTransform: 'lowercase' }}>name your community</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 24 }}>this is how fans will find you</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>community name</label>
                <input type="text" value={community.name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. The Stamps, Emma Donovan" style={{ width: '100%', padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
  </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>url slug</label>
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
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>tagline</label>
                <input type="text" value={community.tagline} onChange={e => setCommunity(p => ({ ...p, tagline: e.target.value }))} placeholder="a short description of your community" style={{ width: '100%', padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
  </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep(1)} style={{ padding: '13px 20px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>← back</button>
                <button onClick={() => { if (!community.name || !community.slug) { setError('name and slug required'); return; } if (slugAvailable === false) { setError('that slug is taken'); return; } setError(''); setStep(3); }} style={{ flex: 1, padding: '13px', background: RUBY, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>continue →</button>
</div>
{error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginTop: 10 }}>{error}</div>}
  </div>
          )}

{step === 3 && (
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 6, textTransform: 'lowercase' }}>pick your colours</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 24 }}>these define your community's look and feel</div>
{[
  { label: 'primary colour', key: 'primaryColor', desc: 'used for buttons, accents, highlights' },
  { label: 'secondary colour', key: 'secondaryColor', desc: 'used for soft accents and backgrounds' },
                ].map(({ label, key, desc }) => (
                                  <div key={key} style={{ marginBottom: 20 }}>
                  <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>{label}</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <input type="color" value={branding[key]} onChange={e => setBranding(p => ({ ...p, [key]: e.target.value }))} style={{ width: 56, height: 44, padding: 3, border: `1px solid ${BORDER}`, borderRadius: 8, cursor: 'pointer' }} />
                    <div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: INK, fontWeight: 600 }}>{branding[key]}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, marginTop: 2 }}>{desc}</div>
  </div>
  </div>
  </div>
              ))}
              <div style={{ background: '#F5EFE6', borderRadius: 10, padding: 16, marginBottom: 20, border: `1px solid ${BORDER}` }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, marginBottom: 10, letterSpacing: '0.5px' }}>preview</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: INK, marginBottom: 8, textTransform: 'lowercase' }}>{community.name || 'your community'}</div>
                <button style={{ padding: '8px 18px', background: branding.primaryColor, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'default', marginRight: 8 }}>join ✦</button>
                <span style={{ background: branding.secondaryColor + '44', border: `1px solid ${branding.secondaryColor}66`, borderRadius: 20, padding: '4px 12px', fontSize: 11, fontFamily: "'DM Mono', monospace", color: INK }}>fan</span>
                </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep(2)} style={{ padding: '13px 20px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>← back</button>
                <button onClick={() => setStep(4)} style={{ flex: 1, padding: '13px', background: RUBY, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>continue →</button>
</div>
                </div>
          )}

{step === 4 && (
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
                    <input type="text" value={m.name} onChange={e => setMembersData(p => ({ ...p, members: p.members.map((x, j) => j === i ? { ...x, name: e.target.value } : x) }))} placeholder={membersData.actType === 'solo' ? 'your name' : `member ${i + 1} name`} style={{ flex: 1, padding: '9px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
                    <input type="color" value={m.color} onChange={e => setMembersData(p => ({ ...p, members: p.members.map((x, j) => j === i ? { ...x, color: e.target.value } : x) }))} style={{ width: 40, height: 36, padding: 2, border: `1px solid ${BORDER}`, borderRadius: 6, cursor: 'pointer' }} />
{membersData.actType === 'band' && membersData.members.length > 1 && (
                        <button onClick={() => setMembersData(p => ({ ...p, members: p.members.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: RUBY + '66', fontSize: 16, padding: '2px' }}>×</button>
                    )}
</div>
                ))}
                  </div>
{membersData.actType === 'band' && membersData.members.length < 6 && (
                  <button onClick={() => setMembersData(p => ({ ...p, members: [...p.members, { name: '', color: '#888888' }] }))} style={{ background: 'none', border: `1px dashed ${BORDER}`, borderRadius: 8, padding: '8px', width: '100%', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, marginBottom: 16 }}>+ add member</button>
              )}
{error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginBottom: 12 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setStep(3)} style={{ padding: '13px 20px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>← back</button>
                <button onClick={handleComplete} disabled={loading} style={{ flex: 1, padding: '13px', background: RUBY, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
{loading ? 'launching...' : 'launch community ✦'}
</button>
  </div>
  </div>
          )}
</div>

        <div style={{ textAlign: 'center', marginTop: 20, fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '77', letterSpacing: '0.5px' }}>
          flock · fan communities for independent artists · fans-flock.com
            </div>
            </div>
  </div>
  );
}
