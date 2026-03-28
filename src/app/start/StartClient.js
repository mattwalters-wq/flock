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

const Input = ({ label, type = 'text', value, onChange, placeholder, hint, error, autoFocus }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>{label}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus}
      style={{ width: '100%', padding: '12px 14px', background: CREAM, border: `1px solid ${error ? RUBY : BORDER}`, borderRadius: 10, fontSize: 14, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', transition: 'border-color 0.15s' }} />
    {hint && !error && <Mono size={9} color={SLATE + '77'} style={{ marginTop: 5 }}>{hint}</Mono>}
    {error && <Mono size={9} color={RUBY} style={{ marginTop: 5 }}>{error}</Mono>}
  </div>
);

const Btn = ({ children, onClick, disabled, variant = 'primary', style = {} }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ padding: '13px 20px', background: variant === 'primary' ? (disabled ? BORDER : RUBY) : 'transparent', color: variant === 'primary' ? (disabled ? SLATE : '#fff') : SLATE, border: variant === 'ghost' ? `1px solid ${BORDER}` : 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: disabled ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s', ...style }}>
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
  { name: 'chips', icon: '◈', desc: 'playful' },
  { name: 'custom', icon: '✎', desc: 'your idea' },
];

// ── STEP COMPONENTS ────────────────────────────────────────────────────────

function StepAccount({ data, onChange, onNext }) {
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
      <Input label="your name" value={data.fullName} onChange={e => onChange({ ...data, fullName: e.target.value })} placeholder="how you'd like to be known" autoFocus error={errors.fullName} />
      <Input label="email" type="email" value={data.email} onChange={e => onChange({ ...data, email: e.target.value })} placeholder="you@example.com" error={errors.email} />
      <Input label="password" type="password" value={data.password} onChange={e => onChange({ ...data, password: e.target.value })} placeholder="at least 8 characters" hint="you'll use this to log into your dashboard" error={errors.password} />
      <Btn onClick={() => validate() && onNext()} style={{ width: '100%', marginTop: 8 }}>continue →</Btn>
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Mono size={10}>already have a community? <a href={`https://fans-flock.com/login`} style={{ color: RUBY, textDecoration: 'none', fontWeight: 600 }}>sign in</a></Mono>
      </div>
    </div>
  );
}

function StepCommunity({ data, onChange, onNext, onBack }) {
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
      <Input label="community name" value={data.name} onChange={e => { const name = e.target.value; onChange({ ...data, name, slug: slugify(name) }); setSlugAvailable(null); }} placeholder="e.g. The Stamps, Emma Donovan" autoFocus error={errors.name} />
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>your url</label>
        <div style={{ display: 'flex', alignItems: 'center', background: CREAM, border: `1px solid ${errors.slug ? RUBY : slugAvailable === true ? SAGE : BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 12px 12px 14px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE + '66', whiteSpace: 'nowrap', borderRight: `1px solid ${BORDER}`, background: BORDER + '44' }}>fans-flock.com/</div>
          <input type="text" value={data.slug} onChange={e => { onChange({ ...data, slug: slugify(e.target.value) }); setSlugAvailable(null); }} onBlur={() => data.slug && checkSlug(data.slug)}
            style={{ flex: 1, padding: '12px 12px', background: 'transparent', border: 'none', fontSize: 14, color: INK, outline: 'none', fontFamily: "'DM Mono', monospace" }} />
          <div style={{ padding: '0 12px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: checking ? SLATE : slugAvailable === true ? SAGE : slugAvailable === false ? RUBY : 'transparent' }}>
            {checking ? '...' : slugAvailable === true ? '✓' : slugAvailable === false ? '✗' : ''}
          </div>
        </div>
        {errors.slug && <Mono size={9} color={RUBY} style={{ marginTop: 5 }}>{errors.slug}</Mono>}
        {!errors.slug && slugAvailable === true && <Mono size={9} color={SAGE} style={{ marginTop: 5 }}>✓ available - looking good</Mono>}
        {!errors.slug && !data.slug && <Mono size={9} color={SLATE + '77'} style={{ marginTop: 5 }}>this is your permanent link in bio - choose carefully</Mono>}
      </div>
      <Input label="tagline (optional)" value={data.tagline} onChange={e => onChange({ ...data, tagline: e.target.value })} placeholder="a one-liner about you or your music" hint="shows on your public highlights page" />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Btn onClick={onBack} variant="ghost">← back</Btn>
        <Btn onClick={() => validate() && onNext()} style={{ flex: 1 }}>continue →</Btn>
      </div>
    </div>
  );
}

function StepColours({ data, onChange, onNext, onBack }) {
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
            <button key={preset.label} onClick={() => onChange({ ...data, primaryColor: preset.ruby, secondaryColor: preset.cream, inkColor: preset.ink })}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', background: selected ? preset.cream : SURFACE, border: `2px solid ${selected ? preset.ruby : BORDER}`, borderRadius: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: preset.ink }} />
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: preset.ruby }} />
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: preset.cream, border: '1px solid #ddd' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: selected ? 700 : 500, color: selected ? preset.ruby : INK }}>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Live preview */}
      <div style={{ background: data.inkColor || INK, borderRadius: 12, padding: '18px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 70% 30%, ${data.primaryColor}33, transparent 60%)` }} />
        <div style={{ position: 'relative' }}>
          <Mono size={8} color={data.secondaryColor || CREAM} style={{ letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6, opacity: 0.6 }}>preview</Mono>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, color: data.secondaryColor || CREAM, textTransform: 'lowercase', marginBottom: 8 }}>your community</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: data.primaryColor || RUBY, borderRadius: 8, padding: '8px 16px' }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#fff', fontWeight: 600 }}>join free ✦</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={onBack} variant="ghost">← back</Btn>
        <Btn onClick={onNext} style={{ flex: 1 }}>continue →</Btn>
      </div>
    </div>
  );
}

function StepCurrency({ data, onChange, onNext, onBack }) {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 6 }}>fan currency</div>
        <Mono>fans earn this for engaging with your community. pick something that feels like you.</Mono>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        {CURRENCY_PRESETS.map(preset => (
          <button key={preset.name} onClick={() => onChange({ ...data, name: preset.name })}
            style={{ padding: '14px 8px', background: data.name === preset.name ? RUBY + '11' : SURFACE, border: `2px solid ${data.name === preset.name ? RUBY : BORDER}`, borderRadius: 12, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, marginBottom: 4, color: data.name === preset.name ? RUBY : SLATE }}>{preset.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: data.name === preset.name ? RUBY : INK }}>{preset.name}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: SLATE, marginTop: 2 }}>{preset.desc}</div>
          </button>
        ))}
      </div>
      {data.name === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 10, marginBottom: 16 }}>
          <Input label="currency name" value={data.customName || ''} onChange={e => onChange({ ...data, customName: e.target.value })} placeholder="e.g. crystals, vibes, waves" />
          <Input label="icon" value={data.customIcon || ''} onChange={e => onChange({ ...data, customIcon: e.target.value.slice(0, 2) })} placeholder="✦" />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={onBack} variant="ghost">← back</Btn>
        <Btn onClick={onNext} style={{ flex: 1 }}>let's go →</Btn>
      </div>
    </div>
  );
}

function StepMembers({ data, onChange, onNext, onBack, primaryColor }) {
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
            if (type === 'solo') onChange({ actType: 'solo', members: [{ name: '', color: accent }] });
            else onChange({ actType: 'band', members: data.members.length > 1 ? data.members : [{ name: '', color: accent }, { name: '', color: accent }] });
          }} style={{ flex: 1, padding: '12px', background: data.actType === type ? accent + '11' : SURFACE, border: `2px solid ${data.actType === type ? accent : BORDER}`, borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: data.actType === type ? 700 : 500, color: data.actType === type ? accent : INK, transition: 'all 0.15s' }}>
            {type === 'solo' ? '○ solo artist' : '◎ band / group'}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {data.members.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="color" value={m.color || accent} onChange={e => { const n = [...data.members]; n[i] = { ...n[i], color: e.target.value }; onChange({ ...data, members: n }); }}
              style={{ width: 44, height: 44, padding: 3, border: `1px solid ${BORDER}`, borderRadius: 8, cursor: 'pointer', flexShrink: 0 }} />
            <input type="text" value={m.name} onChange={e => { const n = [...data.members]; n[i] = { ...n[i], name: e.target.value }; onChange({ ...data, members: n }); }} placeholder={data.actType === 'solo' ? 'your artist name' : `member ${i + 1} name`}
              style={{ flex: 1, padding: '11px 14px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
            {data.actType === 'band' && data.members.length > 1 && (
              <button onClick={() => onChange({ ...data, members: data.members.filter((_, j) => j !== i) })}
                style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, width: 36, height: 44, cursor: 'pointer', color: SLATE, fontSize: 16, flexShrink: 0 }}>×</button>
            )}
          </div>
        ))}
      </div>
      {data.actType === 'band' && data.members.length < 6 && (
        <button onClick={() => onChange({ ...data, members: [...data.members, { name: '', color: accent }] })}
          style={{ width: '100%', padding: '10px', background: 'transparent', border: `1px dashed ${BORDER}`, borderRadius: 10, cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, marginBottom: 16 }}>
          + add member
        </button>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={onBack} variant="ghost">← back</Btn>
        <Btn onClick={onNext} style={{ flex: 1 }}>create my community →</Btn>
      </div>
    </div>
  );
}

function StepLaunching({ communityName, slug, error }) {
  const [dots, setDots] = useState('');
  useEffect(() => {
    if (error) return;
    const i = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(i);
  }, [error]);

  if (error) return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>✗</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: INK, marginBottom: 8, textTransform: 'lowercase' }}>something went wrong</div>
      <Mono style={{ marginBottom: 20 }}>{error}</Mono>
      <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: RUBY, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>try again</button>
    </div>
  );

  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 16, animation: 'spin 2s linear infinite', display: 'inline-block' }}>✦</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: 22, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 8 }}>building your community{dots}</div>
      <Mono>setting everything up for {communityName}</Mono>
    </div>
  );
}

function StepLive({ communityName, slug, primaryColor }) {
  const [copied, setCopied] = useState(false);
  const url = `https://${slug}.${APP_DOMAIN}`;
  const highlightsUrl = `${url}/highlights`;
  const accent = primaryColor || RUBY;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 8 }}>you're live!</div>
        <Mono>{communityName} is ready for fans</Mono>
      </div>

      {/* The link */}
      <div style={{ background: INK, borderRadius: 14, padding: '20px 18px', marginBottom: 16 }}>
        <Mono size={9} color={'#fff' + '55'} style={{ marginBottom: 8, letterSpacing: '2px', textTransform: 'uppercase' }}>your link in bio</Mono>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: "'DM Mono', monospace", marginBottom: 14, wordBreak: 'break-all' }}>{url}</div>
        <button onClick={() => { navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
          style={{ width: '100%', padding: '12px', background: accent, color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          {copied ? 'copied ✓' : 'copy link'}
        </button>
        <Mono size={9} color={'#fff' + '44'} style={{ marginTop: 10, textAlign: 'center' }}>put this in your instagram bio right now</Mono>
      </div>

      {/* What to do next */}
      <div style={{ background: SURFACE, borderRadius: 14, padding: '18px', border: `1px solid ${BORDER}`, marginBottom: 16 }}>
        <Mono style={{ marginBottom: 14, letterSpacing: '1.5px', textTransform: 'uppercase' }}>next steps</Mono>
        {[
          { icon: '✦', text: 'write your first post to welcome fans in', done: false },
          { icon: '♫', text: 'add an upcoming show so fans can check in', done: false },
          { icon: '◉', text: 'share your highlights link on instagram', done: false },
          { icon: '⚙', text: 'upload your logo and banner in settings', done: false },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 3 ? `1px solid ${BORDER}` : 'none' }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: accent, width: 20, textAlign: 'center' }}>{item.icon}</span>
            <span style={{ fontSize: 13, color: INK, lineHeight: 1.4 }}>{item.text}</span>
          </div>
        ))}
      </div>

      <a href={url} style={{ display: 'block', width: '100%', padding: '14px', background: accent, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}>
        go to my community →
      </a>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <a href={highlightsUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, textDecoration: 'none' }}>preview your highlights page ↗</a>
      </div>
    </div>
  );
}

// ── MAIN WIZARD ────────────────────────────────────────────────────────────

function OnboardingWizard() {
  const [step, setStep] = useState(1); // 1-5 = steps, 6 = launching, 7 = live
  const [error, setError] = useState('');
  const [account, setAccount] = useState({ email: '', password: '', fullName: '' });
  const [community, setCommunity] = useState({ name: '', slug: '', tagline: '' });
  const [branding, setBranding] = useState({ primaryColor: '#8B1A2B', secondaryColor: '#F5EFE6', inkColor: '#1A1018' });
  const [currency, setCurrency] = useState({ name: 'points', icon: '✦', customName: '', customIcon: '' });
  const [members, setMembers] = useState({ actType: 'solo', members: [{ name: '', color: '#8B1A2B' }] });

  const TOTAL_STEPS = 5;

  const launch = async () => {
    setStep(6); setError('');
    const finalCurrencyName = currency.name === 'custom' ? currency.customName : currency.name;
    const finalCurrencyIcon = currency.name === 'custom' ? (currency.customIcon || '✦') : (CURRENCY_PRESETS.find(p => p.name === currency.name)?.icon || '✦');

    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account,
          community,
          branding: { primaryColor: branding.primaryColor, secondaryColor: branding.secondaryColor, inkColor: branding.inkColor },
          currency: { name: finalCurrencyName, icon: finalCurrencyIcon },
          members,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'something went wrong'); return; }

      // Auto sign in
      await sb().auth.signInWithPassword({ email: account.email, password: account.password });
      setStep(7);
    } catch (e) {
      setError(e.message);
    }
  };

  const progress = step <= TOTAL_STEPS ? ((step - 1) / TOTAL_STEPS) * 100 : 100;

  return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px 48px', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div style={{ width: '100%', maxWidth: 480, animation: 'fadeIn 0.4s ease-out' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <a href="/start" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: CREAM }}>✦</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>flock</div>
          </a>
        </div>

        {/* Progress bar */}
        {step <= TOTAL_STEPS && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ height: 3, background: BORDER, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: branding.primaryColor || RUBY, borderRadius: 2, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <Mono size={9} color={SLATE + '77'}>step {step} of {TOTAL_STEPS}</Mono>
              <Mono size={9} color={SLATE + '77'}>{Math.round(progress)}%</Mono>
            </div>
          </div>
        )}

        {/* Card */}
        <div style={{ background: SURFACE, borderRadius: 18, padding: '32px 28px', border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(26,16,24,0.06)', animation: 'fadeIn 0.4s ease-out' }}>
          {step === 1 && <StepAccount data={account} onChange={setAccount} onNext={() => setStep(2)} />}
          {step === 2 && <StepCommunity data={community} onChange={setCommunity} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && <StepColours data={branding} onChange={setBranding} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
          {step === 4 && <StepCurrency data={currency} onChange={setCurrency} onNext={() => setStep(5)} onBack={() => setStep(3)} />}
          {step === 5 && <StepMembers data={members} onChange={setMembers} onNext={launch} onBack={() => setStep(4)} primaryColor={branding.primaryColor} />}
          {step === 6 && <StepLaunching communityName={community.name} slug={community.slug} error={error} />}
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* Nav */}
      <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: INK + 'EE', backdropFilter: 'blur(12px)', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✦</div>
          <div style={{ fontSize: 18, fontWeight: 700, textTransform: 'lowercase' }}>flock</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="#how" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: CREAM + '66', textDecoration: 'none' }}>how it works</a>
          <a href="/start?join=1" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: CREAM + '88', textDecoration: 'none' }}>sign in</a>
          <button onClick={() => setShowForm(true)} style={{ background: RUBY, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>get started</button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '80px 32px 60px', textAlign: 'center', animation: 'fadeUp 0.6s ease-out' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: RUBY + '22', border: `1px solid ${RUBY}44`, borderRadius: 20, padding: '6px 16px', marginBottom: 32 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: RUBY }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY + 'CC', letterSpacing: '1px' }}>the future of fan relationships</span>
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 7vw, 64px)', fontWeight: 700, lineHeight: 1.05, marginBottom: 24, letterSpacing: '-1.5px', textTransform: 'lowercase' }}>
          social media broke<br />
          <span style={{ color: RUBY }}>the artist-fan</span><br />
          relationship.
        </h1>
        <p style={{ fontSize: 18, color: CREAM + '99', lineHeight: 1.7, marginBottom: 40, maxWidth: 500, margin: '0 auto 40px' }}>
          you built an audience on platforms that own your fans, throttle your reach, and take the relationship hostage. flock gives it back.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setShowForm(true)} style={{ background: RUBY, color: '#fff', border: 'none', borderRadius: 12, padding: '16px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
            launch your community ✦
          </button>
          <a href="#how" style={{ background: 'transparent', color: CREAM + '88', border: `1px solid ${CREAM}22`, borderRadius: 12, padding: '16px 28px', fontSize: 16, fontWeight: 500, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            see how it works
          </a>
        </div>
        <div style={{ marginTop: 16, fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM + '33' }}>
          ✦ pricing coming soon · free while we build
        </div>
      </div>

      {/* Social proof */}
      <div style={{ background: RUBY + '11', border: `1px solid ${RUBY}22`, maxWidth: 480, margin: '0 auto 80px', borderRadius: 14, padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY + '88', marginBottom: 8, letterSpacing: '1px', textTransform: 'uppercase' }}>powering right now</div>
        <div style={{ fontSize: 15, color: CREAM + 'CC', lineHeight: 1.6 }}>The Stamps fan community with <span style={{ color: RUBY, fontWeight: 700 }}>90+ active fans</span>, live show check-ins, a rewards system, and weekly digests</div>
      </div>

      {/* How it works */}
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

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '0 32px 80px' }}>
        <button onClick={() => setShowForm(true)} style={{ background: RUBY, color: '#fff', border: 'none', borderRadius: 14, padding: '18px 40px', fontSize: 18, fontWeight: 700, cursor: 'pointer' }}>
          launch your community ✦
        </button>
        <div style={{ marginTop: 12, fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM + '33' }}>free while we build · no credit card</div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${CREAM}08`, padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM + '33' }}>© 2026 flock · monda management</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {['terms', 'privacy'].map(l => <a key={l} href={`/${l}`} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM + '33', textDecoration: 'none' }}>{l}</a>)}
        </div>
      </div>
    </div>
  );
}
