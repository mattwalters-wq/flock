'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

const INK = '#1a1a1a';
const CREAM = '#F5F0E8';
const RUBY = '#8B1A2B';
const WARM_GOLD = '#C9922A';
const SLATE = '#6A5A62';
const SURFACE = '#FAF5F0';
const BORDER = '#E8DDD4';
const SAGE = '#7D8B6A';

const TABS = [
  { id: 'overview', label: 'overview', icon: '◎' },
  { id: 'posts', label: 'posts', icon: '✎' },
  { id: 'shows', label: 'shows', icon: '♫' },
  { id: 'members', label: 'members', icon: '○' },
  { id: 'stamps', label: 'stamps', icon: '✦' },
  { id: 'rewards', label: 'rewards', icon: '♛' },
  { id: 'fans', label: 'fans', icon: '◉' },
];

const Heading = ({ children, size = 24, color = INK, style = {} }) => (
  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: size, color, fontWeight: 700, lineHeight: 1.1, textTransform: 'lowercase', ...style }}>{children}</div>
);

// ============ OVERVIEW ============
function Overview({ supabase, tenantId }) {
  const [stats, setStats] = useState({ members: 0, posts: 0, shows: 0, totalStamps: 0, pendingClaims: 0 });
  const [recentMembers, setRecentMembers] = useState([]);
  const [digestSending, setDigestSending] = useState(false);
  const [digestResult, setDigestResult] = useState(null);
  const [digestIntro, setDigestIntro] = useState('');
  const [showDigest, setShowDigest] = useState(false);

  useEffect(() => {
    async function load() {
      const [members, posts, shows, pendingClaims] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('shows').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('reward_claims').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending'),
      ]);
      const { data: stampData } = await supabase.from('profiles').select('stamp_count').eq('tenant_id', tenantId);
      const totalStamps = (stampData || []).reduce((sum, p) => sum + (p.stamp_count || 0), 0);
      setStats({ members: members.count || 0, posts: posts.count || 0, shows: shows.count || 0, totalStamps, pendingClaims: pendingClaims.count || 0 });
      const { data: recent } = await supabase.from('profiles').select('display_name, stamp_count, joined_at, role').eq('tenant_id', tenantId).order('joined_at', { ascending: false }).limit(5);
      setRecentMembers(recent || []);
    }
    load();
  }, [supabase, tenantId]);

  const statCards = [
    { label: 'members', value: stats.members, color: SAGE },
    { label: 'posts', value: stats.posts, color: RUBY },
    { label: 'shows', value: stats.shows, color: WARM_GOLD },
    { label: 'points awarded', value: stats.totalStamps, color: '#6B5B8D' },
    { label: 'pending rewards', value: stats.pendingClaims, color: stats.pendingClaims > 0 ? RUBY : SLATE },
  ];

  return (
    <div>
      <Heading size={22} style={{ marginBottom: 18 }}>overview</Heading>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: SURFACE, borderRadius: 10, padding: '18px 16px', border: `1px solid ${BORDER}` }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginTop: 4, letterSpacing: '0.5px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>recent members</div>
      <div style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 24 }}>
        {recentMembers.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE }}>no members yet</div>
        ) : recentMembers.map((m, i) => (
          <div key={i} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < recentMembers.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontFamily: "'DM Mono', monospace", color: SLATE }}>{m.display_name?.charAt(0)?.toLowerCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{m.display_name}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE }}>{new Date(m.joined_at || m.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}{m.role !== 'fan' && <span style={{ color: RUBY, marginLeft: 6 }}>{m.role}</span>}</div>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: WARM_GOLD }}>{m.stamp_count} ✦</div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>community email</div>
      {!showDigest ? (
        <button onClick={() => setShowDigest(true)} style={{ width: '100%', padding: '14px 20px', background: INK, color: CREAM, borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          ✉ send community roundup email
        </button>
      ) : (
        <div style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}`, padding: '18px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 10 }}>community roundup</div>
          <div style={{ fontSize: 11, color: SLATE, marginBottom: 12, lineHeight: 1.5 }}>sends a branded email to all fans with notifications on.</div>
          <textarea value={digestIntro} onChange={e => setDigestIntro(e.target.value)} placeholder="custom intro message (optional)..." rows={2}
            style={{ width: '100%', padding: '10px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: INK, outline: 'none', resize: 'vertical', fontFamily: "'DM Sans', sans-serif", marginBottom: 12, boxSizing: 'border-box' }} />
          {digestResult && <div style={{ fontSize: 12, color: digestResult.error ? RUBY : SAGE, marginBottom: 10, fontFamily: "'DM Mono', monospace'" }}>{digestResult.error || `✦ sent to ${digestResult.sent} fans`}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={async () => {
              if (!confirm('send community roundup to all fans?')) return;
              setDigestSending(true); setDigestResult(null);
              try {
                const res = await fetch('/api/digest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customIntro: digestIntro.trim() || null, tenantId }) });
                setDigestResult(await res.json());
              } catch (e) { setDigestResult({ error: e.message }); }
              setDigestSending(false);
            }} disabled={digestSending} style={{ padding: '10px 20px', background: INK, color: CREAM, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: digestSending ? 'default' : 'pointer', opacity: digestSending ? 0.6 : 1 }}>
              {digestSending ? 'sending...' : 'send now'}
            </button>
            <button onClick={() => { setShowDigest(false); setDigestResult(null); }} style={{ padding: '10px 16px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ POSTS MANAGER ============
function PostsManager({ supabase, tenantId, profile }) {
  const [posts, setPosts] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [feedType, setFeedType] = useState('community');
  const [posting, setPosting] = useState(false);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    loadPosts();
    supabase.from('tenant_members').select('*').eq('tenant_id', tenantId).order('display_order').then(({ data }) => setMembers(data || []));
  }, [supabase, tenantId]);

  const loadPosts = async () => {
    const { data } = await supabase.from('posts').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(30);
    setPosts(data || []);
  };

  const handlePost = async () => {
    if (!newContent.trim() || posting) return;
    setPosting(true);
    await supabase.from('posts').insert({ author_id: profile.id, content: newContent.trim(), feed_type: feedType, tenant_id: tenantId });
    setNewContent('');
    await loadPosts();
    setPosting(false);
  };

  const deletePost = async (id) => {
    if (!confirm('delete this post?')) return;
    await supabase.from('posts').delete().eq('id', id);
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const feedOptions = profile?.role === 'admin'
    ? ['community', ...members.map(m => m.slug)]
    : ['community', ...(profile?.band_member ? [profile.band_member] : [])];

  return (
    <div>
      <Heading size={22} style={{ marginBottom: 18 }}>posts</Heading>
      <div style={{ background: SURFACE, borderRadius: 10, padding: '16px', border: `1px solid ${BORDER}`, marginBottom: 20 }}>
        <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="write a post..." rows={3}
          style={{ width: '100%', padding: '10px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', resize: 'vertical', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, boxSizing: 'border-box', marginBottom: 10 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select value={feedType} onChange={e => setFeedType(e.target.value)} style={{ padding: '8px 10px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: INK, fontFamily: "'DM Sans', sans-serif'" }}>
            {feedOptions.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <button onClick={handlePost} disabled={posting || !newContent.trim()} style={{ padding: '9px 20px', background: RUBY, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: posting || !newContent.trim() ? 0.5 : 1 }}>
            {posting ? '...' : 'post'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {posts.map(post => (
          <div key={post.id} style={{ background: SURFACE, borderRadius: 10, padding: '14px 16px', border: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, marginBottom: 6 }}>{post.feed_type} · {new Date(post.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                <div style={{ fontSize: 13, color: INK, lineHeight: 1.5 }}>{post.content}</div>
              </div>
              <button onClick={() => deletePost(post.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: RUBY + '66', fontSize: 16, padding: '2px', flexShrink: 0 }}>×</button>
            </div>
          </div>
        ))}
        {posts.length === 0 && <div style={{ textAlign: 'center', padding: 30, fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE }}>no posts yet</div>}
      </div>
    </div>
  );
}

// ============ SHOWS MANAGER ============
function ShowsManager({ supabase, tenantId }) {
  const [shows, setShows] = useState([]);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: '', venue: '', city: '', country: '', region: 'australia', ticket_url: '', status: 'announced', checkin_code: '' });

  useEffect(() => { loadShows(); }, [supabase, tenantId]);

  const loadShows = async () => {
    const { data } = await supabase.from('shows').select('*').eq('tenant_id', tenantId).order('date');
    setShows(data || []);
  };

  const addShow = async () => {
    if (!form.date || !form.venue || !form.city) { alert('date, venue and city are required'); return; }
    setSaving(true);
    await supabase.from('shows').insert({ ...form, tenant_id: tenantId, ticket_url: form.ticket_url || null, checkin_code: form.checkin_code || null });
    setForm({ date: '', venue: '', city: '', country: '', region: 'australia', ticket_url: '', status: 'announced', checkin_code: '' });
    setAdding(false);
    await loadShows();
    setSaving(false);
  };

  const deleteShow = async (id) => {
    if (!confirm('delete this show?')) return;
    await supabase.from('shows').delete().eq('id', id);
    setShows(prev => prev.filter(s => s.id !== id));
  };

  const F = ({ label, field, type = 'text', options }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>{label}</label>
      {options ? (
        <select value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} style={{ width: '100%', padding: '8px 10px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}>
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <input type={type} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} style={{ width: '100%', padding: '8px 10px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <Heading size={22}>shows</Heading>
        <button onClick={() => setAdding(true)} style={{ padding: '8px 16px', background: RUBY, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ add show</button>
      </div>

      {adding && (
        <div style={{ background: SURFACE, borderRadius: 10, padding: '16px', border: `1px solid ${BORDER}`, marginBottom: 16 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>new show</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <F label="date" field="date" type="date" />
            <F label="status" field="status" options={[{ v: 'announced', l: 'announced' }, { v: 'on_sale', l: 'on sale' }, { v: 'door_sales', l: 'door sales' }, { v: 'sold_out', l: 'sold out' }, { v: 'cancelled', l: 'cancelled' }]} />
          </div>
          <F label="venue" field="venue" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <F label="city" field="city" />
            <F label="country" field="country" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <F label="region" field="region" options={[{ v: 'australia', l: 'australia' }, { v: 'europe', l: 'europe' }, { v: 'uk', l: 'uk' }, { v: 'north_america', l: 'north america' }, { v: 'other', l: 'other' }]} />
            <F label="check-in code" field="checkin_code" />
          </div>
          <F label="ticket url" field="ticket_url" type="url" />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={() => setAdding(false)} style={{ padding: '9px 16px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>cancel</button>
            <button onClick={addShow} disabled={saving} style={{ flex: 1, padding: '9px', background: RUBY, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'adding...' : 'add show'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE }}>no shows yet</div>
        ) : shows.map(show => (
          <div key={show.id} style={{ background: SURFACE, borderRadius: 10, padding: '14px 16px', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY, marginBottom: 3 }}>{new Date(show.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{show.venue}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE }}>{show.city}{show.country ? `, ${show.country}` : ''}{show.checkin_code ? ` · code: ${show.checkin_code}` : ''}</div>
            </div>
            <button onClick={() => deleteShow(show.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: RUBY + '66', fontSize: 18, padding: '2px' }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ MEMBERS MANAGER ============
function MembersManager({ supabase, tenantId }) {
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.from('tenant_members').select('*').eq('tenant_id', tenantId).order('display_order').then(({ data }) => setMembers(data || []));
  }, [supabase, tenantId]);

  const saveMember = async (member) => {
    setSaving(member.id);
    await supabase.from('tenant_members').update({ name: member.name, bio: member.bio, accent_color: member.accent_color }).eq('id', member.id);
    setMessage('saved ✦');
    setTimeout(() => setMessage(''), 2000);
    setSaving(null);
  };

  const update = (id, field, value) => setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));

  return (
    <div>
      <Heading size={22} style={{ marginBottom: 18 }}>members</Heading>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {members.map(m => (
          <div key={m.id} style={{ background: SURFACE, borderRadius: 10, padding: '16px', border: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: m.accent_color || '#888', flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{m.name}</span>
            </div>
            {[
              { label: 'name', field: 'name', type: 'text' },
              { label: 'bio', field: 'bio', type: 'textarea' },
            ].map(({ label, field, type }) => (
              <div key={field} style={{ marginBottom: 10 }}>
                <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 4, letterSpacing: '0.5px' }}>{label}</label>
                {type === 'textarea' ? (
                  <textarea value={m[field] || ''} onChange={e => update(m.id, field, e.target.value)} rows={2}
                    style={{ width: '100%', padding: '8px 10px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, fontFamily: "'DM Sans', sans-serif", resize: 'vertical', boxSizing: 'border-box' }} />
                ) : (
                  <input type="text" value={m[field] || ''} onChange={e => update(m.id, field, e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 4, letterSpacing: '0.5px' }}>accent colour</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="color" value={m.accent_color || '#888888'} onChange={e => update(m.id, 'accent_color', e.target.value)}
                  style={{ width: 40, height: 32, padding: 2, border: `1px solid ${BORDER}`, borderRadius: 6, cursor: 'pointer' }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>{m.accent_color || '#888888'}</span>
              </div>
            </div>
            <button onClick={() => saveMember(m)} disabled={saving === m.id} style={{ padding: '8px 16px', background: RUBY, color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: saving === m.id ? 0.6 : 1, fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {saving === m.id ? 'saving...' : 'save'}
            </button>
          </div>
        ))}
        {members.length === 0 && <div style={{ textAlign: 'center', padding: 30, fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE }}>no members configured</div>}
        {message && <div style={{ textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 12, color: SAGE }}>{message}</div>}
      </div>
    </div>
  );
}

// ============ STAMPS MANAGER ============
function StampsManager({ supabase, tenantId }) {
  const [actions, setActions] = useState([]);
  const [tiers, setTiers] = useState([]);

  useEffect(() => {
    supabase.from('stamp_actions').select('*').eq('tenant_id', tenantId).order('points').then(({ data }) => setActions(data || []));
    supabase.from('reward_tiers').select('*').eq('tenant_id', tenantId).order('sort_order').then(({ data }) => setTiers(data || []));
  }, [supabase, tenantId]);

  const toggleAction = async (action) => {
    await supabase.from('stamp_actions').update({ is_active: !action.is_active }).eq('id', action.id);
    setActions(prev => prev.map(a => a.id === action.id ? { ...a, is_active: !a.is_active } : a));
  };

  return (
    <div>
      <Heading size={22} style={{ marginBottom: 18 }}>stamps</Heading>

      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>point actions</div>
      <div style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 24 }}>
        {actions.map((action, i) => (
          <div key={action.id} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < actions.length - 1 ? `1px solid ${BORDER}` : 'none', opacity: action.is_active ? 1 : 0.5 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: INK }}>{action.name}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE }}>{action.trigger_key}</div>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: WARM_GOLD, minWidth: 40, textAlign: 'right' }}>+{action.points}</div>
            <button onClick={() => toggleAction(action)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: action.is_active ? RUBY : BORDER, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 2, left: action.is_active ? 22 : 2, transition: 'left 0.2s' }} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>reward tiers</div>
      <div style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}` }}>
        {tiers.map((tier, i) => (
          <div key={tier.id} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < tiers.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, width: 32, textAlign: 'center' }}>{tier.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{tier.name}</div>
              <div style={{ fontSize: 11, color: SLATE, marginTop: 2 }}>{tier.reward_desc}</div>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: WARM_GOLD }}>{tier.stamps} ✦</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ REWARDS MANAGER ============
function RewardsManager({ supabase, tenantId }) {
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState('pending');

  useEffect(() => { loadClaims(); }, [supabase, tenantId, filter]);

  const loadClaims = async () => {
    let query = supabase.from('reward_claims').select('*, profiles(display_name, city)').eq('tenant_id', tenantId);
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query.order('created_at', { ascending: false });
    setClaims(data || []);
  };

  const updateStatus = async (id, status) => {
    await supabase.from('reward_claims').update({ status }).eq('id', id);
    await loadClaims();
  };

  const STATUS_COLORS = { pending: WARM_GOLD, approved: SAGE, shipped: '#6B5B8D', completed: SLATE, denied: RUBY };

  return (
    <div>
      <Heading size={22} style={{ marginBottom: 18 }}>rewards</Heading>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['pending', 'approved', 'shipped', 'completed', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${filter === f ? RUBY : BORDER}`, background: filter === f ? RUBY + '11' : 'transparent', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 9, color: filter === f ? RUBY : SLATE }}>
            {f}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {claims.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE }}>no {filter} claims</div>
        ) : claims.map(claim => (
          <div key={claim.id} style={{ background: SURFACE, borderRadius: 10, padding: '14px 16px', border: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{claim.profiles?.display_name}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE }}>{claim.level_key} · {claim.reward_type}</div>
                {claim.shipping_name && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginTop: 4 }}>{claim.shipping_name} · {claim.shipping_address} · {claim.shipping_city} · {claim.shipping_country}</div>}
              </div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: STATUS_COLORS[claim.status] || SLATE, border: `1px solid ${STATUS_COLORS[claim.status] || SLATE}44`, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>{claim.status}</span>
            </div>
            {claim.status === 'pending' && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => updateStatus(claim.id, 'approved')} style={{ padding: '6px 12px', background: SAGE, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>approve</button>
                <button onClick={() => updateStatus(claim.id, 'denied')} style={{ padding: '6px 12px', background: RUBY + '22', color: RUBY, border: `1px solid ${RUBY}44`, borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>deny</button>
              </div>
            )}
            {claim.status === 'approved' && (
              <button onClick={() => updateStatus(claim.id, 'shipped')} style={{ padding: '6px 12px', background: '#6B5B8D', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>mark shipped</button>
            )}
            {claim.status === 'shipped' && (
              <button onClick={() => updateStatus(claim.id, 'completed')} style={{ padding: '6px 12px', background: SAGE, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>mark completed</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ FANS MANAGER ============
function FansManager({ supabase, tenantId }) {
  const [fans, setFans] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFans(); }, [supabase, tenantId]);

  const loadFans = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').eq('tenant_id', tenantId).order('stamp_count', { ascending: false });
    setFans(data || []);
    setLoading(false);
  };

  const filtered = fans.filter(f => !search || f.display_name?.toLowerCase().includes(search.toLowerCase()) || f.city?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <Heading size={22} style={{ marginBottom: 18 }}>fans</Heading>
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="search by name or city..." style={{ width: '100%', padding: '10px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", marginBottom: 14, boxSizing: 'border-box' }} />
      {loading ? (
        <div style={{ textAlign: 'center', padding: 30, fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE }}>loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(fan => (
            <div key={fan.id} style={{ background: SURFACE, borderRadius: 8, padding: '12px 14px', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              {fan.avatar_url ? (
                <img src={fan.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 6, background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: SLATE, fontFamily: "'DM Mono', monospace'" }}>{fan.display_name?.charAt(0)?.toLowerCase()}</div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: INK }}>{fan.display_name}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE }}>{fan.city || 'no city'}{fan.role !== 'fan' ? ` · ${fan.role}` : ''}</div>
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: WARM_GOLD }}>{fan.stamp_count || 0} ✦</div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 30, fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE }}>no fans found</div>}
        </div>
      )}
    </div>
  );
}

// ============ MAIN DASHBOARD ============
export default function Dashboard() {
  const { user, profile, supabase, tenantId, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!loading && (!user || (profile && profile.role !== 'band' && profile.role !== 'admin'))) {
      router.push('/');
    }
  }, [user, profile, loading]);

  if (loading || !profile) {
    return <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 14, color: SLATE }}>loading...</div>;
  }

  if (profile.role !== 'band' && profile.role !== 'admin') {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: CREAM + 'EE', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: RUBY }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>dashboard</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>{profile.display_name}</span>
            <a href="/" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, textDecoration: 'none' }}>← community</a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 16px 40px' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', overflowX: 'auto', gap: 2, borderBottom: `1px solid ${BORDER}`, marginBottom: 24, paddingTop: 16, WebkitOverflowScrolling: 'touch' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '10px 16px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? `2px solid ${RUBY}` : '2px solid transparent',
              cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.5px', color: activeTab === tab.id ? RUBY : SLATE,
              fontWeight: activeTab === tab.id ? 600 : 400, whiteSpace: 'nowrap', marginBottom: -1,
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && <Overview supabase={supabase} tenantId={tenantId} />}
        {activeTab === 'posts' && <PostsManager supabase={supabase} tenantId={tenantId} profile={profile} />}
        {activeTab === 'shows' && <ShowsManager supabase={supabase} tenantId={tenantId} />}
        {activeTab === 'members' && <MembersManager supabase={supabase} tenantId={tenantId} />}
        {activeTab === 'stamps' && <StampsManager supabase={supabase} tenantId={tenantId} />}
        {activeTab === 'rewards' && <RewardsManager supabase={supabase} tenantId={tenantId} />}
        {activeTab === 'fans' && <FansManager supabase={supabase} tenantId={tenantId} />}
      </div>
    </div>
  );
}
