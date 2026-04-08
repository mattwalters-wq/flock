'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

const INK = '#1a1a1a'; const CREAM = '#F5F0E8'; const RUBY = '#8B1A2B';
const WARM_GOLD = '#C9922A'; const SLATE = '#6A5A62'; const SURFACE = '#FAF5F0';
const BORDER = '#E8DDD4'; const SAGE = '#7D8B6A';

const H = ({ children, size = 22, style = {} }) => (
  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: size, fontWeight: 700, color: INK, textTransform: 'lowercase', lineHeight: 1.1, ...style }}>{children}</div>
);
const Mono = ({ children, size = 10, color = SLATE, style = {} }) => (
  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: size, color, letterSpacing: '0.5px', ...style }}>{children}</div>
);
const Btn = ({ children, onClick, variant = 'primary', disabled, style = {} }) => (
  <button onClick={onClick} disabled={disabled} style={{ padding: '9px 18px', background: variant === 'primary' ? INK : variant === 'danger' ? RUBY : variant === 'success' ? SAGE : 'transparent', color: variant === 'ghost' ? SLATE : '#fff', border: variant === 'ghost' ? `1px solid ${BORDER}` : 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, fontFamily: "'DM Sans', sans-serif", ...style }}>{children}</button>
);

// ============ SETUP CHECKLIST ============
function SetupChecklist({ supabase, tenantId }) {
  const [checks, setChecks] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!supabase || !tenantId) return;
    (async () => {
      const [cfgRes, postsRes, showsRes, membersRes] = await Promise.all([
        supabase.from('tenant_config').select('key, value').eq('tenant_id', tenantId),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('shows').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('role', 'fan'),
      ]);

      const cfg = {};
      (cfgRes.data || []).forEach(({ key, value }) => { cfg[key] = value; });

      const hasSocials = !!(cfg.social_instagram || cfg.social_spotify || cfg.social_tiktok);
      const hasLogo = !!cfg.logo_url;
      const hasBanner = !!cfg.banner_url;
      const hasTagline = !!cfg.tagline;
      const hasPosts = (postsRes.count || 0) > 0;
      const hasShows = (showsRes.count || 0) > 0;
      const hasFans = (membersRes.count || 0) > 0;
      const hasHighlightsLink = hasPosts; // proxy - if they've posted they've probably highlighted

      setChecks({ hasSocials, hasLogo, hasBanner, hasTagline, hasPosts, hasShows, hasFans });
    })();
  }, [supabase, tenantId]);

  if (!checks) return null;

  const steps = [
    { key: 'hasSocials', label: 'add your social links', detail: 'instagram, spotify, tiktok - so fans can find you everywhere', tab: 'settings', section: 'socials' },
    { key: 'hasTagline', label: 'write your tagline', detail: 'one line about you - shows on your public page', tab: 'settings', section: 'profile' },
    { key: 'hasLogo', label: 'upload your logo', detail: 'replaces the text name in your header and public page', tab: 'settings', section: 'banner' },
    { key: 'hasPosts', label: 'write your first post', detail: 'welcome your fans in - they see this when they join', tab: null, action: 'post' },
    { key: 'hasShows', label: 'add an upcoming show', detail: 'fans can check in and earn points', tab: 'shows' },
    { key: 'hasFans', label: 'get your first fan', detail: 'share your link in bio and invite someone', tab: null, action: 'share' },
  ];

  const done = steps.filter(s => checks[s.key]).length;
  const total = steps.length;
  const allDone = done === total;
  const pct = Math.round((done / total) * 100);

  if (allDone && collapsed) return null;

  return (
    <div style={{ background: allDone ? SAGE + '15' : SURFACE, borderRadius: 14, border: `1px solid ${allDone ? SAGE + '44' : BORDER}`, marginBottom: 24, overflow: 'hidden' }}>
      {/* Header */}
      <div onClick={() => setCollapsed(c => !c)} style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 4 }}>
            {allDone ? 'you\'re all set up ✦' : `set up your community · ${done} of ${total} done`}
          </div>
          <div style={{ height: 4, background: BORDER, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: allDone ? SAGE : RUBY, borderRadius: 2, transition: 'width 0.4s ease' }} />
          </div>
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE }}>{collapsed ? 'show ↓' : 'hide ↑'}</div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div style={{ borderTop: `1px solid ${BORDER}` }}>
          {steps.map((step, i) => {
            const done = checks[step.key];
            return (
              <div key={step.key} style={{ padding: '13px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, borderBottom: i < steps.length - 1 ? `1px solid ${BORDER}` : 'none', background: done ? 'transparent' : 'transparent', opacity: done ? 0.6 : 1 }}>
                {/* Tick */}
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: done ? SAGE : 'transparent', border: `2px solid ${done ? SAGE : BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all 0.2s' }}>
                  {done && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                </div>
                {/* Text */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: done ? 500 : 600, color: done ? SLATE : INK, textDecoration: done ? 'line-through' : 'none', textDecorationColor: SLATE + '66' }}>{step.label}</div>
                  {!done && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '88', marginTop: 3, lineHeight: 1.5 }}>{step.detail}</div>}
                </div>
                {/* Action */}
                {!done && (
                  <div>
                    {step.tab && (
                      <button onClick={() => {
                        // Dispatch custom event to switch tabs
                        window.dispatchEvent(new CustomEvent('dashboard-tab', { detail: step.tab }));
                      }} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY, background: 'none', border: `1px solid ${RUBY}33`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        go →
                      </button>
                    )}
                    {step.action === 'share' && (
                      <button onClick={() => {
                        const url = typeof window !== 'undefined' ? window.location.origin : '';
                        navigator.clipboard.writeText(url);
                      }} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY, background: 'none', border: `1px solid ${RUBY}33`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        copy link
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* All done state */}
          {allDone && (
            <div style={{ padding: '16px 18px', background: SAGE + '0F' }}>
              <div style={{ fontSize: 13, color: SAGE, fontWeight: 600, marginBottom: 4 }}>community fully set up ✦</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, lineHeight: 1.6 }}>
                now focus on growing - post regularly, share your highlights page, and reward your most active fans.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ OVERVIEW ============
function Overview({ supabase, tenantId, currencyName, currencyIcon }) {
  const [stats, setStats] = useState({ members: 0, posts: 0, shows: 0, totalPoints: 0, pendingClaims: 0 });
  const [recentMembers, setRecentMembers] = useState([]);
  const [digestSending, setDigestSending] = useState(false);
  const [copiedHighlights, setCopiedHighlights] = useState(false);
  const [copiedCommunity, setCopiedCommunity] = useState(false);
  const [digestResult, setDigestResult] = useState('');
  const [digestIntro, setDigestIntro] = useState('');
  const [showDigest, setShowDigest] = useState(false);

  useEffect(() => {
    (async () => {
      const [members, posts, shows, pending] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('shows').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('reward_claims').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending'),
      ]);
      const { data: pd } = await supabase.from('profiles').select('stamp_count').eq('tenant_id', tenantId);
      setStats({ members: members.count || 0, posts: posts.count || 0, shows: shows.count || 0, totalPoints: (pd || []).reduce((s, p) => s + (p.stamp_count || 0), 0), pendingClaims: pending.count || 0 });
      const { data: recent } = await supabase.from('profiles').select('display_name, stamp_count, created_at, role').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(6);
      setRecentMembers(recent || []);
    })();
  }, [supabase, tenantId]);

  const sendDigest = async () => {
    setDigestSending(true); setDigestResult('');
    try {
      const res = await fetch('/api/digest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId, intro: digestIntro }) });
      const data = await res.json();
      setDigestResult(data.message || (res.ok ? 'sent!' : 'something went wrong'));
    } catch { setDigestResult('error sending'); }
    setDigestSending(false);
  };

  return (
    <div>
      <SetupChecklist supabase={supabase} tenantId={tenantId} />
      <H style={{ marginBottom: 20 }}>overview</H>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'members', value: stats.members, color: SAGE },
          { label: 'posts', value: stats.posts, color: RUBY },
          { label: 'shows', value: stats.shows, color: WARM_GOLD },
          { label: `${currencyName} out`, value: stats.totalPoints, color: '#6B5B8D' },
          { label: 'pending rewards', value: stats.pendingClaims, color: stats.pendingClaims > 0 ? RUBY : SLATE },
        ].map(s => (
          <div key={s.label} style={{ background: SURFACE, borderRadius: 10, padding: '16px 14px', border: `1px solid ${BORDER}` }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
            <Mono style={{ marginTop: 4 }}>{s.label}</Mono>
          </div>
        ))}
      </div>

      <Mono style={{ marginBottom: 10, letterSpacing: '1.5px', textTransform: 'uppercase' }}>recent members</Mono>
      <div style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 24 }}>
        {recentMembers.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <Mono>no members yet</Mono>
            <div style={{ marginTop: 8, fontSize: 12, color: SLATE }}>share your community link to get fans signed up</div>
          </div>
        ) : recentMembers.map((m, i) => (
          <div key={i} style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < recentMembers.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>{m.display_name?.charAt(0)?.toLowerCase() || '?'}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{m.display_name?.toLowerCase()}</div>
                <Mono size={9} color={SLATE + '88'}>{m.created_at ? new Date(m.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''}</Mono>
              </div>
            </div>
            <Mono size={11} color={WARM_GOLD}>{m.stamp_count || 0} {currencyIcon}</Mono>
          </div>
        ))}
      </div>

      <Mono style={{ marginBottom: 10, letterSpacing: '1.5px', textTransform: 'uppercase' }}>grow your community</Mono>
      <div style={{ background: INK, borderRadius: 12, padding: '20px 18px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 28 }}>✦</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: CREAM, textTransform: 'lowercase', marginBottom: 4 }}>share your highlights page</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM + '66', lineHeight: 1.6 }}>
              a public page your fans can share on instagram, tiktok, anywhere. shows your best posts + upcoming shows. fans join directly from it.
            </div>
          </div>
        </div>
        <div style={{ background: CREAM + '12', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontFamily: "'DM Mono', monospace", fontSize: 11, color: CREAM + '77', wordBreak: 'break-all' }}>
          {typeof window !== 'undefined' ? `${window.location.origin}/highlights` : '...'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => {
            const url = typeof window !== 'undefined' ? `${window.location.origin}/highlights` : '';
            navigator.clipboard.writeText(url).then(() => { setCopiedHighlights(true); setTimeout(() => setCopiedHighlights(false), 2000); });
          }} style={{ flex: 1, padding: '10px', background: RUBY, color: CREAM, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            {copiedHighlights ? 'copied ✓' : 'copy highlights link'}
          </button>
          <a href={typeof window !== 'undefined' ? `${window.location.origin}/highlights` : '#'} target="_blank" rel="noopener noreferrer"
            style={{ padding: '10px 14px', background: CREAM + '12', color: CREAM + '77', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center' }}>
            preview ↗
          </a>
        </div>
        <div style={{ marginTop: 10, fontFamily: "'DM Mono', monospace", fontSize: 9, color: CREAM + '33' }}>
          tip: mark your best posts as ✦ highlights so they show up here
        </div>
      </div>

      <div style={{ background: SURFACE, borderRadius: 12, padding: '16px 18px', border: `1px solid ${BORDER}`, marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 4 }}>community link</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 10 }}>direct signup link - goes straight to join page</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={typeof window !== 'undefined' ? window.location.origin : ''} style={{ flex: 1, padding: '9px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11, color: SLATE, fontFamily: "'DM Mono', monospace", outline: 'none' }} />
          <Btn onClick={() => {
            const url = typeof window !== 'undefined' ? window.location.origin : '';
            navigator.clipboard.writeText(url).then(() => { setCopiedCommunity(true); setTimeout(() => setCopiedCommunity(false), 2000); });
          }} variant="ghost" style={{ fontSize: 11 }}>{copiedCommunity ? 'copied ✓' : 'copy'}</Btn>
        </div>
      </div>

      <Mono style={{ marginBottom: 10, letterSpacing: '1.5px', textTransform: 'uppercase' }}>community digest email</Mono>
      <div style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}`, padding: '18px' }}>
        <div style={{ fontSize: 13, color: SLATE, marginBottom: 14, lineHeight: 1.5 }}>Send a roundup to all fans who opted in. Pulls recent posts and shows automatically.</div>
        {!showDigest ? (
          <Btn onClick={() => setShowDigest(true)} variant="ghost">compose digest</Btn>
        ) : (
          <>
            <textarea value={digestIntro} onChange={e => setDigestIntro(e.target.value)} placeholder="opening note - a personal message from you to your fans (optional)..." rows={3}
              style={{ width: '100%', padding: '10px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Btn onClick={sendDigest} disabled={digestSending}>{digestSending ? 'sending...' : 'send to all fans'}</Btn>
              <Btn onClick={() => { setShowDigest(false); setDigestResult(''); }} variant="ghost">cancel</Btn>
              {digestResult && <Mono size={11} color={digestResult.includes('error') || digestResult.includes('wrong') ? RUBY : SAGE}>{digestResult}</Mono>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============ POSTS ============
function Posts({ supabase, tenantId, profile }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [feedType, setFeedType] = useState('community');
  const [posting, setPosting] = useState(false);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    supabase.from('tenant_members').select('*').eq('tenant_id', tenantId).order('display_order').then(({ data }) => setMembers(data || []));
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('posts').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(30);
    setPosts(data || []); setLoading(false);
  };

  const doPost = async () => {
    if (!content.trim() || posting) return;
    setPosting(true);
    await supabase.from('posts').insert({ author_id: profile.id, content: content.trim(), feed_type: feedType, tenant_id: tenantId });
    setContent(''); load(); setPosting(false);
  };

  const feedOptions = [{ id: 'community', label: 'everyone' }, ...members.map(m => ({ id: m.slug, label: m.name?.toLowerCase() }))];

  return (
    <div>
      <H style={{ marginBottom: 20 }}>posts</H>
      <div style={{ background: SURFACE, borderRadius: 10, padding: '16px', border: `1px solid ${BORDER}`, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {feedOptions.map(f => (
            <button key={f.id} onClick={() => setFeedType(f.id)} style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${feedType === f.id ? RUBY : BORDER}`, background: feedType === f.id ? RUBY + '11' : 'transparent', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, color: feedType === f.id ? RUBY : SLATE }}>{f.label}</button>
          ))}
        </div>
        <textarea value={content} onChange={e => setContent(e.target.value)} onKeyDown={e => e.metaKey && e.key === 'Enter' && doPost()} placeholder="post to your community..." rows={3}
          style={{ width: '100%', padding: '10px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Mono size={9} color={SLATE + '66'}>⌘ + enter to post</Mono>
          <Btn onClick={doPost} disabled={!content.trim() || posting}>{posting ? 'posting...' : 'post'}</Btn>
        </div>
      </div>

      {loading ? <Mono style={{ padding: 20, textAlign: 'center' }}>loading...</Mono> : posts.length === 0 ? (
        <Mono style={{ padding: 20, textAlign: 'center' }}>no posts yet · write your first one above</Mono>
      ) : posts.map(p => (
        <div key={p.id} style={{ background: SURFACE, borderRadius: 10, padding: '14px 16px', marginBottom: 8, border: `1px solid ${p.is_highlight ? WARM_GOLD + '44' : BORDER}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                <div style={{ padding: '2px 8px', background: BORDER, borderRadius: 10, fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE }}>{p.feed_type}</div>
                {p.is_pinned && <div style={{ padding: '2px 8px', background: WARM_GOLD + '22', borderRadius: 10, fontFamily: "'DM Mono', monospace", fontSize: 9, color: WARM_GOLD }}>pinned</div>}
                {p.is_highlight && <div style={{ padding: '2px 8px', background: WARM_GOLD + '22', borderRadius: 10, fontFamily: "'DM Mono', monospace", fontSize: 9, color: WARM_GOLD }}>✦ highlight</div>}
              </div>
              <div style={{ fontSize: 13, color: INK, lineHeight: 1.55, marginBottom: 6, whiteSpace: 'pre-wrap' }}>{p.content}</div>
              <Mono size={9} color={SLATE + '77'}>{new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Mono>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button onClick={async () => { await supabase.from('posts').update({ is_pinned: !p.is_pinned }).eq('id', p.id); load(); }} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 9, color: p.is_pinned ? WARM_GOLD : SLATE }}>{p.is_pinned ? 'unpin' : 'pin'}</button>
              <button onClick={async () => { await supabase.from('posts').update({ is_highlight: !p.is_highlight }).eq('id', p.id); load(); }} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 9, color: p.is_highlight ? WARM_GOLD : SLATE }}>✦</button>
              <button onClick={async () => { await supabase.from('posts').delete().eq('id', p.id); setPosts(prev => prev.filter(x => x.id !== p.id)); }} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 9, color: RUBY }}>×</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ SHOWS ============
function ShowInput({ label, field, type = 'text', placeholder, form, setForm }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <Mono style={{ marginBottom: 4 }}>{label}</Mono>
      <input type={type} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
    </div>
  );
}

function ShowForm({ form, setForm, onSave, onCancel, saving, saveLabel }) {
  const REGIONS = ['australia', 'europe', 'uk', 'north_america', 'other'];
  return (
    <div style={{ background: SURFACE, borderRadius: 10, padding: '18px', border: `1px solid ${BORDER}`, marginBottom: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <ShowInput form={form} setForm={setForm} label="venue" field="venue" placeholder="venue name" />
        <ShowInput form={form} setForm={setForm} label="city" field="city" placeholder="city" />
      </div>
      <div style={{ marginBottom: 10 }}>
        <Mono style={{ marginBottom: 4 }}>region</Mono>
        <select value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} style={{ width: '100%', padding: '9px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif" }}>
          {REGIONS.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <ShowInput form={form} setForm={setForm} label="date" field="date" type="date" />
        <ShowInput form={form} setForm={setForm} label="ticket url (optional)" field="ticket_url" placeholder="https://..." />
      </div>
      <ShowInput form={form} setForm={setForm} label="check-in code (leave blank to auto-generate)" field="checkin_code" placeholder="e.g. DUSTIN24" />
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={onSave} disabled={!form.venue || !form.city || !form.date || saving}>{saving ? 'saving...' : saveLabel}</Btn>
        {onCancel && <Btn onClick={onCancel} variant="ghost">cancel</Btn>}
      </div>
    </div>
  );
}

function Shows({ supabase, tenantId }) {
  const [shows, setShows] = useState([]);
  const [form, setForm] = useState({ venue: '', city: '', region: 'australia', date: '', ticket_url: '', checkin_code: '' });
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingShow, setEditingShow] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => { load(); }, []);
  const load = () => supabase.from('shows').select('*').eq('tenant_id', tenantId).order('date').then(({ data }) => setShows(data || []));

  const add = async () => {
    if (!form.venue || !form.city || !form.date) return;
    setAdding(true);
    const code = form.checkin_code || Math.random().toString(36).substring(2, 8).toUpperCase();
    await supabase.from('shows').insert({ ...form, checkin_code: code, tenant_id: tenantId });
    setForm({ venue: '', city: '', region: 'australia', date: '', ticket_url: '', checkin_code: '' });
    setShowForm(false); load(); setAdding(false);
  };

  const startEdit = (show) => {
    setEditingShow(show.id);
    setEditForm({ venue: show.venue, city: show.city, region: show.region || 'australia', date: show.date, ticket_url: show.ticket_url || '', checkin_code: show.checkin_code || '' });
  };

  const saveEdit = async () => {
    if (!editForm.venue || !editForm.city || !editForm.date) return;
    setSavingEdit(true);
    await supabase.from('shows').update({ ...editForm }).eq('id', editingShow);
    setEditingShow(null); setEditForm(null); load(); setSavingEdit(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <H>shows</H>
        <Btn onClick={() => { setShowForm(!showForm); setEditingShow(null); }} variant="ghost">{showForm ? 'cancel' : '+ add show'}</Btn>
      </div>

      {showForm && <ShowForm form={form} setForm={setForm} onSave={add} onCancel={() => setShowForm(false)} saving={adding} saveLabel="add show" />}

      {shows.length === 0 ? <Mono style={{ padding: 20, textAlign: 'center' }}>no shows added yet</Mono> : shows.map(show => (
        <div key={show.id} style={{ marginBottom: 8 }}>
          {editingShow === show.id ? (
            <ShowForm form={editForm} setForm={setEditForm} onSave={saveEdit} onCancel={() => { setEditingShow(null); setEditForm(null); }} saving={savingEdit} saveLabel="save changes" />
          ) : (
            <div style={{ background: SURFACE, borderRadius: 10, padding: '14px 16px', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <Mono size={11} style={{ minWidth: 64 }}>{new Date(show.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</Mono>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{show.city}</div>
                <Mono size={10} color={SLATE + '99'}>{show.venue}{show.region ? ` · ${show.region.replace('_', ' ')}` : ''}</Mono>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {show.checkin_code && <div style={{ background: INK, color: CREAM, borderRadius: 6, padding: '4px 12px', fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: '2px' }}>{show.checkin_code}</div>}
                {show.ticket_url && <a href={show.ticket_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY, textDecoration: 'none' }}>tickets ↗</a>}
                <button onClick={() => startEdit(show)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: SLATE, fontFamily: "'DM Mono', monospace" }}>edit</button>
                <button onClick={async () => { await supabase.from('shows').delete().eq('id', show.id); setShows(p => p.filter(x => x.id !== show.id)); }} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: RUBY, fontFamily: "'DM Mono', monospace" }}>×</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============ MEMBERS ============
function Members({ supabase, tenantId }) {
  const [members, setMembers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { supabase.from('tenant_members').select('*').eq('tenant_id', tenantId).order('display_order').then(({ data }) => setMembers(data || [])); }, []);

  const save = async (m) => {
    setSaving(true);
    await supabase.from('tenant_members').update({ name: m.name, bio: m.bio, accent_color: m.accent_color, avatar_url: m.avatar_url || null }).eq('id', m.id);
    setMembers(prev => prev.map(x => x.id === m.id ? m : x));
    setEditing(null); setSaving(false);
  };

  return (
    <div>
      <H style={{ marginBottom: 8 }}>members</H>
      <div style={{ fontSize: 13, color: SLATE, marginBottom: 20, lineHeight: 1.5 }}>Each member gets their own feed tab. Fans can follow individual members alongside the whole community.</div>
      {members.length === 0 ? (
        <Mono style={{ padding: 20, textAlign: 'center' }}>no members configured</Mono>
      ) : members.map(m => (
        <div key={m.id} style={{ background: SURFACE, borderRadius: 10, padding: '16px', border: `1px solid ${BORDER}`, marginBottom: 10, borderLeft: `3px solid ${m.accent_color || RUBY}` }}>
          {editing?.id === m.id ? (
            <div>
              {/* Photo upload */}
              <div style={{ marginBottom: 14 }}>
                <Mono style={{ marginBottom: 8 }}>profile photo</Mono>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 10, background: editing.accent_color || RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {editing.avatar_url
                      ? <img src={editing.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: '#fff', fontSize: 20, fontFamily: "'DM Mono', monospace" }}>{editing.name?.charAt(0)?.toLowerCase() || '?'}</span>}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: CREAM, border: `1px dashed ${BORDER}`, borderRadius: 8, cursor: 'pointer' }}>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file || file.size > 2 * 1024 * 1024) return;
                      const ext = file.name.split('.').pop();
                      const path = `members/${tenantId}/${editing.id}.${ext}`;
                      const { error } = await supabase.storage.from('media').upload(path, file, { cacheControl: '3600', upsert: true });
                      if (!error) {
                        const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
                        setEditing(p => ({ ...p, avatar_url: urlData?.publicUrl }));
                      }
                    }} />
                    <Mono size={10}>upload photo</Mono>
                  </label>
                  {editing.avatar_url && <button onClick={() => setEditing(p => ({ ...p, avatar_url: '' }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: RUBY, fontFamily: "'DM Mono', monospace", fontSize: 10 }}>remove</button>}
                </div>
              </div>
              {[{ label: 'name', field: 'name' }, { label: 'bio', field: 'bio' }].map(({ label, field }) => (
                <div key={field} style={{ marginBottom: 10 }}>
                  <Mono style={{ marginBottom: 4 }}>{label}</Mono>
                  <input type="text" value={editing[field] || ''} onChange={e => setEditing(p => ({ ...p, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <Mono style={{ marginBottom: 4 }}>accent colour</Mono>
                <input type="color" value={editing.accent_color || '#8B1A2B'} onChange={e => setEditing(p => ({ ...p, accent_color: e.target.value }))} style={{ width: 48, height: 36, padding: 2, border: `1px solid ${BORDER}`, borderRadius: 6, cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={() => save(editing)} disabled={saving}>{saving ? 'saving...' : 'save'}</Btn>
                <Btn onClick={() => setEditing(null)} variant="ghost">cancel</Btn>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: m.accent_color || RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700 }}>{m.name?.charAt(0)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{m.name}</div>
                {m.bio && <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>{m.bio}</div>}
                <Mono size={9} color={SLATE + '77'} style={{ marginTop: 2 }}>/{m.slug}</Mono>
              </div>
              <Btn onClick={() => setEditing({ ...m })} variant="ghost">edit</Btn>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============ POINTS MANAGER ============
function TierFormField({ label, field, type = 'text', placeholder, span = 1, value, onChange }) {
  return (
    <div style={{ gridColumn: `span ${span}`, marginBottom: 10 }}>
      <Mono style={{ marginBottom: 4 }}>{label}</Mono>
      <input type={type} value={value[field] ?? ''} onChange={e => onChange({ ...value, [field]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value })} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: field === 'icon' ? "'DM Mono', monospace" : "'DM Sans', sans-serif", boxSizing: 'border-box', textAlign: field === 'icon' ? 'center' : 'left' }} />
    </div>
  );
}

function TierForm({ value, onChange, currencyName, currencyIcon, onSave, onCancel, saving, saveLabel = 'add tier' }) {
  return (
    <div style={{ background: SURFACE, borderRadius: 10, padding: '16px', border: `1px solid ${BORDER}`, marginBottom: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0 10px' }}>
        <TierFormField value={value} onChange={onChange} label="tier name" field="name" placeholder="e.g. Inner Circle" />
        <TierFormField value={value} onChange={onChange} label={`${currencyName} required`} field="stamps" type="number" placeholder="500" />
        <TierFormField value={value} onChange={onChange} label="icon" field="icon" placeholder="✦" />
      </div>
      <TierFormField value={value} onChange={onChange} label="reward description" field="reward_desc" placeholder="what fans get at this level..." span={3} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={onSave} disabled={!value.name || !value.reward_desc || saving}>{saving ? 'saving...' : saveLabel}</Btn>
        <Btn onClick={onCancel} variant="ghost">cancel</Btn>
      </div>
    </div>
  );
}

function PointsManager({ supabase, tenantId, currencyName, currencyIcon }) {
  const [actions, setActions] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [newTier, setNewTier] = useState({ name: '', stamps: 0, icon: '✦', reward_type: '', reward_desc: '' });
  const [showNewTier, setShowNewTier] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    supabase.from('stamp_actions').select('*').eq('tenant_id', tenantId).order('points').then(({ data }) => setActions(data || []));
    supabase.from('reward_tiers').select('*').eq('tenant_id', tenantId).order('sort_order').then(({ data }) => setTiers(data || []));
  }, [tenantId]);

  const toggleAction = async (a) => {
    await supabase.from('stamp_actions').update({ is_active: !a.is_active }).eq('id', a.id);
    setActions(prev => prev.map(x => x.id === a.id ? { ...x, is_active: !x.is_active } : x));
  };

  const addTier = async () => {
    if (!newTier.name || !newTier.reward_desc) return;
    setSavingNew(true);
    await supabase.from('reward_tiers').insert({ ...newTier, tenant_id: tenantId, sort_order: tiers.length, is_active: true, key: newTier.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') });
    const { data } = await supabase.from('reward_tiers').select('*').eq('tenant_id', tenantId).order('sort_order');
    setTiers(data || []);
    setNewTier({ name: '', stamps: 0, icon: '✦', reward_type: '', reward_desc: '' });
    setShowNewTier(false); setSavingNew(false);
  };

  const saveTier = async () => {
    if (!editingTier?.name || !editingTier?.reward_desc) return;
    setSavingEdit(true);
    await supabase.from('reward_tiers').update({
      name: editingTier.name, stamps: editingTier.stamps, icon: editingTier.icon,
      reward_desc: editingTier.reward_desc, reward_type: editingTier.reward_type,
    }).eq('id', editingTier.id);
    setTiers(prev => prev.map(t => t.id === editingTier.id ? { ...t, ...editingTier } : t));
    setEditingTier(null); setSavingEdit(false);
  };

  const deleteTier = async (id) => {
    await supabase.from('reward_tiers').delete().eq('id', id);
    setTiers(p => p.filter(x => x.id !== id));
  };

  return (
    <div>
      <H style={{ marginBottom: 20 }}>{currencyName}</H>

      <Mono style={{ marginBottom: 10, letterSpacing: '1.5px', textTransform: 'uppercase' }}>how fans earn {currencyName}</Mono>
      <div style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 24 }}>
        {actions.length === 0 ? <Mono style={{ padding: 16, textAlign: 'center' }}>no actions configured</Mono> : actions.map((a, i) => (
          <div key={a.id} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < actions.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: INK, fontWeight: 500 }}>{a.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <Mono size={9} color={SLATE + '88'}>{a.action_type} · {a.trigger_key}</Mono>
                {a.daily_cap && <Mono size={9} color={WARM_GOLD}>max {a.daily_cap}x/day</Mono>}
              </div>
            </div>
            <Mono size={12} color={WARM_GOLD} style={{ minWidth: 50, textAlign: 'right' }}>+{a.points} {currencyIcon}</Mono>
            <div style={{ display: 'flex', flex: 'column', alignItems: 'center', gap: 6 }}>
              <select value={a.daily_cap || ''} onChange={async e => {
                const cap = e.target.value ? parseInt(e.target.value) : null;
                await supabase.from('stamp_actions').update({ daily_cap: cap }).eq('id', a.id);
                setActions(prev => prev.map(x => x.id === a.id ? { ...x, daily_cap: cap } : x));
              }} title="daily cap - max times this earns points per day" style={{ padding: '3px 6px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 10, color: SLATE, fontFamily: "'DM Mono', monospace", cursor: 'pointer' }}>
                <option value="">no cap</option>
                <option value="1">1x/day</option>
                <option value="3">3x/day</option>
                <option value="5">5x/day</option>
                <option value="10">10x/day</option>
              </select>
            </div>
            <button onClick={() => toggleAction(a)} style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: a.is_active ? RUBY : BORDER, position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: '#fff', position: 'absolute', top: 2, left: a.is_active ? 20 : 2, transition: 'left 0.2s' }} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Mono style={{ letterSpacing: '1.5px', textTransform: 'uppercase' }}>reward tiers</Mono>
        <Btn onClick={() => { setShowNewTier(!showNewTier); setEditingTier(null); }} variant="ghost" style={{ fontSize: 11, padding: '5px 12px' }}>{showNewTier ? 'cancel' : '+ add tier'}</Btn>
      </div>

      {showNewTier && (
        <TierForm value={newTier} onChange={setNewTier} currencyName={currencyName} currencyIcon={currencyIcon} onSave={addTier} onCancel={() => setShowNewTier(false)} saving={savingNew} saveLabel="add tier" />
      )}

      <div style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}` }}>
        {tiers.length === 0 ? <Mono style={{ padding: 16, textAlign: 'center' }}>no reward tiers yet</Mono> : tiers.map((t, i) => (
          <div key={t.id}>
            {editingTier?.id === t.id ? (
              <div style={{ padding: '12px 16px', borderBottom: i < tiers.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                <TierForm value={editingTier} onChange={setEditingTier} currencyName={currencyName} currencyIcon={currencyIcon} onSave={saveTier} onCancel={() => setEditingTier(null)} saving={savingEdit} saveLabel="save changes" />
              </div>
            ) : (
              <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < tiers.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: INK, color: WARM_GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 16, flexShrink: 0 }}>{t.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>{t.reward_desc}</div>
                </div>
                <Mono size={11} color={WARM_GOLD} style={{ minWidth: 50, textAlign: 'right', flexShrink: 0 }}>{t.stamps} {currencyIcon}</Mono>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <button onClick={async () => {
                    const idx = tiers.findIndex(x => x.id === t.id);
                    if (idx === 0) return;
                    const newTiers = [...tiers];
                    [newTiers[idx-1], newTiers[idx]] = [newTiers[idx], newTiers[idx-1]];
                    setTiers(newTiers);
                    await Promise.all([supabase.from('reward_tiers').update({ sort_order: idx-1 }).eq('id', newTiers[idx-1].id), supabase.from('reward_tiers').update({ sort_order: idx }).eq('id', newTiers[idx].id)]);
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: SLATE, fontSize: 9, padding: '1px 4px', lineHeight: 1 }}>▲</button>
                  <button onClick={async () => {
                    const idx = tiers.findIndex(x => x.id === t.id);
                    if (idx === tiers.length - 1) return;
                    const newTiers = [...tiers];
                    [newTiers[idx+1], newTiers[idx]] = [newTiers[idx], newTiers[idx+1]];
                    setTiers(newTiers);
                    await Promise.all([supabase.from('reward_tiers').update({ sort_order: idx+1 }).eq('id', newTiers[idx+1].id), supabase.from('reward_tiers').update({ sort_order: idx }).eq('id', newTiers[idx].id)]);
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: SLATE, fontSize: 9, padding: '1px 4px', lineHeight: 1 }}>▼</button>
                </div>
                <button onClick={() => { setEditingTier({ ...t }); setShowNewTier(false); }} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, flexShrink: 0 }}>edit</button>
                <button onClick={() => deleteTier(t.id)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, flexShrink: 0 }}>×</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ REWARDS ============
function Rewards({ supabase, tenantId, currencyIcon }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('reward_claims').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      let pMap = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
        if (profiles) profiles.forEach(p => { pMap[p.id] = p; });
      }
      setClaims(data.map(c => ({ ...c, profile: pMap[c.user_id] })));
    }
    setLoading(false);
  };

  const update = async (id, status) => {
    await supabase.from('reward_claims').update({ status }).eq('id', id);
    setClaims(p => p.map(x => x.id === id ? { ...x, status } : x));
  };

  const statusColor = s => s === 'pending' ? WARM_GOLD : s === 'approved' ? SAGE : s === 'shipped' ? '#6B5B8D' : SLATE;

  return (
    <div>
      <H style={{ marginBottom: 20 }}>rewards</H>
      {loading ? <Mono style={{ padding: 20, textAlign: 'center' }}>loading...</Mono> : claims.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Mono>no reward claims yet</Mono>
          <div style={{ marginTop: 8, fontSize: 12, color: SLATE }}>when fans hit a reward tier they'll claim it here</div>
        </div>
      ) : claims.map(c => (
        <div key={c.id} style={{ background: SURFACE, borderRadius: 10, padding: '16px', border: `1px solid ${c.status === 'pending' ? WARM_GOLD + '44' : BORDER}`, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{c.profile?.display_name?.toLowerCase() || 'fan'}</div>
                <div style={{ padding: '2px 8px', borderRadius: 10, border: `1px solid ${statusColor(c.status)}44`, fontFamily: "'DM Mono', monospace", fontSize: 9, color: statusColor(c.status) }}>{c.status}</div>
                <Mono size={10}>{c.level_key?.replace(/_/g, ' ')} · {c.reward_type}</Mono>
              </div>
              {c.shipping_name && (
                <div style={{ marginTop: 6, padding: '10px 12px', background: CREAM, borderRadius: 8, fontSize: 12, color: SLATE, lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 600, color: INK }}>{c.shipping_name}</div>
                  <div>{c.shipping_address}</div>
                  <div>{c.shipping_city} {c.shipping_postcode}, {c.shipping_country}</div>
                </div>
              )}
              <Mono size={9} color={SLATE + '77'} style={{ marginTop: 6 }}>{new Date(c.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</Mono>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {c.status === 'pending' && <Btn onClick={() => update(c.id, 'approved')} style={{ fontSize: 11, padding: '6px 12px' }}>approve</Btn>}
              {c.status === 'approved' && <Btn onClick={() => update(c.id, 'shipped')} variant="success" style={{ fontSize: 11, padding: '6px 12px' }}>mark shipped</Btn>}
              {!['denied', 'shipped'].includes(c.status) && <Btn onClick={() => update(c.id, 'denied')} variant="ghost" style={{ fontSize: 11, padding: '6px 12px', color: RUBY, borderColor: RUBY + '44' }}>deny</Btn>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ FANS ============
function Fans({ supabase, tenantId, currencyName, currencyIcon }) {
  const [fans, setFans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.from('profiles').select('*').eq('tenant_id', tenantId).order('stamp_count', { ascending: false }).then(({ data }) => { setFans(data || []); setLoading(false); });
  }, []);

  const filtered = fans.filter(f => !search || f.display_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <H style={{ marginBottom: 20 }}>fans</H>
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="search fans..." style={{ width: '100%', padding: '10px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', marginBottom: 14 }} />

      {loading ? <Mono style={{ padding: 20, textAlign: 'center' }}>loading...</Mono> : filtered.length === 0 ? (
        <Mono style={{ padding: 20, textAlign: 'center' }}>{search ? 'no fans found' : 'no fans yet'}</Mono>
      ) : filtered.map(fan => (
        <div key={fan.id} style={{ background: SURFACE, borderRadius: 10, padding: '12px 16px', marginBottom: 8, border: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>{fan.display_name?.charAt(0)?.toLowerCase() || '?'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{fan.display_name?.toLowerCase()}</div>
              <Mono size={9} color={SLATE + '88'}>{[fan.city, fan.role].filter(Boolean).join(' · ')}</Mono>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mono size={12} color={WARM_GOLD}>{fan.stamp_count || 0} {currencyIcon}</Mono>
              <button onClick={async () => {
                const newCount = (fan.stamp_count || 0) + 10;
                await supabase.from('profiles').update({ stamp_count: newCount }).eq('id', fan.id);
                setFans(p => p.map(x => x.id === fan.id ? { ...x, stamp_count: newCount } : x));
              }} title={`award 10 ${currencyName}`} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, color: WARM_GOLD }}>+10</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ SETTINGS ============
const FONT_OPTIONS = [
  { key: 'dm_sans', label: 'DM Sans', desc: 'clean & modern', heading: "'DM Sans', sans-serif", body: "'DM Sans', sans-serif" },
  { key: 'playfair', label: 'Playfair Display', desc: 'elegant & editorial', heading: "'Playfair Display', serif", body: "'DM Sans', sans-serif" },
  { key: 'space_grotesk', label: 'Space Grotesk', desc: 'techy & distinctive', heading: "'Space Grotesk', sans-serif", body: "'Space Grotesk', sans-serif" },
  { key: 'libre_baskerville', label: 'Libre Baskerville', desc: 'literary & warm', heading: "'Libre Baskerville', serif", body: "'DM Sans', sans-serif" },
  { key: 'syne', label: 'Syne', desc: 'bold & expressive', heading: "'Syne', sans-serif", body: "'DM Sans', sans-serif" },
];

const PALETTE_PRESETS = [
  { key: 'default', label: 'Flock Default', ruby: '#8B1A2B', cream: '#F5EFE6', ink: '#1A1018' },
  { key: 'midnight', label: 'Midnight', ruby: '#6B5ECD', cream: '#F0EEF8', ink: '#1A1830' },
  { key: 'forest', label: 'Forest', ruby: '#2D6A4F', cream: '#F0F5F0', ink: '#1A2B1F' },
  { key: 'terracotta', label: 'Terracotta', ruby: '#C1440E', cream: '#FBF0EB', ink: '#2B1810' },
  { key: 'slate', label: 'Slate', ruby: '#4A6FA5', cream: '#EEF2F8', ink: '#1A2030' },
  { key: 'custom', label: 'Custom', ruby: null, cream: null, ink: null },
];

function SettingsSection({ id, label, children, activeSection, setActiveSection }) {
  const isOpen = Array.isArray(activeSection) ? activeSection.includes(id) : activeSection === id;
  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={() => setActiveSection(id)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: isOpen ? INK : SURFACE, border: `1px solid ${BORDER}`, borderRadius: isOpen ? '10px 10px 0 0' : 10, cursor: 'pointer' }}>
        <Mono size={10} color={isOpen ? CREAM + '88' : SLATE} style={{ letterSpacing: '1.5px', textTransform: 'uppercase' }}>{label}</Mono>
        <Mono size={12} color={isOpen ? CREAM + '55' : SLATE}>{isOpen ? '−' : '+'}</Mono>
      </button>
      {isOpen && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '20px 18px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function SettingsField({ label, field, placeholder, type = 'text', prefix, cfg, setCfg }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Mono style={{ marginBottom: 6 }}>{label}</Mono>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {prefix && <div style={{ padding: '10px 12px', background: BORDER, borderRadius: '8px 0 0 8px', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, border: `1px solid ${BORDER}`, borderRight: 'none' }}>{prefix}</div>}
        <input type={type} value={cfg[field] || ''} onChange={e => setCfg(p => ({ ...p, [field]: e.target.value }))} placeholder={placeholder}
          style={{ flex: 1, padding: '10px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: prefix ? '0 8px 8px 0' : 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', width: '100%' }} />
      </div>
    </div>
  );
}

function Settings({ supabase, tenantId, currencyName, currencyIcon }) {
  const [cfg, setCfg] = useState({
    currency_name: currencyName,
    currency_icon: currencyIcon,
    color_ruby: '#8B1A2B',
    color_cream: '#F5EFE6',
    color_ink: '#1A1018',
    font_key: 'dm_sans',
    banner_url: '',
    logo_url: '',
    tagline: '',
    social_instagram: '',
    social_spotify: '',
    social_apple_music: '',
    social_tiktok: '',
    social_youtube: '',
    social_website: '',
    notify_fans_on_post: 'true',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [openSections, setOpenSections] = useState(['branding', 'socials', 'profile']);
  const activeSection = openSections[0]; // backwards compat
  const setActiveSection = (id) => setOpenSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  useEffect(() => {
    if (typeof window !== 'undefined') setLink(window.location.origin);
    if (!supabase || !tenantId) return;
    supabase.from('tenant_config').select('key, value').eq('tenant_id', tenantId).then(({ data }) => {
      if (data) {
        const loaded = {};
        data.forEach(({ key, value }) => { loaded[key] = value; });
        setCfg(prev => ({ ...prev, ...loaded }));
        if (loaded.banner_url) setBannerPreview(loaded.banner_url);
        if (loaded.logo_url) setLogoPreview(loaded.logo_url);
      }
    });
  }, [supabase, tenantId]);

  const save = async () => {
    setSaving(true);
    let bannerUrl = cfg.banner_url;
    let logoUrl = cfg.logo_url;

    if (logoFile) {
      const ext = logoFile.name.split('.').pop();
      const path = `logos/${tenantId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage.from('media').upload(path, logoFile, { cacheControl: '3600', upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
        logoUrl = urlData?.publicUrl || logoUrl;
      }
    }

    if (bannerFile) {
      setUploadingBanner(true);
      const ext = bannerFile.name.split('.').pop();
      const path = `banners/${tenantId}/banner.${ext}`;
      const { error: upErr } = await supabase.storage.from('media').upload(path, bannerFile, { cacheControl: '3600', upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
        bannerUrl = urlData?.publicUrl || bannerUrl;
      }
      setUploadingBanner(false);
    }

    const toSave = { ...cfg, banner_url: bannerUrl, logo_url: logoUrl };
    // Update local state so URLs persist after save
    setCfg(prev => ({ ...prev, banner_url: bannerUrl, logo_url: logoUrl }));
    if (bannerUrl) setBannerPreview(bannerUrl);
    if (logoUrl) setLogoPreview(logoUrl);
    setLogoFile(null);
    setBannerFile(null);
    for (const [key, value] of Object.entries(toSave)) {
      if (value !== null && value !== undefined) {
        await supabase.from('tenant_config').upsert({ tenant_id: tenantId, key, value }, { onConflict: 'tenant_id,key' });
      }
    }

    // Apply colours live without reload
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--ruby', toSave.color_ruby || '#8B1A2B');
      document.documentElement.style.setProperty('--cream', toSave.color_cream || '#F5EFE6');
      document.documentElement.style.setProperty('--ink', toSave.color_ink || '#1A1018');
    }

    setSaved(true); setSaving(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const applyPreset = (preset) => {
    if (preset.key === 'custom') return;
    setCfg(p => ({ ...p, color_ruby: preset.ruby, color_cream: preset.cream, color_ink: preset.ink }));
  };

  const selectedFont = FONT_OPTIONS.find(f => f.key === cfg.font_key) || FONT_OPTIONS[0];


  return (
    <div>
      <H style={{ marginBottom: 6 }}>settings</H>
      <div style={{ fontSize: 13, color: SLATE, marginBottom: 24, lineHeight: 1.5 }}>customise how your community looks and feels. changes apply instantly for all fans.</div>

      {/* Community link - always visible at top */}
      <div style={{ background: INK, borderRadius: 12, padding: '20px 18px', marginBottom: 20 }}>
        <Mono size={9} color={CREAM + '55'} style={{ letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>your link in bio</Mono>
        <div style={{ fontSize: 18, fontWeight: 700, color: CREAM, fontFamily: "'DM Sans', sans-serif", marginBottom: 12, wordBreak: 'break-all' }}>{link}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
            style={{ flex: 1, padding: '10px', background: copied ? WARM_GOLD : RUBY, color: copied ? INK : CREAM, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            {copied ? 'copied ✓' : 'copy link'}
          </button>
          <a href={link} target="_blank" rel="noopener noreferrer"
            style={{ padding: '10px 16px', background: CREAM + '15', color: CREAM + '88', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center' }}>
            visit ↗
          </a>
        </div>
        <Mono size={9} color={CREAM + '44'} style={{ marginTop: 10 }}>put this everywhere · instagram bio · twitter · linktree · email signature</Mono>
      </div>

      <SettingsSection activeSection={openSections} setActiveSection={setActiveSection} id="branding" label="colours & fonts">
        {/* Colour presets */}
        <Mono style={{ marginBottom: 10 }}>colour preset</Mono>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {PALETTE_PRESETS.filter(p => p.key !== 'custom').map(preset => (
            <button key={preset.key} onClick={() => applyPreset(preset)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: cfg.color_ruby === preset.ruby ? INK : CREAM, border: `1px solid ${cfg.color_ruby === preset.ruby ? INK : BORDER}`, borderRadius: 8, cursor: 'pointer' }}>
              <div style={{ display: 'flex', gap: 3 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: preset.ink }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: preset.ruby }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: preset.cream, border: '1px solid #ddd' }} />
              </div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: cfg.color_ruby === preset.ruby ? CREAM : SLATE }}>{preset.label}</span>
            </button>
          ))}
        </div>

        {/* Custom colour pickers */}
        <Mono style={{ marginBottom: 10 }}>custom colours</Mono>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'accent', field: 'color_ruby', desc: 'buttons, highlights' },
            { label: 'background', field: 'color_cream', desc: 'page background' },
            { label: 'text', field: 'color_ink', desc: 'headings & body' },
          ].map(({ label, field, desc }) => (
            <div key={field} style={{ textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 6 }}>
                <div style={{ width: 52, height: 52, borderRadius: 10, background: cfg[field] || '#888', border: `2px solid ${BORDER}`, position: 'relative', overflow: 'hidden' }}>
                  <input type="color" value={cfg[field] || '#888888'} onChange={e => setCfg(p => ({ ...p, [field]: e.target.value }))}
                    style={{ position: 'absolute', inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', padding: 0, border: 'none', cursor: 'pointer', opacity: 0 }} />
                  <div style={{ position: 'absolute', inset: 0, background: cfg[field] || '#888', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: 2, right: 2, background: 'rgba(0,0,0,0.3)', borderRadius: 3, padding: '1px 4px', fontFamily: "'DM Mono', monospace", fontSize: 7, color: '#fff', pointerEvents: 'none' }}>✎</div>
                </div>
              </div>
              <Mono size={9} style={{ marginBottom: 2 }}>{label}</Mono>
              <Mono size={8} color={SLATE + '66'}>{desc}</Mono>
            </div>
          ))}
        </div>

        {/* Font selector */}
        <Mono style={{ marginBottom: 10 }}>font style</Mono>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 6 }}>
          {FONT_OPTIONS.map(font => (
            <button key={font.key} onClick={() => setCfg(p => ({ ...p, font_key: font.key }))}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: cfg.font_key === font.key ? INK : CREAM, border: `1px solid ${cfg.font_key === font.key ? INK : BORDER}`, borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: font.heading, fontSize: 16, fontWeight: 700, color: cfg.font_key === font.key ? CREAM : INK, textTransform: 'lowercase' }}>{font.label}</div>
                <Mono size={9} color={cfg.font_key === font.key ? CREAM + '55' : SLATE}>{font.desc}</Mono>
              </div>
              {cfg.font_key === font.key && <span style={{ color: WARM_GOLD, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>✦</span>}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection activeSection={openSections} setActiveSection={setActiveSection} id="banner" label="logo & banner image">
        <Mono style={{ marginBottom: 10 }}>logo (png with transparent background)</Mono>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          {logoPreview ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={logoPreview} alt="logo" style={{ height: 56, maxWidth: 180, objectFit: 'contain', borderRadius: 8, background: INK, padding: '8px 12px', display: 'block' }} />
              <button onClick={() => { setLogoPreview(null); setLogoFile(null); setCfg(p => ({ ...p, logo_url: '' })); }}
                style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: RUBY, color: CREAM, border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          ) : (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: CREAM, border: `2px dashed ${BORDER}`, borderRadius: 10, cursor: 'pointer' }}>
              <input type="file" accept="image/png,image/svg+xml,image/webp" onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { alert('logo must be under 2MB'); return; }
                setLogoFile(file);
                const r = new FileReader();
                r.onload = ev => setLogoPreview(ev.target.result);
                r.readAsDataURL(file);
              }} style={{ display: 'none' }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, color: SLATE }}>⊕</span>
              <div>
                <Mono>upload logo</Mono>
                <Mono size={9} color={SLATE + '66'}>png or svg · transparent bg · max 2MB</Mono>
              </div>
            </label>
          )}
          {logoPreview && <Mono size={10} color={SAGE}>replaces text name in header and highlights page</Mono>}
        </div>

        <Mono style={{ marginBottom: 10 }}>banner image</Mono>
        <div style={{ fontSize: 13, color: SLATE, marginBottom: 12, lineHeight: 1.5 }}>
          Shows at the top of your highlights page. Best size: 1200×400px.
        </div>
        {bannerPreview ? (
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <img src={bannerPreview} alt="banner" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}`, display: 'block' }} />
            <button onClick={() => { setBannerPreview(null); setBannerFile(null); setCfg(p => ({ ...p, banner_url: '' })); }}
              style={{ position: 'absolute', top: 8, right: 8, background: INK + 'CC', color: CREAM, border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>remove</button>
          </div>
        ) : (
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '32px', background: CREAM, border: `2px dashed ${BORDER}`, borderRadius: 10, cursor: 'pointer', marginBottom: 16 }}>
            <input type="file" accept="image/*" onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 5 * 1024 * 1024) { alert('image must be under 5MB'); return; }
              setBannerFile(file);
              const r = new FileReader();
              r.onload = ev => setBannerPreview(ev.target.result);
              r.readAsDataURL(file);
            }} style={{ display: 'none' }} />
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, color: SLATE }}>⊕</div>
            <Mono>upload banner image</Mono>
            <Mono size={9} color={SLATE + '66'}>jpg, png, webp · max 5MB</Mono>
          </label>
        )}
      </SettingsSection>

      <SettingsSection activeSection={openSections} setActiveSection={setActiveSection} id="profile" label="artist profile">
        <SettingsField cfg={cfg} setCfg={setCfg} label="tagline" field="tagline" placeholder="a short line about you or your music" />
        <SettingsField cfg={cfg} setCfg={setCfg} label="bio" field="bio" placeholder="a longer description for your community page" />
      </SettingsSection>

      <SettingsSection activeSection={openSections} setActiveSection={setActiveSection} id="socials" label="social & streaming links">
        <div style={{ fontSize: 13, color: SLATE, marginBottom: 16, lineHeight: 1.5 }}>
          These appear on your community landing page - the link in bio your fans see before they sign up.
        </div>
        <SettingsField cfg={cfg} setCfg={setCfg} label="instagram" field="social_instagram" placeholder="yourhandle" prefix="instagram.com/" />
        <SettingsField cfg={cfg} setCfg={setCfg} label="tiktok" field="social_tiktok" placeholder="yourhandle" prefix="tiktok.com/@" />
        <SettingsField cfg={cfg} setCfg={setCfg} label="spotify" field="social_spotify" placeholder="artist URL" prefix="open.spotify.com/" />
        <SettingsField cfg={cfg} setCfg={setCfg} label="apple music" field="social_apple_music" placeholder="artist URL" />
        <SettingsField cfg={cfg} setCfg={setCfg} label="youtube" field="social_youtube" placeholder="channel URL" />
        <SettingsField cfg={cfg} setCfg={setCfg} label="website" field="social_website" placeholder="https://yoursite.com" />
      </SettingsSection>

      <SettingsSection activeSection={openSections} setActiveSection={setActiveSection} id="currency" label="fan currency">
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 10, marginBottom: 6 }}>
          <div>
            <Mono style={{ marginBottom: 6 }}>currency name</Mono>
            <input type="text" value={cfg.currency_name || ''} onChange={e => setCfg(p => ({ ...p, currency_name: e.target.value }))} placeholder="points, stamps, echoes..."
              style={{ width: '100%', padding: '10px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
          </div>
          <div>
            <Mono style={{ marginBottom: 6 }}>icon</Mono>
            <input type="text" value={cfg.currency_icon || ''} onChange={e => setCfg(p => ({ ...p, currency_icon: e.target.value.slice(0, 2) }))} placeholder="✦"
              style={{ width: '100%', padding: '10px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 20, color: INK, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection id="notifications" label="email notifications" activeSection={openSections} setActiveSection={setActiveSection}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 3 }}>notify fans when you post</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, lineHeight: 1.5 }}>fans who have notifications on will get an email when you post</div>
          </div>
          <button onClick={() => setCfg(p => ({ ...p, notify_fans_on_post: p.notify_fans_on_post === 'false' ? 'true' : 'false' }))}
            style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: cfg.notify_fans_on_post !== 'false' ? RUBY : BORDER, position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginLeft: 16 }}>
            <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 2, left: cfg.notify_fans_on_post !== 'false' ? 22 : 2, transition: 'left 0.2s' }} />
          </button>
        </div>
      </SettingsSection>

      {/* Save button */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 20 }}>
        <Btn onClick={save} disabled={saving || uploadingBanner} style={{ flex: 1, padding: '14px', fontSize: 14 }}>
          {saving ? 'saving...' : uploadingBanner ? 'uploading image...' : 'save all changes'}
        </Btn>
        {saved && <div style={{ padding: '10px 16px', background: SAGE + '22', border: `1px solid ${SAGE}44`, borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 11, color: SAGE }}>saved ✓</div>}
      </div>
    </div>
  );
}

// ============ MAIN ============
export default function Dashboard() {
  // Resolve tenantId client-side since server headers are unreliable on Vercel
  const { user, profile, supabase, tenantId: authTenantId, loading } = useAuth();
  const [clientTenantId, setClientTenantId] = useState(null);
  const tenantId = clientTenantId || authTenantId;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const host = window.location.hostname;
    if (host.endsWith(`.${APP_DOMAIN}`)) {
      const slug = host.replace(`.${APP_DOMAIN}`, '');
      const sb = supabase;
      if (sb) sb.from('tenants').select('id').eq('slug', slug).single().then(({ data }) => { if (data?.id) setClientTenantId(data.id); });
    }
  }, [supabase]);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [tenant, setTenant] = useState(null);
  const [currencyName, setCurrencyName] = useState('points');
  const [currencyIcon, setCurrencyIcon] = useState('✦');

  useEffect(() => {
    if (loading) return; // still loading auth
    if (!user) { router.push('/'); return; }
    if (!tenantId) return; // wait for tenant to resolve before checking profile
    if (profile && profile.role === 'fan') router.push('/');
  }, [user, profile, loading, tenantId]);

  useEffect(() => {
    if (!supabase || !tenantId) return;
    supabase.from('tenants').select('*').eq('id', tenantId).single().then(({ data }) => setTenant(data));
    supabase.from('tenant_config').select('key, value').eq('tenant_id', tenantId).then(({ data }) => {
      if (data) data.forEach(({ key, value }) => {
        if (key === 'currency_name') setCurrencyName(value);
        if (key === 'currency_icon') setCurrencyIcon(value);
      });
    });
  }, [supabase, tenantId]);

  const TABS = [
    { id: 'overview', label: 'overview', icon: '◎' },
    { id: 'posts', label: 'posts', icon: '✎' },
    { id: 'shows', label: 'shows', icon: '♫' },
    { id: 'members', label: 'members', icon: '○' },
    { id: 'points', label: currencyName, icon: currencyIcon },
    { id: 'rewards', label: 'rewards', icon: '♛' },
    { id: 'fans', label: 'fans', icon: '◉' },
    { id: 'settings', label: 'settings', icon: '⚙' },
  ];

  // Listen for tab switch events from the setup checklist
  useEffect(() => {
    const handler = (e) => setActiveTab(e.detail);
    window.addEventListener('dashboard-tab', handler);
    return () => window.removeEventListener('dashboard-tab', handler);
  }, []);

  if (loading || !profile) return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: SLATE }}>✦</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: INK, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: CREAM, flexShrink: 0 }}>✦</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: CREAM, textTransform: 'lowercase', lineHeight: 1 }}>{tenant?.name || 'flock'}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: CREAM + '44', letterSpacing: '1px' }}>dashboard</div>
          </div>
        </div>
        <a href="/" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM, background: CREAM + '15', border: `1px solid ${CREAM}22`, padding: '6px 14px', borderRadius: 8, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← view community
        </a>
      </div>

      {/* Tab bar */}
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: '0 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', gap: 0, minWidth: 'max-content' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '14px 16px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? `2px solid ${RUBY}` : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: activeTab === tab.id ? RUBY : SLATE + '88' }}>{tab.icon}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: activeTab === tab.id ? RUBY : SLATE, fontWeight: activeTab === tab.id ? 600 : 400, letterSpacing: '0.5px' }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 60px' }}>
        {activeTab === 'overview' && <Overview supabase={supabase} tenantId={tenantId} currencyName={currencyName} currencyIcon={currencyIcon} />}
        {activeTab === 'posts' && <Posts supabase={supabase} tenantId={tenantId} profile={profile} />}
        {activeTab === 'shows' && <Shows supabase={supabase} tenantId={tenantId} />}
        {activeTab === 'members' && <Members supabase={supabase} tenantId={tenantId} />}
        {activeTab === 'points' && <PointsManager supabase={supabase} tenantId={tenantId} currencyName={currencyName} currencyIcon={currencyIcon} />}
        {activeTab === 'rewards' && <Rewards supabase={supabase} tenantId={tenantId} currencyIcon={currencyIcon} />}
        {activeTab === 'fans' && <Fans supabase={supabase} tenantId={tenantId} currencyName={currencyName} currencyIcon={currencyIcon} />}
        {activeTab === 'settings' && <Settings supabase={supabase} tenantId={tenantId} currencyName={currencyName} currencyIcon={currencyIcon} />}
      </div>
    </div>
  );
}
