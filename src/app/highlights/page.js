'use client';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';

const INK = '#1A1018'; const CREAM = '#F5EFE6'; const RUBY = '#8B1A2B';
const WARM_GOLD = '#C9922A'; const SLATE = '#6A5A62'; const SURFACE = '#FAF5F0';
const BORDER = '#E8DDD4'; const BLUSH = '#D4A5A0';

function timeAgo(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (d < 60) return 'just now'; if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`; return `${Math.floor(d/86400)}d ago`;
}

export default function HighlightsPage() {
  const [posts, setPosts] = useState([]); const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null); const [memberMap, setMemberMap] = useState({});
  const [lightboxUrl, setLightboxUrl] = useState(null);

  useEffect(() => {
    const sb = getSupabase();
    const host = window.location.hostname;
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const slug = host.endsWith(`.${appDomain}`) ? host.replace(`.${appDomain}`, '') : null;

    (async () => {
      let tenantId = null;
      if (slug) {
        const { data: t } = await sb.from('tenants').select('id, name').eq('slug', slug).single();
        if (t) { setTenant(t); tenantId = t.id; }
        const { data: mems } = await sb.from('tenant_members').select('*').eq('tenant_id', tenantId);
        const map = {};
        (mems || []).forEach(m => { map[m.slug] = { name: m.name, accentColor: m.accent_color }; });
        setMemberMap(map);
      }
      const query = tenantId
        ? sb.from('posts').select('*, profiles!posts_author_id_fkey(display_name, role, band_member)').eq('is_highlight', true).eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(30)
        : sb.from('posts').select('*, profiles!posts_author_id_fkey(display_name, role, band_member)').eq('is_highlight', true).order('created_at', { ascending: false }).limit(30);
      const { data } = await query;
      setPosts(data || []); setLoading(false);
    })();
  }, []);

  const tenantName = tenant?.name || 'flock';

  return (
    <div style={{ minHeight: '100vh', background: SURFACE, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: CREAM, borderBottom: `1px solid ${BORDER}`, padding: '18px 20px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>{tenantName}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '88', marginTop: 2, letterSpacing: '1px' }}>highlights</div>
          </div>
          <a href="/" style={{ background: INK, color: CREAM, padding: '8px 16px', borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600, textDecoration: 'none' }}>join the community</a>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 8px' }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, lineHeight: 1.7, margin: 0 }}>moments from inside the community</p>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '12px 20px 40px' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 60, fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>loading...</div> :
         posts.length === 0 ? <div style={{ textAlign: 'center', padding: 60, fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>no highlights yet</div> :
         posts.map(post => {
           const prof = post.profiles || {}; const isBand = prof.role === 'band';
           const memberKey = prof.band_member; const memberInfo = memberKey ? memberMap[memberKey] : null;
           const memberColor = memberInfo?.accentColor;
           return (
             <div key={post.id} style={{ background: CREAM, borderRadius: 10, border: `1px solid ${BORDER}`, padding: 16, marginBottom: 12, borderLeft: isBand && memberColor ? `3px solid ${memberColor}` : '3px solid transparent' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                 <div style={{ width: 34, height: 34, borderRadius: 6, background: isBand && memberColor ? memberColor : INK, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                   {isBand ? (memberInfo?.name?.charAt(0) || '✦') : (prof.display_name?.charAt(0)?.toLowerCase() || '✦')}
                 </div>
                 <div>
                   <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: INK }}>{isBand ? (memberInfo?.name?.toLowerCase() || prof.display_name?.toLowerCase()) : prof.display_name?.toLowerCase()}</div>
                   <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + '88' }}>{timeAgo(post.created_at)}</span>
                 </div>
                 <span style={{ marginLeft: 'auto', fontFamily: "'DM Mono', monospace", fontSize: 8, color: WARM_GOLD, border: `1px solid ${WARM_GOLD}44`, padding: '2px 6px', borderRadius: 2 }}>✦ highlight</span>
               </div>
               {post.content && <p style={{ fontSize: 13.5, lineHeight: 1.65, color: INK + 'CC', margin: '0 0 12px 0', whiteSpace: 'pre-wrap' }}>{post.content}</p>}
               {post.audio_url && <div style={{ marginBottom: 12, background: '#F5EFE6', borderRadius: 8, padding: '12px 14px', border: `1px solid ${BORDER}` }}><audio controls preload="metadata" style={{ width: '100%', height: 36 }}><source src={post.audio_url} /></audio></div>}
               {(post.images?.length > 1) ? (
                 <div style={{ marginBottom: 12, display: 'flex', gap: 4, flexWrap: 'wrap' }}>{post.images.map((url, i) => <img key={i} src={url} alt="" onClick={() => setLightboxUrl(url)} style={{ width: 'calc(50% - 2px)', height: 160, objectFit: 'cover', borderRadius: 6, border: `1px solid ${BORDER}`, cursor: 'pointer' }} />)}</div>
               ) : post.image_url && <img src={post.image_url} alt="" onClick={() => setLightboxUrl(post.image_url)} style={{ width: '100%', borderRadius: 6, border: `1px solid ${BORDER}`, cursor: 'pointer', marginBottom: 12, display: 'block' }} />}
             </div>
           );
         })
        }
      </div>

      <div style={{ background: INK, padding: '32px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: CREAM, marginBottom: 8, textTransform: 'lowercase' }}>want in?</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: CREAM + '88', marginBottom: 20, lineHeight: 1.7 }}>join {tenantName} to post, connect, earn rewards.</div>
        <a href="/" style={{ background: RUBY, color: '#fff', padding: '12px 28px', borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>join the community</a>
      </div>

      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <img src={lightboxUrl} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 6, objectFit: 'contain' }} />
          <button onClick={() => setLightboxUrl(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 22, width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}
    </div>
  );
}
