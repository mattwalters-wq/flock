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
        <Mono size={10}>already have a community? <a href="/login" style={{ color: RUBY, textDecoration: 'none', fontWeight: 600 }}>sign in</a></Mono>
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

      <a href={`${url}/dashboard`} style={{ display: 'block', width: '100%', padding: '14px', background: accent, color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 700, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
        go to my dashboard →
      </a>
      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <a href={url} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, textDecoration: 'none' }}>or visit my community →</a>
      </div>
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
      const { data: signInData } = await sb().auth.signInWithPassword({ email: account.email, password: account.password });
      localStorage.removeItem(STORAGE_KEY);
      goToStep(7);
      // Store session token so subdomain can pick it up
      if (signInData?.session) {
        sessionStorage.setItem('flock_new_session', JSON.stringify({
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
        }));
      }
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
          <a href="#how" style={{ color: 'rgba(245,239,230,0.6)', textDecoration: 'none', fontSize: 13 }}>features</a>
          <a href="#pricing" style={{ color: 'rgba(245,239,230,0.6)', textDecoration: 'none', fontSize: 13 }}>pricing</a>
          <a href="/login" style={{ color: 'rgba(245,239,230,0.6)', textDecoration: 'none', fontSize: 13 }}>sign in</a>
          <button onClick={() => setShowForm(true)} className="cta-btn" style={{ padding: '10px 22px', fontSize: 13 }}>get started</button>
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
        <div className="fade-4" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
          <button onClick={() => setShowForm(true)} className="cta-btn">launch your community ✦</button>
          <a href="#how" className="ghost-btn">see what's included</a>
        </div>
        <div className="fade-4" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(245,239,230,0.3)' }}>free in beta · no credit card needed</div>
      </section>

      {/* REPLACES EVERYTHING */}
      <section style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#8B1A2B', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 20 }}>one link replaces all of this</div>
        <h2 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 48 }}>
          your website. your link in bio.<br /><span style={{ color: 'rgba(245,239,230,0.35)' }}>your social media. all of it.</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 40 }}>
          {[
            { name: 'your website', cost: '$20–50/mo', what: 'squarespace, wix, wordpress. static. no engagement.', replaced: true },
            { name: 'linktree', cost: '$5–24/mo', what: 'a list of links. no community. no fans. just clicks.', replaced: true },
            { name: 'patreon', cost: '8–12% of revenue', what: 'they take a cut of every dollar your fans pay you.', replaced: true },
            { name: 'mailchimp', cost: '$20+/mo', what: 'one-way broadcast. no community, no engagement.', replaced: true },
            { name: 'bandsintown', cost: 'free → paid', what: 'show listings only. fans still belong to them.', replaced: true },
            { name: 'flock', cost: 'free in beta', what: 'website + link in bio + community + shows + rewards + email. yours forever.', replaced: false },
          ].map(p => (
            <div key={p.name} style={{ background: p.replaced ? 'rgba(245,239,230,0.03)' : 'rgba(139,26,43,0.15)', border: `1px solid ${p.replaced ? 'rgba(245,239,230,0.08)' : 'rgba(139,26,43,0.4)'}`, borderRadius: 12, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: p.replaced ? 'rgba(245,239,230,0.5)' : '#F5EFE6', textDecoration: p.replaced ? 'line-through' : 'none', textDecorationColor: 'rgba(245,239,230,0.3)' }}>{p.name}</span>
                {p.replaced
                  ? <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'rgba(139,26,43,0.8)', background: 'rgba(139,26,43,0.15)', padding: '2px 8px', borderRadius: 4 }}>replaced</span>
                  : <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#8B1A2B', background: 'rgba(139,26,43,0.2)', padding: '2px 8px', borderRadius: 4 }}>✦ this</span>
                }
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: p.replaced ? 'rgba(245,239,230,0.25)' : '#8B1A2B', marginBottom: 6 }}>{p.cost}</div>
              <div style={{ fontSize: 12, color: p.replaced ? 'rgba(245,239,230,0.35)' : 'rgba(245,239,230,0.7)', lineHeight: 1.5 }}>{p.what}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROBLEM */}
      <section style={{ padding: '60px 24px 100px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#8B1A2B', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 20 }}>the problem</div>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 48 }}>
          you have 50,000 followers.<br /><span style={{ color: 'rgba(245,239,230,0.35)' }}>500 of them see your posts.</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {[
            { icon: '↓', title: 'organic reach is dead', desc: 'Instagram shows your post to 2-5% of followers. The rest costs money.' },
            { icon: '✗', title: "you don't own the list", desc: 'Platform shuts down or bans you. Your audience disappears overnight.' },
            { icon: '∅', title: 'no real connection', desc: 'Likes and comments build dopamine loops for the platform, not loyalty for you.' },
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
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 16 }}>
            your community.<br />your currency.<br />your rules.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(245,239,230,0.5)', lineHeight: 1.7, maxWidth: 520, marginBottom: 64 }}>
            Every artist gets a fully branded fan community with a custom loyalty system - their own economy, their own language, their own world.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[
              { icon: '◎', title: 'your own subdomain', desc: 'artist.fans-flock.com or your own domain. Fully white-label. Fans never see "flock".' },
              { icon: '✦', title: 'custom fan currency', desc: 'Call them stamps, points, echoes, drops - whatever fits your world. Fans earn them.' },
              { icon: '○', title: 'member feeds', desc: 'Solo or band. Each member gets their own feed tab. Fans follow the people.' },
              { icon: '♫', title: 'show check-ins', desc: 'Fans check in at shows with a code and earn currency. You know who was there.' },
              { icon: '♛', title: 'reward tiers', desc: 'Postcards, merch, signed vinyl, zoom calls, meet and greets. You set the milestones.' },
              { icon: '▶', title: 'live to your community', desc: 'Go live on YouTube or Twitch and embed it inside Flock. Fans watch and chat inside your community, not on someone else\'s platform.' },
            ].map(f => (
              <div key={f.title} className="feature-card">
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, color: '#C9922A', marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(245,239,230,0.5)', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING + CTA */}
      <section id="pricing" style={{ padding: '100px 24px', background: 'rgba(245,239,230,0.02)', borderTop: '1px solid rgba(245,239,230,0.06)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-1px', marginBottom: 16 }}>
            the best fan relationships<br /><span style={{ color: 'rgba(245,239,230,0.35)' }}>were never built on social media.</span>
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(245,239,230,0.5)', lineHeight: 1.8, maxWidth: 520, margin: '0 auto 48px' }}>
            Flock is the infrastructure for what comes next. A place you own. Fans who chose to be there. No algorithm deciding who sees your work.
          </p>

          <div style={{ background: 'rgba(139,26,43,0.12)', border: '1px solid rgba(139,26,43,0.3)', borderRadius: 16, padding: '40px', marginBottom: 32 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#8B1A2B', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 16 }}>beta access</div>
            <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-2px', color: '#F5EFE6', marginBottom: 8 }}>free</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'rgba(245,239,230,0.5)', marginBottom: 28 }}>for independent artists while we build</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 32, textAlign: 'left' }}>
              {['your own community', 'custom fan currency', 'show check-ins', 'reward tiers', 'member feeds', 'direct email digest', 'fan map', 'livestream embeds', 'no revenue share. ever'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(245,239,230,0.7)' }}>
                  <span style={{ color: '#8B1A2B', fontFamily: "'DM Mono', monospace" }}>✓</span> {f}
                </div>
              ))}
            </div>
            <button onClick={() => setShowForm(true)} className="cta-btn" style={{ fontSize: 16, padding: '16px 48px' }}>launch your community ✦</button>
          </div>

          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(245,239,230,0.3)' }}>
            free in beta · no credit card needed · early artists get a founder rate
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(245,239,230,0.06)', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>flock ✦</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(245,239,230,0.3)', letterSpacing: '0.5px' }}>
          fan communities for independent artists
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <button onClick={() => setShowForm(true)} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(245,239,230,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>get started</button>
          <a href="/login" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(245,239,230,0.4)', textDecoration: 'none' }}>sign in</a>
          <a href="/contact" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(245,239,230,0.4)', textDecoration: 'none' }}>contact</a>
          <a href="/terms" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(245,239,230,0.4)', textDecoration: 'none' }}>terms</a>
          <a href="/privacy" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(245,239,230,0.4)', textDecoration: 'none' }}>privacy</a>
        </div>
      </footer>
    </div>
  );
}
