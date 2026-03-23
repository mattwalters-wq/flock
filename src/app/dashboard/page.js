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

// ============ OVERVIEW ============
function Overview({ supabase, tenantId, currencyName, currencyIcon }) {
  const [stats, setStats] = useState({ members: 0, posts: 0, shows: 0, totalPoints: 0, pendingClaims: 0 });
  const [recentMembers, setRecentMembers] = useState([]);
  const [digestSending, setDigestSending] = useState(false);
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
function Shows({ supabase, tenantId }) {
  const [shows, setShows] = useState([]);
  const [form, setForm] = useState({ venue: '', city: '', region: 'australia', date: '', ticket_url: '', checkin_code: '' });
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const REGIONS = ['australia', 'europe', 'uk', 'north_america', 'other'];

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

  const Input = ({ label, field, type = 'text', placeholder }) => (
    <div style={{ marginBottom: 10 }}>
      <Mono style={{ marginBottom: 4 }}>{label}</Mono>
      <input type={type} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <H>shows</H>
        <Btn onClick={() => setShowForm(!showForm)} variant="ghost">{showForm ? 'cancel' : '+ add show'}</Btn>
      </div>

      {showForm && (
        <div style={{ background: SURFACE, borderRadius: 10, padding: '18px', border: `1px solid ${BORDER}`, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <Input label="venue" field="venue" placeholder="venue name" />
            <Input label="city" field="city" placeholder="city" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <Mono style={{ marginBottom: 4 }}>region</Mono>
            <select value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} style={{ width: '100%', padding: '9px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif" }}>
              {REGIONS.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <Input label="date" field="date" type="date" />
            <Input label="ticket url (optional)" field="ticket_url" placeholder="https://..." />
          </div>
          <Input label="check-in code (leave blank to auto-generate)" field="checkin_code" placeholder="e.g. DUSTIN24" />
          <Btn onClick={add} disabled={!form.venue || !form.city || !form.date || adding}>{adding ? 'adding...' : 'add show'}</Btn>
        </div>
      )}

      {shows.length === 0 ? <Mono style={{ padding: 20, textAlign: 'center' }}>no shows added yet</Mono> : shows.map(show => (
        <div key={show.id} style={{ background: SURFACE, borderRadius: 10, padding: '14px 16px', marginBottom: 8, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Mono size={11} style={{ minWidth: 64 }}>{new Date(show.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</Mono>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{show.city}</div>
            <Mono size={10} color={SLATE + '99'}>{show.venue}{show.region ? ` · ${show.region.replace('_', ' ')}` : ''}</Mono>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {show.checkin_code && <div style={{ background: INK, color: CREAM, borderRadius: 6, padding: '4px 12px', fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: '2px' }}>{show.checkin_code}</div>}
            {show.ticket_url && <a href={show.ticket_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY, textDecoration: 'none' }}>tickets ↗</a>}
            <button onClick={async () => { await supabase.from('shows').delete().eq('id', show.id); setShows(p => p.filter(x => x.id !== show.id)); }} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: RUBY, fontFamily: "'DM Mono', monospace" }}>×</button>
          </div>
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
    await supabase.from('tenant_members').update({ name: m.name, bio: m.bio, accent_color: m.accent_color }).eq('id', m.id);
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
function PointsManager({ supabase, tenantId, currencyName, currencyIcon }) {
  const [actions, setActions] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [newTier, setNewTier] = useState({ name: '', stamps: 0, icon: '✦', reward_type: '', reward_desc: '' });
  const [showNewTier, setShowNewTier] = useState(false);
  const [savingTier, setSavingTier] = useState(false);

  useEffect(() => {
    supabase.from('stamp_actions').select('*').eq('tenant_id', tenantId).order('points').then(({ data }) => setActions(data || []));
    supabase.from('reward_tiers').select('*').eq('tenant_id', tenantId).order('sort_order').then(({ data }) => setTiers(data || []));
  }, []);

  const toggleAction = async (a) => {
    await supabase.from('stamp_actions').update({ is_active: !a.is_active }).eq('id', a.id);
    setActions(prev => prev.map(x => x.id === a.id ? { ...x, is_active: !x.is_active } : x));
  };

  const addTier = async () => {
    if (!newTier.name || !newTier.reward_desc) return;
    setSavingTier(true);
    await supabase.from('reward_tiers').insert({ ...newTier, tenant_id: tenantId, sort_order: tiers.length, is_active: true, key: newTier.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') });
    supabase.from('reward_tiers').select('*').eq('tenant_id', tenantId).order('sort_order').then(({ data }) => setTiers(data || []));
    setNewTier({ name: '', stamps: 0, icon: '✦', reward_type: '', reward_desc: '' });
    setShowNewTier(false); setSavingTier(false);
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
              <Mono size={9} color={SLATE + '88'}>{a.action_type} · {a.trigger_key}</Mono>
            </div>
            <Mono size={12} color={WARM_GOLD} style={{ minWidth: 50, textAlign: 'right' }}>+{a.points} {currencyIcon}</Mono>
            <button onClick={() => toggleAction(a)} style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: a.is_active ? RUBY : BORDER, position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: '#fff', position: 'absolute', top: 2, left: a.is_active ? 20 : 2, transition: 'left 0.2s' }} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Mono style={{ letterSpacing: '1.5px', textTransform: 'uppercase' }}>reward tiers</Mono>
        <Btn onClick={() => setShowNewTier(!showNewTier)} variant="ghost" style={{ fontSize: 11, padding: '5px 12px' }}>{showNewTier ? 'cancel' : '+ add tier'}</Btn>
      </div>

      {showNewTier && (
        <div style={{ background: SURFACE, borderRadius: 10, padding: '16px', border: `1px solid ${BORDER}`, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0 10px' }}>
            {[
              { label: 'tier name', field: 'name', type: 'text', placeholder: 'e.g. Inner Circle' },
              { label: `${currencyName} required`, field: 'stamps', type: 'number', placeholder: '500' },
              { label: 'icon', field: 'icon', type: 'text', placeholder: '✦' },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field} style={{ marginBottom: 10 }}>
                <Mono style={{ marginBottom: 4 }}>{label}</Mono>
                <input type={type} value={newTier[field]} onChange={e => setNewTier(p => ({ ...p, [field]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))} placeholder={placeholder}
                  style={{ width: '100%', padding: '8px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: field === 'icon' ? "'DM Mono', monospace" : "'DM Sans', sans-serif", boxSizing: 'border-box', textAlign: field === 'icon' ? 'center' : 'left' }} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 10 }}>
            <Mono style={{ marginBottom: 4 }}>reward description</Mono>
            <input type="text" value={newTier.reward_desc} onChange={e => setNewTier(p => ({ ...p, reward_desc: e.target.value }))} placeholder="what fans get at this level..."
              style={{ width: '100%', padding: '8px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
          </div>
          <Btn onClick={addTier} disabled={!newTier.name || !newTier.reward_desc || savingTier}>{savingTier ? 'saving...' : 'add tier'}</Btn>
        </div>
      )}

      <div style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}` }}>
        {tiers.length === 0 ? <Mono style={{ padding: 16, textAlign: 'center' }}>no reward tiers yet</Mono> : tiers.map((t, i) => (
          <div key={t.id} style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < tiers.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: INK, color: WARM_GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 15 }}>{t.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{t.name}</div>
              <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>{t.reward_desc}</div>
            </div>
            <Mono size={11} color={WARM_GOLD} style={{ minWidth: 60, textAlign: 'right' }}>{t.stamps} {currencyIcon}</Mono>
            <button onClick={async () => { await supabase.from('reward_tiers').delete().eq('id', t.id); setTiers(p => p.filter(x => x.id !== t.id)); }} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY }}>×</button>
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
function Settings({ supabase, tenantId, currencyName, currencyIcon }) {
  const [cfg, setCfg] = useState({ currency_name: currencyName, currency_icon: currencyIcon });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCfg({ currency_name: currencyName, currency_icon: currencyIcon });
    if (typeof window !== 'undefined') setLink(window.location.origin);
  }, [currencyName, currencyIcon]);

  const save = async () => {
    setSaving(true);
    for (const [key, value] of Object.entries(cfg)) {
      await supabase.from('tenant_config').upsert({ tenant_id: tenantId, key, value }, { onConflict: 'tenant_id,key' });
    }
    setSaved(true); setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <H style={{ marginBottom: 20 }}>settings</H>

      <div style={{ background: SURFACE, borderRadius: 10, padding: '20px', border: `1px solid ${BORDER}`, marginBottom: 14 }}>
        <Mono style={{ marginBottom: 16, letterSpacing: '1.5px', textTransform: 'uppercase' }}>fan currency</Mono>
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 10, marginBottom: 16 }}>
          <div>
            <Mono style={{ marginBottom: 6 }}>currency name</Mono>
            <input type="text" value={cfg.currency_name} onChange={e => setCfg(p => ({ ...p, currency_name: e.target.value }))} placeholder="points, stamps, echoes..."
              style={{ width: '100%', padding: '10px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
          </div>
          <div>
            <Mono style={{ marginBottom: 6 }}>icon</Mono>
            <input type="text" value={cfg.currency_icon} onChange={e => setCfg(p => ({ ...p, currency_icon: e.target.value.slice(0, 2) }))} placeholder="✦"
              style={{ width: '100%', padding: '10px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 20, color: INK, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Btn onClick={save} disabled={saving}>{saving ? 'saving...' : 'save changes'}</Btn>
          {saved && <Mono size={11} color={SAGE}>saved ✓</Mono>}
        </div>
      </div>

      <div style={{ background: SURFACE, borderRadius: 10, padding: '20px', border: `1px solid ${BORDER}` }}>
        <Mono style={{ marginBottom: 12, letterSpacing: '1.5px', textTransform: 'uppercase' }}>your community link</Mono>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" readOnly value={link} style={{ flex: 1, padding: '10px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: SLATE, fontFamily: "'DM Mono', monospace", outline: 'none' }} />
          <Btn onClick={() => { navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }} variant="ghost">{copied ? 'copied ✓' : 'copy'}</Btn>
        </div>
        <Mono size={10} color={SLATE + '77'} style={{ marginTop: 8 }}>share this with fans · they sign up and land straight in your community</Mono>
      </div>
    </div>
  );
}

// ============ MAIN ============
export default function Dashboard() {
  const { user, profile, supabase, tenantId, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [tenant, setTenant] = useState(null);
  const [currencyName, setCurrencyName] = useState('points');
  const [currencyIcon, setCurrencyIcon] = useState('✦');

  useEffect(() => {
    if (!loading && !user) router.push('/');
    if (!loading && profile && profile.role === 'fan') router.push('/');
  }, [user, profile, loading]);

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
          <div style={{ fontSize: 16, fontWeight: 700, color: CREAM, textTransform: 'lowercase' }}>{tenant?.name || 'dashboard'}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: CREAM + '44', letterSpacing: '1.5px', textTransform: 'uppercase' }}>dashboard</div>
        </div>
        <a href="/" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: CREAM + '66', textDecoration: 'none' }}>← back to community</a>
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
