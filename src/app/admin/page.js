'use client';
import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase-browser';

// Super admin is scoped to this user ID only
const SUPER_ADMIN_ID = '5cdcf898-6bda-42b7-860e-0964562c9c22';

const INK = '#1A1018'; const CREAM = '#F5EFE6'; const RUBY = '#8B1A2B';
const WARM_GOLD = '#C9922A'; const SLATE = '#6A5A62'; const SURFACE = '#FAF5F0';
const BORDER = '#E8DDD4'; const SAGE = '#7D8B6A'; const BLUSH = '#D4A5A0';

const H = ({ children, size = 22, style = {} }) => (
  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: size, fontWeight: 700, color: INK, textTransform: 'lowercase', lineHeight: 1.1, ...style }}>{children}</div>
);
const Mono = ({ children, size = 10, color = SLATE, style = {} }) => (
  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: size, color, letterSpacing: '0.5px', ...style }}>{children}</div>
);
const Btn = ({ children, onClick, variant = 'primary', style = {} }) => (
  <button onClick={onClick} style={{ padding: '8px 16px', background: variant === 'primary' ? INK : variant === 'ruby' ? RUBY : variant === 'gold' ? WARM_GOLD : 'transparent', color: variant === 'ghost' ? SLATE : variant === 'gold' ? INK : '#fff', border: variant === 'ghost' ? `1px solid ${BORDER}` : 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", ...style }}>{children}</button>
);

function StatCard({ label, value, color = RUBY }) {
  return (
    <div style={{ background: SURFACE, borderRadius: 10, padding: '18px 16px', border: `1px solid ${BORDER}` }}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 32, fontWeight: 700, color }}>{value}</div>
      <Mono style={{ marginTop: 4 }}>{label}</Mono>
    </div>
  );
}

function TenantRow({ tenant, onSelect, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const isActive = (tenant.last_activity_at && new Date(tenant.last_activity_at) > new Date(Date.now() - 7 * 86400000));

  return (
    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${BORDER}`, background: SURFACE }}>
      {/* Avatar */}
      <div style={{ width: 40, height: 40, borderRadius: 10, background: tenant.primary_color || RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
        {tenant.name?.charAt(0)?.toLowerCase() || '✦'}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{tenant.name}</div>
          {isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: SAGE, flexShrink: 0 }} title="active this week" />}
        </div>
        <Mono size={9} color={SLATE + '88'}>{tenant.slug}.fans-flock.com · {tenant.fan_count || 0} fans · {tenant.post_count || 0} posts</Mono>
      </div>

      {/* Created */}
      <Mono size={9} color={SLATE + '77'} style={{ minWidth: 60, textAlign: 'right' }}>
        {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' }) : ''}
      </Mono>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <Btn onClick={() => onSelect(tenant)} variant="ghost" style={{ fontSize: 11, padding: '6px 12px' }}>view</Btn>
        <a href={`https://${tenant.slug}.fans-flock.com`} target="_blank" rel="noopener noreferrer"
          style={{ padding: '6px 12px', background: 'transparent', color: RUBY, border: `1px solid ${RUBY}44`, borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
          visit ↗
        </a>
        <a href={`https://${tenant.slug}.fans-flock.com/dashboard?superadmin=1`} target="_blank" rel="noopener noreferrer"
          style={{ padding: '6px 12px', background: WARM_GOLD, color: INK, border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
          manage ⚡
        </a>
        <Btn onClick={async () => {
          if (!confirm(`Delete ${tenant.name}? This cannot be undone.`)) return;
          setDeleting(true);
          onDelete(tenant.id);
        }} variant="ghost" style={{ fontSize: 11, padding: '6px 10px', color: RUBY, borderColor: RUBY + '33' }}>
          {deleting ? '...' : '×'}
        </Btn>
      </div>
    </div>
  );
}

function TenantDetail({ tenant, supabase, onBack }) {
  const [fans, setFans] = useState([]);
  const [posts, setPosts] = useState([]);
  const [shows, setShows] = useState([]);
  const [members, setMembers] = useState([]);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingConfig, setEditingConfig] = useState(false);
  const [configEdits, setConfigEdits] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [fansRes, postsRes, showsRes, membersRes, configRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('tenant_id', tenant.id).order('stamp_count', { ascending: false }),
        supabase.from('posts').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('shows').select('*').eq('tenant_id', tenant.id).order('date'),
        supabase.from('tenant_members').select('*').eq('tenant_id', tenant.id).order('display_order'),
        supabase.from('tenant_config').select('key, value').eq('tenant_id', tenant.id),
      ]);
      setFans(fansRes.data || []);
      setPosts(postsRes.data || []);
      setShows(showsRes.data || []);
      setMembers(membersRes.data || []);
      const cfg = {};
      (configRes.data || []).forEach(({ key, value }) => { cfg[key] = value; });
      setConfig(cfg);
      setConfigEdits(cfg);

      // Fetch emails from auth.users for all fans
      const fanIds = new Set((fansRes.data || []).map(f => f.id));
      const emailMap = {};
      let page = 1;
      while (true) {
        const { data: usersPage } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (!usersPage?.users?.length) break;
        usersPage.users.forEach(u => { if (fanIds.has(u.id)) emailMap[u.id] = u.email; });
        if (usersPage.users.length < 1000) break;
        page++;
      }
      setFans(prev => (fansRes.data || []).map(f => ({ ...f, email: emailMap[f.id] || null })));

      setLoading(false);
    })();
  }, [tenant.id]);

  const saveConfig = async () => {
    setSaving(true);
    for (const [key, value] of Object.entries(configEdits)) {
      await supabase.from('tenant_config').upsert({ tenant_id: tenant.id, key, value }, { onConflict: 'tenant_id,key' });
    }
    setConfig(configEdits);
    setEditingConfig(false);
    setSaving(false);
  };

  const deletePost = async (id) => {
    await supabase.from('posts').delete().eq('id', id);
    setPosts(p => p.filter(x => x.id !== id));
  };

  const updateFanRole = async (fan, role) => {
    await supabase.from('profiles').update({ role }).eq('id', fan.id).eq('tenant_id', tenant.id);
    setFans(p => p.map(f => f.id === fan.id ? { ...f, role } : f));
  };

  const awardPoints = async (fan, amount) => {
    const newCount = (fan.stamp_count || 0) + amount;
    await supabase.from('profiles').update({ stamp_count: newCount }).eq('id', fan.id).eq('tenant_id', tenant.id);
    setFans(p => p.map(f => f.id === fan.id ? { ...f, stamp_count: newCount } : f));
  };

  const currencyName = config.currency_name || 'points';
  const currencyIcon = config.currency_icon || '✦';

  const TABS = ['overview', 'fans', 'posts', 'shows', 'config'];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: SLATE, padding: 0, lineHeight: 1 }}>←</button>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: tenant.primary_color || RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 700 }}>{tenant.name?.charAt(0)?.toLowerCase()}</div>
        <div>
          <H size={20}>{tenant.name}</H>
          <Mono size={9} color={SLATE + '88'}>{tenant.slug}.fans-flock.com</Mono>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <a href={`https://${tenant.slug}.fans-flock.com`} target="_blank" rel="noopener noreferrer"
            style={{ padding: '8px 16px', background: RUBY, color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
            visit community ↗
          </a>
          <a href={`https://${tenant.slug}.fans-flock.com/dashboard`} target="_blank" rel="noopener noreferrer"
            style={{ padding: '8px 16px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
            dashboard ↗
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${BORDER}`, marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '10px 18px', background: 'none', border: 'none', borderBottom: activeTab === tab ? `2px solid ${RUBY}` : '2px solid transparent', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.5px', color: activeTab === tab ? RUBY : SLATE, fontWeight: activeTab === tab ? 600 : 400, whiteSpace: 'nowrap' }}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? <Mono style={{ padding: 40, textAlign: 'center' }}>loading...</Mono> : (
        <>
          {/* Overview */}
          {activeTab === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 24 }}>
                <StatCard label="fans" value={fans.length} color={SAGE} />
                <StatCard label="posts" value={posts.length} color={RUBY} />
                <StatCard label="shows" value={shows.length} color={WARM_GOLD} />
                <StatCard label="members" value={members.length} color={BLUSH} />
                <StatCard label={`${currencyIcon} out`} value={fans.reduce((s, f) => s + (f.stamp_count || 0), 0)} color='#6B5B8D' />
              </div>

              <Mono style={{ marginBottom: 10, letterSpacing: '1.5px', textTransform: 'uppercase' }}>top fans</Mono>
              <div style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 20 }}>
                {fans.slice(0, 5).map((f, i) => (
                  <div key={f.id} style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < 4 ? `1px solid ${BORDER}` : 'none' }}>
                    <Mono size={12} color={i === 0 ? WARM_GOLD : SLATE} style={{ width: 18 }}>{i + 1}</Mono>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: INK }}>{f.display_name?.toLowerCase()}</div>
                      <Mono size={9} color={SLATE + '77'}>{f.role}</Mono>
                    </div>
                    <Mono size={11} color={WARM_GOLD}>{f.stamp_count || 0} {currencyIcon}</Mono>
                  </div>
                ))}
              </div>

              <Mono style={{ marginBottom: 10, letterSpacing: '1.5px', textTransform: 'uppercase' }}>band members</Mono>
              <div style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}` }}>
                {members.length === 0 ? <Mono style={{ padding: 16, textAlign: 'center' }}>no members configured</Mono> : members.map((m, i) => (
                  <div key={m.id} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < members.length - 1 ? `1px solid ${BORDER}` : 'none', borderLeft: `3px solid ${m.accent_color || RUBY}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{m.name}</div>
                      {m.bio && <Mono size={10} color={SLATE + '88'}>{m.bio}</Mono>}
                    </div>
                    <Mono size={9} color={SLATE + '66'}>/{m.slug}</Mono>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fans */}
          {activeTab === 'fans' && (
            <div>
              <Mono style={{ marginBottom: 14, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{fans.length} fans</Mono>
              <div style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}` }}>
                {fans.length === 0 ? <Mono style={{ padding: 24, textAlign: 'center' }}>no fans yet</Mono> : fans.map((f, i) => (
                  <div key={f.id} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < fans.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 6, background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>{f.display_name?.charAt(0)?.toLowerCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: INK }}>{f.display_name?.toLowerCase()}</div>
                      <Mono size={9} color={SLATE + '99'} style={{ marginTop: 2 }}>{f.email || '—'}</Mono>
                      <Mono size={9} color={SLATE + '66'} style={{ marginTop: 1 }}>{[f.signup_city, f.signup_country].filter(Boolean).join(', ') || 'location unknown'}{f.created_at ? ` · joined ${new Date(f.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}` : ''}</Mono>
                    </div>
                    <Mono size={11} color={WARM_GOLD} style={{ minWidth: 50, textAlign: 'right', flexShrink: 0 }}>{f.stamp_count || 0} {currencyIcon}</Mono>
                    <select value={f.role} onChange={e => updateFanRole(f, e.target.value)}
                      style={{ padding: '4px 8px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, color: INK, fontFamily: "'DM Mono', monospace", cursor: 'pointer', flexShrink: 0 }}>
                      <option value="fan">fan</option>
                      <option value="band">band</option>
                      <option value="admin">admin</option>
                    </select>
                    <button onClick={() => awardPoints(f, 10)} style={{ padding: '4px 8px', background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 10, color: WARM_GOLD, cursor: 'pointer', fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>+10</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          {activeTab === 'posts' && (
            <div>
              <Mono style={{ marginBottom: 14, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{posts.length} recent posts</Mono>
              {posts.length === 0 ? <Mono style={{ padding: 24, textAlign: 'center' }}>no posts yet</Mono> : posts.map(p => (
                <div key={p.id} style={{ background: SURFACE, borderRadius: 10, padding: '14px 16px', marginBottom: 8, border: `1px solid ${BORDER}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        <div style={{ padding: '2px 8px', background: BORDER, borderRadius: 10, fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE }}>{p.feed_type}</div>
                        {p.is_pinned && <div style={{ padding: '2px 8px', background: WARM_GOLD + '22', borderRadius: 10, fontFamily: "'DM Mono', monospace", fontSize: 9, color: WARM_GOLD }}>pinned</div>}
                        {p.is_highlight && <div style={{ padding: '2px 8px', background: WARM_GOLD + '22', borderRadius: 10, fontFamily: "'DM Mono', monospace", fontSize: 9, color: WARM_GOLD }}>✦ highlight</div>}
                      </div>
                      {p.content && <div style={{ fontSize: 13, color: INK, lineHeight: 1.5, marginBottom: 4 }}>{p.content.slice(0, 120)}{p.content.length > 120 ? '...' : ''}</div>}
                      <Mono size={9} color={SLATE + '66'}>{new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Mono>
                    </div>
                    <button onClick={() => deletePost(p.id)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, color: RUBY, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Shows */}
          {activeTab === 'shows' && (
            <div>
              <Mono style={{ marginBottom: 14, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{shows.length} shows</Mono>
              {shows.length === 0 ? <Mono style={{ padding: 24, textAlign: 'center' }}>no shows</Mono> : shows.map(s => (
                <div key={s.id} style={{ background: SURFACE, borderRadius: 10, padding: '13px 16px', marginBottom: 8, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Mono size={11} style={{ minWidth: 60 }}>{new Date(s.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</Mono>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{s.city}</div>
                    <Mono size={10} color={SLATE + '99'}>{s.venue}</Mono>
                  </div>
                  {s.checkin_code && <div style={{ background: INK, color: CREAM, borderRadius: 6, padding: '3px 10px', fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '2px' }}>{s.checkin_code}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Config */}
          {activeTab === 'config' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Mono style={{ letterSpacing: '1.5px', textTransform: 'uppercase' }}>tenant config</Mono>
                {!editingConfig
                  ? <Btn onClick={() => setEditingConfig(true)} variant="ghost" style={{ fontSize: 11 }}>edit</Btn>
                  : <div style={{ display: 'flex', gap: 8 }}>
                      <Btn onClick={saveConfig} style={{ fontSize: 11 }}>{saving ? 'saving...' : 'save'}</Btn>
                      <Btn onClick={() => { setEditingConfig(false); setConfigEdits(config); }} variant="ghost" style={{ fontSize: 11 }}>cancel</Btn>
                    </div>
                }
              </div>
              <div style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}` }}>
                {Object.entries(configEdits).length === 0 ? <Mono style={{ padding: 24, textAlign: 'center' }}>no config set</Mono> : Object.entries(configEdits).map(([key, value], i, arr) => (
                  <div key={key} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <Mono size={11} style={{ minWidth: 140 }}>{key}</Mono>
                    {editingConfig
                      ? <input type="text" value={value} onChange={e => setConfigEdits(p => ({ ...p, [key]: e.target.value }))} style={{ flex: 1, padding: '6px 10px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, color: INK, outline: 'none', fontFamily: "'DM Mono', monospace" }} />
                      : <Mono size={11} color={INK} style={{ flex: 1 }}>{value}</Mono>
                    }
                  </div>
                ))}
              </div>

              {/* Tenant DB info */}
              <div style={{ marginTop: 20, background: SURFACE, borderRadius: 10, padding: '16px', border: `1px solid ${BORDER}` }}>
                <Mono style={{ marginBottom: 12, letterSpacing: '1.5px', textTransform: 'uppercase' }}>tenant info</Mono>
                {[
                  { label: 'tenant id', value: tenant.id },
                  { label: 'slug', value: tenant.slug },
                  { label: 'created', value: tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('en-AU') : '-' },
                  { label: 'plan', value: tenant.plan || 'free' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                    <Mono size={10} style={{ minWidth: 100 }}>{label}</Mono>
                    <Mono size={10} color={INK}>{String(value)}</Mono>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SuperAdmin() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState({ tenants: 0, fans: 0, posts: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [search, setSearch] = useState('');
  const supabase = getSupabase();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id === SUPER_ADMIN_ID) {
        setUser(session.user);
        loadData();
      }
      setChecking(false);
    });
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: tenantList } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
    if (!tenantList) { setLoading(false); return; }

    // Enrich with counts
    const enriched = await Promise.all(tenantList.map(async t => {
      const [fans, posts] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id),
      ]);
      return { ...t, fan_count: fans.count || 0, post_count: posts.count || 0 };
    }));

    setTenants(enriched);
    setStats({
      tenants: enriched.length,
      fans: enriched.reduce((s, t) => s + (t.fan_count || 0), 0),
      posts: enriched.reduce((s, t) => s + (t.post_count || 0), 0),
    });
    setLoading(false);
  };

  const deleteTenant = async (id) => {
    await supabase.from('tenants').delete().eq('id', id);
    setTenants(p => p.filter(t => t.id !== id));
    if (selectedTenant?.id === id) setSelectedTenant(null);
  };

  const filtered = tenants.filter(t => !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.slug?.toLowerCase().includes(search.toLowerCase()));

  if (checking) return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Mono>checking access...</Mono>
    </div>
  );

  if (!user) return (
    <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
        <H size={24} style={{ marginBottom: 8 }}>access denied</H>
        <Mono style={{ marginBottom: 24 }}>super admin only</Mono>
        <a href="/" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, textDecoration: 'underline' }}>← back home</a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: INK, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {selectedTenant && (
            <button onClick={() => setSelectedTenant(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: CREAM + '66', fontSize: 18, padding: 0, marginRight: 4 }}>←</button>
          )}
          <div style={{ color: CREAM, fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 600 }}>flock</div>
          <div style={{ color: CREAM + '33', fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase' }}>super admin</div>
          {selectedTenant && <>
            <div style={{ color: CREAM + '33' }}>/</div>
            <div style={{ color: CREAM + '99', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{selectedTenant.name?.toLowerCase()}</div>
          </>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Mono size={10} color={CREAM + '55'}>{user.email}</Mono>
          <a href="/" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM + '44', textDecoration: 'none' }}>← exit</a>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 60px' }}>
        {selectedTenant ? (
          <TenantDetail tenant={selectedTenant} supabase={supabase} onBack={() => setSelectedTenant(null)} />
        ) : (
          <>
            <H size={28} style={{ marginBottom: 6 }}>platform overview</H>
            <Mono style={{ marginBottom: 28 }}>monda management · flock super admin</Mono>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
              <StatCard label="communities" value={stats.tenants} color={RUBY} />
              <StatCard label="total fans" value={stats.fans} color={SAGE} />
              <StatCard label="total posts" value={stats.posts} color={WARM_GOLD} />
            </div>

            {/* Communities */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <H size={18}>communities</H>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="search..." style={{ padding: '7px 12px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", width: 180 }} />
            </div>

            <div style={{ background: SURFACE, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>loading communities...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>no communities found</div>
              ) : filtered.map(t => (
                <TenantRow key={t.id} tenant={t} onSelect={setSelectedTenant} onDelete={deleteTenant} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
