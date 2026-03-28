'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const INK = '#1A1018'; const CREAM = '#F5EFE6'; const RUBY = '#8B1A2B';
const SLATE = '#6A5A62'; const SURFACE = '#FAF5F0'; const BORDER = '#E8DDD4';
const WARM_GOLD = '#C9922A'; const SAGE = '#7D8B6A';
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const slugify = str => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const Mono = ({ children, size = 10, color = SLATE, style = {} }) => (
  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: size, color, letterSpacing: '0.5px', ...style }}>{children}</div>
);

const Input = ({ label, type = 'text', value, onChange, placeholder, hint, error, autoFocus }) => {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === 'password';
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input type={isPassword && showPw ? 'text' : type} value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus}
          style={{ width: '100%', padding: isPassword ? '12px 44px 12px 14px' : '12px 14px', background: CREAM, border: `1px solid ${error ? RUBY : BORDER}`, borderRadius: 10, fontSize: 14, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
        {isPassword && (
          <button type="button" onClick={() => setShowPw(p => !p)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE + '88', padding: 4 }}>
            {showPw ? 'hide' : 'show'}
          </button>
        )}
      </div>
      {hint && !error && <Mono size={9} color={SLATE + '77'} style={{ marginTop: 5 }}>{hint}</Mono>}
      {error && <Mono size={9} color={RUBY} style={{ marginTop: 5 }}>{error}</Mono>}
    </div>
  );
};

const Btn = ({ children, onClick, disabled, variant = 'primary', style = {} }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ padding: '13px 20px', background: variant === 'primary' ? (disabled ? BORDER : RUBY) : 'transparent', color: variant === 'primary' ? (disabled ? SLATE : '#fff') : SLATE, border: variant === 'ghost' ? `1px solid ${BORDER}` : 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: disabled ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif", ...style }}>
    {children}
  </button>
);

const COLOUR_PRESETS = [
  { label: 'Ruby', ruby: '#8B1A2B', cream: '#F5EFE6', ink: '#1A1018' },
  { label: 'Midnight', ruby: '#6B5ECD', cream: '#F0EEF8', ink: '#1A1830' },
  { label: 'Forest', ruby: '#2D6A4F', cream: '#F0F5F0', ink: '#1A2B1F' },
  { label: 'Terracotta', ruby: '#C1440E', cream: '#FBF0EB', ink: '#2B1810' },
  { label: 'Ocean', ruby: '#1A6B8A', cream: '#EEF5F8', ink: '#101E28' },
  { label: 'Plum', ruby: '#7B2D8B', cream: '#F5EEF8', ink: '#1E0A28' },
  { label: 'Slate', ruby: '#4A6FA5', cream: '#EEF2F8', ink: '#1A2030' },
  { label: 'Amber', ruby: '#C9922A', cream: '#FAF3E8', ink: '#1A1008' },
];

const CURRENCY_PRESETS = [
  { name: 'points', icon: '✦', desc: 'universal' },
  { name: 'stamps', icon: '◉', desc: 'classic' },
  { name: 'coins', icon: '◐', desc: 'retro' },
  { name: 'sparks', icon: '✺', desc: 'energetic' },
  { name: 'echoes', icon: '◎', desc: 'musical' },
  { name: 'drops', icon: '●', desc: 'hype' },

  { name: 'custom', icon: '✎', desc: 'your idea' },
];

// Each step owns its own state - fixes the one-character typing bug
function StepAccount({ initial, onNext }) {
  const [data, setData] = useState(initial);
  const [errors, setErrors] = useState({});
  const validate = () => {
    const e = {};
    if (!data.fullName.trim()) e.fullName = 'enter your name';
    if (!data.email.trim() || !data.email.includes('@')) e.email = 'enter a valid email';
    if (data.password.length < 8) e.password = 'at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 6 }}>let's get you set up</div>
        <Mono>your account for managing your community</Mono>
      </div>
      <Input label="your name" value={data.fullName} onChange={e => setData(p => ({ ...p, fullName: e.target.value }))} placeholder="how you'd like to be known" autoFocus error={errors.fullName} />
      <Input label="email" type="email" value={data.email} onChange={e => setData(p => ({ ...p, email: e.target.value }))} placeholder="you@example.com" error={errors.email} />
      <Input label="password" type="password" value={data.password} onChange={e => setData(p => ({ ...p, password: e.target.value }))} placeholder="at least 8 characters" hint="you'll use this to log into your dashboard" error={errors.password} />
      <Btn onClick={() => validate() && onNext(data)} style={{ width: '100%', marginTop: 8 }}>continue →</Btn>
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Mono size={10}>already have a community? <a href="https://fans-flock.com/start" style={{ color: RUBY, textDecoration: 'none', fontWeight: 600 }}>sign in</a></Mono>
      </div>
    </div>
  );
}

function StepCommunity({ initial, onNext, onBack }) {
  const [data, setData] = useState(initial);
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [checking, setChecking] = useState(false);
  const [errors, setErrors] = useState({});

  const checkSlug = async (slug) => {
    if (!slug) return;
    setChecking(true);
    const { data: existing } = await sb().from('tenants').select('id').eq('slug', slug).single();
    setSlugAvailable(!existing);
    setChecking(false);
  };

  const validate = () => {
    const e = {};
    if (!data.name.trim()) e.name = 'enter a community name';
    if (!data.slug.trim()) e.slug = 'enter a url slug';
    if (slugAvailable === false) e.slug = 'that url is taken - try another';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 6 }}>name your community</div>
        <Mono>this becomes your link in bio - the one URL your fans need</Mono>
      </div>
      <Input label="community name" value={data.name} onChange={e => { const name = e.target.value; setData(p => ({ ...p, name, slug: slugify(name) })); setSlugAvailable(null); }} placeholder="e.g. Ed Sheeran, Chappell Roan" autoFocus error={errors.name} />
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>your url</label>
        <div style={{ display: 'flex', alignItems: 'center', background: CREAM, border: `1px solid ${errors.slug ? RUBY : slugAvailable === true ? SAGE : BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 12px 12px 14px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE + '66', whiteSpace: 'nowrap', borderRight: `1px solid ${BORDER}`, background: BORDER + '44' }}>fans-flock.com/</div>
          <input type="text" value={data.slug} onChange={e => { setData(p => ({ ...p, slug: slugify(e.target.value) })); setSlugAvailable(null); }} onBlur={() => data.slug && checkSlug(data.slug)}
            style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', fontSize: 14, color: INK, outline: 'none', fontFamily: "'DM Mono', monospace" }} />
          <div style={{ padding: '0 12px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: checking ? SLATE : slugAvailable === true ? SAGE : slugAvailable === false ? RUBY : 'transparent', flexShrink: 0 }}>
            {checking ? '...' : slugAvailable === true ? '✓' : slugAvailable === false ? '✗' : '·'}
          </div>
        </div>
        {errors.slug && <Mono size={9} color={RUBY} style={{ marginTop: 5 }}>{errors.slug}</Mono>}
        {!errors.slug && slugAvailable === true && <Mono size={9} color={SAGE} style={{ marginTop: 5 }}>✓ available</Mono>}
        {!errors.slug && !data.slug && <Mono size={9} color={SLATE + '77'} style={{ marginTop: 5 }}>your permanent link in bio</Mono>}
      </div>
      <Input label="tagline (optional)" value={data.tagline} onChange={e => setData(p => ({ ...p, tagline: e.target.value }))} placeholder="a one-liner about you or your music" hint="shows on your public highlights page" />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Btn onClick={onBack} variant="ghost">← back</Btn>
        <Btn onClick={() => validate() && onNext(data)} style={{ flex: 1 }}>continue →</Btn>
      </div>
    </div>
  );
}

function StepColours({ initial, onNext, onBack }) {
  const [data, setData] = useState(initial);
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 6 }}>make it yours</div>
        <Mono>pick a colour palette. you can always change it later.</Mono>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {COLOUR_PRESETS.map(preset => {
          const selected = data.primaryColor === preset.ruby;
          return (
            <button key={preset.label} onClick={() => setData({ ...data, primaryColor: preset.ruby, secondaryColor: preset.cream, inkColor: preset.ink })}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', background: selected ? preset.cream : SURFACE, border: `2px solid ${selected ? preset.ruby : BORDER}`, borderRadius: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: preset.ink }} />
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: preset.ruby }} />
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: preset.cream, border: '1px solid #ddd' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: selected ? 700 : 500, color: selected ? preset.ruby : INK }}>{preset.label}</span>
            </button>
          );
        })}
      </div>
      <div style={{ background: data.inkColor || INK, borderRadius: 12, padding: '18px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 70% 30%, ${data.primaryColor}33, transparent 60%)` }} />
        <div style={{ position: 'relative' }}>
          <Mono size={8} color={(data.secondaryColor || CREAM) + '88'} style={{ letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 }}>preview</Mono>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, color: data.secondaryColor || CREAM, textTransform: 'lowercase', marginBottom: 12 }}>your community</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: data.primaryColor || RUBY, borderRadius: 8, padding: '8px 16px' }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#fff', fontWeight: 600 }}>join free ✦</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={onBack} variant="ghost">← back</Btn>
        <Btn onClick={() => onNext(data)} style={{ flex: 1 }}>continue →</Btn>
      </div>
    </div>
  );
}

function StepCurrency({ initial, onNext, onBack }) {
  const [data, setData] = useState(initial);
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 6 }}>fan currency</div>
        <Mono>fans earn this for engaging. pick something that feels like you.</Mono>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        {CURRENCY_PRESETS.map(preset => (
          <button key={preset.name} onClick={() => setData(p => ({ ...p, name: preset.name }))}
            style={{ padding: '14px 8px', background: data.name === preset.name ? RUBY + '11' : SURFACE, border: `2px solid ${data.name === preset.name ? RUBY : BORDER}`, borderRadius: 12, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, marginBottom: 4, color: data.name === preset.name ? RUBY : SLATE }}>{preset.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: data.name === preset.name ? RUBY : INK }}>{preset.name}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: SLATE, marginTop: 2 }}>{preset.desc}</div>
          </button>
        ))}
      </div>
      {data.name === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 10, marginBottom: 16 }}>
          <Input label="currency name" value={data.customName || ''} onChange={e => setData(p => ({ ...p, customName: e.target.value }))} placeholder="e.g. crystals, vibes" />
          <Input label="icon" value={data.customIcon || ''} onChange={e => setData(p => ({ ...p, customIcon: e.target.value.slice(0, 2) }))} placeholder="✦" />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={onBack} variant="ghost">← back</Btn>
        <Btn onClick={() => onNext(data)} style={{ flex: 1 }}>let's go →</Btn>
      </div>
    </div>
  );
}

function StepMembers({ initial, onNext, onBack, primaryColor }) {
  const [data, setData] = useState(initial);
  const accent = primaryColor || RUBY;
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 6 }}>who's in the band?</div>
        <Mono>each member gets their own feed tab. solo? just add yourself.</Mono>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['solo', 'band'].map(type => (
          <button key={type} onClick={() => {
            if (type === 'solo') setData({ actType: 'solo', members: [{ name: '', color: accent }] });
            else setData(p => ({ actType: 'band', members: p.members.length > 1 ? p.members : [{ name: '', color: accent }, { name: '', color: accent }] }));
          }} style={{ flex: 1, padding: '12px', background: data.actType === type ? accent + '11' : SURFACE, border: `2px solid ${data.actType === type ? accent : BORDER}`, borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: data.actType === type ? 700 : 500, color: data.actType === type ? accent : INK }}>
            {type === 'solo' ? '○ solo artist' : '◎ band / group'}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {data.members.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="color" value={m.color || accent} onChange={e => { const n = [...data.members]; n[i] = { ...n[i], color: e.target.value }; setData(p => ({ ...p, members: n })); }}
              style={{ width: 44, height: 44, padding: 3, border: `1px solid ${BORDER}`, borderRadius: 8, cursor: 'pointer', flexShrink: 0 }} />
            <input type="text" value={m.name} onChange={e => { const n = [...data.members]; n[i] = { ...n[i], name: e.target.value }; setData(p => ({ ...p, members: n })); }} placeholder={data.actType === 'solo' ? 'your artist name' : `member ${i + 1} name`}
              style={{ flex: 1, padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
            {data.actType === 'band' && data.members.length > 1 && (
              <button onClick={() => setData(p => ({ ...p, members: p.members.filter((_, j) => j !== i) }))}
                style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, width: 36, height: 44, cursor: 'pointer', color: SLATE, fontSize: 16, flexShrink: 0 }}>×</button>
            )}
          </div>
        ))}
      </div>
      {data.actType === 'band' && data.members.length < 6 && (
        <button onClick={() => setData(p => ({ ...p, members: [...p.members, { name: '', color: accent }] }))}
          style={{ width: '100%', padding: '10px', background: 'transparent', border: `1px dashed ${BORDER}`, borderRadius: 10, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, marginBottom: 16 }}>
          + add member
        </button>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={onBack} variant="ghost">← back</Btn>
        <Btn onClick={() => onNext(data)} style={{ flex: 1 }}>create my community →</Btn>
      </div>
    </div>
  );
}

function StepLaunching({ communityName, error, onRetry }) {
  const [dots, setDots] = useState('');
  useEffect(() => {
    if (error) return;
    const i = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(i);
  }, [error]);

  if (error) return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>✗</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: INK, marginBottom: 12, textTransform: 'lowercase' }}>something went wrong</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, lineHeight: 1.7, marginBottom: 24, padding: '0 8px' }}>{error}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button onClick={onRetry} style={{ padding: '10px 24px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 10, cursor: 'pointer', fontSize: 13 }}>← edit details</button>
        <button onClick={() => { localStorage.removeItem('flock_onboarding_v1'); window.location.href = '/start?join=1'; }} style={{ padding: '10px 24px', background: RUBY, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>start over</button>
      </div>
    </div>
  );

  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 16, display: 'inline-block', animation: 'spin 2s linear infinite' }}>✦</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: 22, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 8 }}>building {communityName}{dots}</div>
      <Mono>setting everything up - just a moment</Mono>
    </div>
  );
}

function StepLive({ communityName, slug, primaryColor }) {
  const [subStep, setSubStep] = useState(1); // 1 = socials, 2 = profile, 3 = share
  const [socials, setSocials] = useState({ instagram: '', tiktok: '', spotify: '', website: '' });
  const [profile, setProfile] = useState({ tagline: '', bio: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);

  const accent = primaryColor || RUBY;
  const url = `https://${slug}.${APP_DOMAIN}`;
  const highlightsUrl = `${url}/highlights`;

  const saveToDb = async (data) => {
    setSaving(true);
    // Get tenant id first
    const { data: tenant } = await sb().from('tenants').select('id').eq('slug', slug).single();
    if (tenant?.id) {
      const entries = Object.entries(data).filter(([, v]) => v?.trim());
      for (const [key, value] of entries) {
        await sb().from('tenant_config').upsert({ tenant_id: tenant.id, key, value }, { onConflict: 'tenant_id,key' });
      }
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const instagramCaption = `i just launched my fan community on @flockfans 🎉

this is my new link in bio - everything in one place: exclusive posts, show check-ins, rewards for my biggest fans.

join for free ✦ ${highlightsUrl}`;

  if (subStep === 1) return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 6 }}>you're live!</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, lineHeight: 1.6 }}>
          now let's make your highlights page shareable.<br />
          <strong style={{ color: accent }}>this replaces your link in bio.</strong>
        </div>
      </div>

      <div style={{ background: accent + '11', border: `1px solid ${accent}33`, borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: accent, fontWeight: 600, marginBottom: 4 }}>your highlights page</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: INK, wordBreak: 'break-all' }}>{highlightsUrl}</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, marginTop: 6 }}>fans see this before they join · add it to instagram bio now</div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 6 }}>step 1 of 2 · add your social links</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 18 }}>these appear on your highlights page so fans can find you everywhere</div>

      {[
        { label: 'instagram', field: 'instagram', prefix: '@', placeholder: 'yourhandle' },
        { label: 'tiktok', field: 'tiktok', prefix: '@', placeholder: 'yourhandle' },
        { label: 'spotify', field: 'spotify', prefix: '', placeholder: 'paste your artist URL' },
        { label: 'website', field: 'website', prefix: '', placeholder: 'https://yoursite.com' },
      ].map(({ label, field, prefix, placeholder }) => (
        <div key={field} style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 5 }}>{label}</label>
          <div style={{ display: 'flex', alignItems: 'center', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
            {prefix && <div style={{ padding: '11px 10px 11px 14px', fontFamily: "'DM Mono', monospace", fontSize: 13, color: SLATE + '66', borderRight: `1px solid ${BORDER}`, background: BORDER + '44' }}>{prefix}</div>}
            <input type="text" value={socials[field]} onChange={e => setSocials(p => ({ ...p, [field]: e.target.value }))} placeholder={placeholder}
              style={{ flex: 1, padding: '11px 14px', background: 'transparent', border: 'none', fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button onClick={() => setSubStep(2)} style={{ flex: 1, padding: '13px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>skip for now</button>
        <button onClick={async () => {
          const toSave = {};
          if (socials.instagram) toSave.social_instagram = socials.instagram.replace('@', '');
          if (socials.tiktok) toSave.social_tiktok = socials.tiktok.replace('@', '');
          if (socials.spotify) toSave.social_spotify = socials.spotify;
          if (socials.website) toSave.social_website = socials.website;
          if (Object.keys(toSave).length > 0) await saveToDb(toSave);
          setSubStep(2);
        }} disabled={saving} style={{ flex: 2, padding: '13px', background: accent, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'saving...' : 'save & continue →'}
        </button>
      </div>
    </div>
  );

  if (subStep === 2) return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 6 }}>step 2 of 2 · your artist profile</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE }}>shows on your highlights page before fans join</div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>tagline</label>
        <input type="text" value={profile.tagline} onChange={e => setProfile(p => ({ ...p, tagline: e.target.value }))} placeholder="a short line about you or your music" maxLength={100} autoFocus
          style={{ width: '100%', padding: '12px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '55', marginTop: 4 }}>e.g. "indie pop from melbourne" or "making sad music for happy people"</div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>bio (optional)</label>
        <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="a bit more about you - who you are, what you make, why fans should join" rows={3} maxLength={300}
          style={{ width: '100%', padding: '12px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setSubStep(1)} style={{ padding: '13px 18px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>← back</button>
        <button onClick={async () => {
          const toSave = {};
          if (profile.tagline) toSave.tagline = profile.tagline;
          if (profile.bio) toSave.bio = profile.bio;
          if (Object.keys(toSave).length > 0) await saveToDb(toSave);
          setSubStep(3);
        }} disabled={saving} style={{ flex: 1, padding: '13px', background: accent, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'saving...' : 'finish setup →'}
        </button>
      </div>
      <button onClick={() => setSubStep(3)} style={{ width: '100%', marginTop: 8, padding: '10px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + '66' }}>skip</button>
    </div>
  );

  // subStep 3 - the share moment
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>✦</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 6 }}>ready to share</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE }}>your highlights page is live · put it everywhere</div>
      </div>

      {/* Highlights URL */}
      <div style={{ background: INK, borderRadius: 14, padding: '18px', marginBottom: 12 }}>
        <Mono size={9} color={'#ffffff55'} style={{ marginBottom: 8, letterSpacing: '2px', textTransform: 'uppercase' }}>your link in bio</Mono>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14, wordBreak: 'break-all' }}>{highlightsUrl}</div>
        <button onClick={() => { navigator.clipboard.writeText(highlightsUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
          style={{ width: '100%', padding: '11px', background: accent, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          {copied ? '✓ copied' : 'copy link'}
        </button>
      </div>

      {/* Instagram caption */}
      <div style={{ background: SURFACE, borderRadius: 12, padding: '16px', border: `1px solid ${BORDER}`, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Mono size={9} style={{ letterSpacing: '1.5px', textTransform: 'uppercase' }}>ready-to-post caption</Mono>
          <button onClick={() => { navigator.clipboard.writeText(instagramCaption).then(() => { setCaptionCopied(true); setTimeout(() => setCaptionCopied(false), 2000); }); }}
            style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: accent, background: 'none', border: `1px solid ${accent}44`, borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
            {captionCopied ? 'copied ✓' : 'copy'}
          </button>
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: INK + 'CC', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{instagramCaption}</div>
      </div>

      {/* Next steps */}
      <div style={{ background: SURFACE, borderRadius: 12, padding: '16px', border: `1px solid ${BORDER}`, marginBottom: 16 }}>
        <Mono size={9} style={{ marginBottom: 12, letterSpacing: '1.5px', textTransform: 'uppercase' }}>do these next</Mono>
        {[
          { icon: '1', text: 'swap your instagram bio link to ' + highlightsUrl },
          { icon: '2', text: 'write a welcome post inside your community' },
          { icon: '3', text: 'add an upcoming show so fans can check in' },
          { icon: '4', text: 'upload your logo in dashboard → settings' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: i < 3 ? `1px solid ${BORDER}` : 'none' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{item.icon}</div>
            <span style={{ fontSize: 12, color: INK, lineHeight: 1.5 }}>{item.text}</span>
          </div>
        ))}
      </div>

      <a href={url} style={{ display: 'block', width: '100%', padding: '14px', background: accent, color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
        go to my community →
      </a>
    </div>
  );
}

// ── MAIN WIZARD ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'flock_onboarding_v1';

function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  // Persisted state - survives tab switches
  const [account, setAccount] = useState({ email: '', password: '', fullName: '' });
  const [community, setCommunity] = useState({ name: '', slug: '', tagline: '' });
  const [branding, setBranding] = useState({ primaryColor: '#8B1A2B', secondaryColor: '#F5EFE6', inkColor: '#1A1018' });
  const [currency, setCurrency] = useState({ name: 'points', icon: '✦', customName: '', customIcon: '' });
  const [members, setMembers] = useState({ actType: 'solo', members: [{ name: '', color: '#8B1A2B' }] });

  // Load from localStorage on mount - but never resume from step 6 (launching)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.step && d.step < 6) setStep(d.step); // never auto-resume mid-launch
        if (d.account) setAccount(d.account);
        if (d.community) setCommunity(d.community);
        if (d.branding) setBranding(d.branding);
        if (d.currency) setCurrency(d.currency);
        if (d.members) setMembers(d.members);
      }
    } catch {}
  }, []);

  // Save to localStorage whenever state changes
  const save = (updates) => {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...updates }));
    } catch {}
  };

  const goToStep = (n) => { setStep(n); save({ step: n }); };

  const TOTAL_STEPS = 5;
  const progress = step <= TOTAL_STEPS ? ((step - 1) / TOTAL_STEPS) * 100 : 100;

  const launch = async (finalMembers) => {
    goToStep(6); setError('');
    const finalCurrencyName = currency.name === 'custom' ? currency.customName : currency.name;
    const finalCurrencyIcon = currency.name === 'custom' ? (currency.customIcon || '✦') : (CURRENCY_PRESETS.find(p => p.name === currency.name)?.icon || '✦');

    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, community, branding, currency: { name: finalCurrencyName, icon: finalCurrencyIcon }, members: finalMembers }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || 'something went wrong';
        // User already exists - try signing them in instead
        if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists')) {
          const { error: signInErr } = await sb().auth.signInWithPassword({ email: account.email, password: account.password });
          if (signInErr) {
            setError('an account with that email already exists. try signing in at fans-flock.com/start instead.');
          } else {
            setError('an account with that email already exists and you\'ve been signed in. go to fans-flock.com/start to access your community.');
          }
        } else {
          setError(msg);
        }
        return;
      }
      await sb().auth.signInWithPassword({ email: account.email, password: account.password });
      localStorage.removeItem(STORAGE_KEY);
      goToStep(7);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px 48px', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{ width: '100%', maxWidth: 480, animation: 'fadeIn 0.4s ease-out' }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <a href="/start" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: CREAM }}>✦</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>flock</div>
          </a>
        </div>

        {step <= TOTAL_STEPS && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ height: 3, background: BORDER, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: branding.primaryColor || RUBY, borderRadius: 2, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <Mono size={9} color={SLATE + '77'}>step {step} of {TOTAL_STEPS}</Mono>
              <Mono size={9} color={SLATE + '77'}>{['account', 'community', 'colours', 'currency', 'members'][step - 1]}</Mono>
            </div>
          </div>
        )}

        <div style={{ background: SURFACE, borderRadius: 18, padding: '32px 28px', border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(26,16,24,0.06)' }}>
          {step === 1 && <StepAccount initial={account} onNext={d => { setAccount(d); save({ account: d }); goToStep(2); }} />}
          {step === 2 && <StepCommunity initial={community} onNext={d => { setCommunity(d); save({ community: d }); goToStep(3); }} onBack={() => goToStep(1)} />}
          {step === 3 && <StepColours initial={branding} onNext={d => { setBranding(d); save({ branding: d }); goToStep(4); }} onBack={() => goToStep(2)} />}
          {step === 4 && <StepCurrency initial={currency} onNext={d => { setCurrency(d); save({ currency: d }); goToStep(5); }} onBack={() => goToStep(3)} />}
          {step === 5 && <StepMembers initial={members} primaryColor={branding.primaryColor} onNext={d => { setMembers(d); save({ members: d }); launch(d); }} onBack={() => goToStep(4)} />}
          {step === 6 && <StepLaunching communityName={community.name} error={error} onRetry={() => goToStep(5)} />}
          {step === 7 && <StepLive communityName={community.name} slug={community.slug} primaryColor={branding.primaryColor} />}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Mono size={9} color={SLATE + '55'}>powered by flock · fan communities for independent artists</Mono>
        </div>
      </div>
    </div>
  );
}

// ── MARKETING PAGE ─────────────────────────────────────────────────────────

export default function StartClient({ showForm: initialShowForm = false }) {
  const [showForm, setShowForm] = useState(initialShowForm);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('join') === '1') setShowForm(true);
    }
  }, []);

  if (showForm) return <OnboardingWizard />;

  return (
    <div style={{ minHeight: '100vh', background: INK, fontFamily: "'DM Sans', sans-serif", color: CREAM }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;600;700&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: INK + 'EE', backdropFilter: 'blur(12px)', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✦</div>
          <div style={{ fontSize: 18, fontWeight: 700, textTransform: 'lowercase' }}>flock</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="#how" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: CREAM + '66', textDecoration: 'none' }}>how it works</a>
          <button onClick={() => setShowForm(true)} style={{ background: RUBY, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>get started</button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '80px 32px 60px', textAlign: 'center', animation: 'fadeUp 0.6s ease-out' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: RUBY + '22', border: `1px solid ${RUBY}44`, borderRadius: 20, padding: '6px 16px', marginBottom: 32 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: RUBY }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY + 'CC', letterSpacing: '1px' }}>the future of fan relationships</span>
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 7vw, 64px)', fontWeight: 700, lineHeight: 1.05, marginBottom: 24, letterSpacing: '-1.5px', textTransform: 'lowercase', margin: '0 0 24px' }}>
          social media broke<br />
          <span style={{ color: RUBY }}>the artist-fan</span><br />
          relationship.
        </h1>
        <p style={{ fontSize: 18, color: CREAM + '99', lineHeight: 1.7, maxWidth: 500, margin: '0 auto 40px' }}>
          you built an audience on platforms that own your fans, throttle your reach, and take the relationship hostage. flock gives it back.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setShowForm(true)} style={{ background: RUBY, color: '#fff', border: 'none', borderRadius: 12, padding: '16px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            launch your community ✦
          </button>
          <a href="#how" style={{ background: 'transparent', color: CREAM + '88', border: `1px solid ${CREAM}22`, borderRadius: 12, padding: '16px 28px', fontSize: 16, fontWeight: 500, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            see how it works
          </a>
        </div>
        <div style={{ marginTop: 16, fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM + '33' }}>
          ✦ free while we build · no credit card
        </div>
      </div>

      <div style={{ background: RUBY + '11', border: `1px solid ${RUBY}22`, maxWidth: 480, margin: '0 auto 80px', borderRadius: 14, padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY + '88', marginBottom: 8, letterSpacing: '1px', textTransform: 'uppercase' }}>powering right now</div>
        <div style={{ fontSize: 15, color: CREAM + 'CC', lineHeight: 1.6 }}>The Stamps fan community · <span style={{ color: RUBY, fontWeight: 700 }}>90+ active fans</span> · live show check-ins · tiered rewards · weekly digests</div>
      </div>

      <div id="how" style={{ maxWidth: 680, margin: '0 auto', padding: '0 32px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>how it works</div>
          <div style={{ fontSize: 32, fontWeight: 700, textTransform: 'lowercase', letterSpacing: '-0.5px' }}>one link. your world.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { icon: '✦', title: 'your link in bio', body: 'one URL replaces everything. fans join, post, earn rewards, check into shows - all in one place.' },
            { icon: '◉', title: 'fans earn points', body: 'posting, commenting, attending shows - every action earns currency you control. unlock rewards you set.' },
            { icon: '♫', title: 'show check-ins', body: 'fans check in at shows with a code. they earn points. you know who was there. no third party needed.' },
            { icon: '↗', title: 'off meta', body: 'no algorithm. no ad tax. a direct line to your most dedicated fans. forever yours.' },
          ].map(item => (
            <div key={item.title} style={{ background: CREAM + '06', border: `1px solid ${CREAM}0D`, borderRadius: 14, padding: '24px 20px' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 24, color: RUBY, marginBottom: 12 }}>{item.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, textTransform: 'lowercase', marginBottom: 8 }}>{item.title}</div>
              <div style={{ fontSize: 14, color: CREAM + '77', lineHeight: 1.65 }}>{item.body}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '0 32px 80px' }}>
        <button onClick={() => setShowForm(true)} style={{ background: RUBY, color: '#fff', border: 'none', borderRadius: 14, padding: '18px 40px', fontSize: 18, fontWeight: 700, cursor: 'pointer' }}>
          launch your community ✦
        </button>
        <div style={{ marginTop: 12, fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM + '33' }}>free while we build · no credit card</div>
      </div>

      <div style={{ borderTop: `1px solid ${CREAM}08`, padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM + '33' }}>© 2026 flock · monda management</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {['terms', 'privacy'].map(l => <a key={l} href={`/${l}`} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM + '33', textDecoration: 'none' }}>{l}</a>)}
        </div>
      </div>
    </div>
  );
}
