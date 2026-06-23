'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { authErrorMessage } from '@/lib/supabase-browser';

// Bound an auth call so a stuck token-refresh can't freeze the UI forever.
function withTimeout(promise, ms) {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

// VAPID public key (base64url) → Uint8Array for PushManager.subscribe.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// A reward tier collects a shipping address when the artist flagged it, or for
// the built-in physical reward types.
function levelNeedsShipping(level) {
  return !!level?.collectAddress || ['tshirt', 'vinyl', 'postcard'].includes(level?.reward);
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function getLiveEmbedUrl(url) {
  if (!url) return null;
  try {
    // YouTube: watch?v=ID or youtu.be/ID or live/ID
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
    // Twitch: twitch.tv/channelname
    const twMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
    if (twMatch) return `https://player.twitch.tv/?channel=${twMatch[1]}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'fans-flock.com'}`;
    // Mux: stream.mux.com/PLAYBACKID.m3u8 - return as-is for video tag
    if (url.includes('mux.com') || url.includes('.m3u8')) return url;
    return null;
  } catch { return null; }
}

function timeAgo(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 86400 * 30) return `${Math.floor(d / 86400)}d ago`;
  return `${Math.floor(d / (86400 * 30))}mo ago`;
}

const DEFAULT_LEVELS = [
  { name: 'First Press', key: 'first_press', stamps: 0, icon: '◐', reward: null, rewardDesc: 'welcome to the community' },
  { name: 'B-Side', key: 'b_side', stamps: 50, icon: '◑', reward: 'postcard', rewardDesc: 'handwritten digital postcard from the artist' },
  { name: 'Deep Cut', key: 'deep_cut', stamps: 150, icon: '●', reward: 'tshirt', rewardDesc: 'exclusive community t-shirt' },
  { name: 'Inner Sleeve', key: 'inner_sleeve', stamps: 300, icon: '◉', reward: 'vinyl', rewardDesc: 'signed vinyl or limited edition release' },
  { name: 'Stamped', key: 'stamped', stamps: 500, icon: '✦', reward: 'zoom', rewardDesc: 'monthly group hangout with the artist' },
  { name: 'Inner Circle', key: 'inner_circle', stamps: 1000, icon: '♛', reward: 'meetgreet', rewardDesc: 'meet and greet at a show' },
];

const POST_TAGS = [
  { key: 'general', label: 'general', icon: '✦' },
  { key: 'music', label: 'new music', icon: '♫' },
  { key: 'gig', label: 'gig', icon: '◎' },
  { key: 'selfie', label: 'selfie', icon: '◉' },
  { key: 'question', label: 'question', icon: '?' },
  { key: 'poll', label: 'poll', icon: '◈' },
];

// ─── POLL WIDGET ─────────────────────────────────────────────────────────────

function PollWidget({ postId, options, supabase, currentUserId, tenantId }) {
  const [votes, setVotes] = useState({});
  const [myVote, setMyVote] = useState(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!supabase || !postId) return;
    supabase.from('poll_votes').select('*').eq('post_id', postId).eq('tenant_id', tenantId).then(({ data }) => {
      if (!data) return;
      const map = {};
      data.forEach(v => { map[v.option_index] = (map[v.option_index] || 0) + 1; });
      setVotes(map);
      setTotal(data.length);
      const mine = data.find(v => v.user_id === currentUserId);
      if (mine) setMyVote(mine.option_index);
    });
  }, [postId]);

  const vote = async (i) => {
    if (myVote !== null || !currentUserId) return;
    setMyVote(i);
    setVotes(p => ({ ...p, [i]: (p[i] || 0) + 1 }));
    setTotal(t => t + 1);
    await supabase.from('poll_votes').insert({ post_id: postId, user_id: currentUserId, option_index: i, tenant_id: tenantId });
  };

  const INK = 'var(--ink)'; const RUBY = 'var(--ruby)'; const BORDER = 'var(--border)';
  const CREAM = 'var(--cream)'; const SLATE = 'var(--slate)';

  return (
    <div style={{ marginBottom: 14 }}>
      {options.map((opt, i) => {
        const count = votes[i] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const isMe = myVote === i;
        return (
          <button key={i} onClick={() => vote(i)} disabled={myVote !== null} style={{
            display: 'block', width: '100%', marginBottom: 6, padding: '10px 14px',
            background: myVote !== null ? CREAM : 'transparent',
            border: `1px solid ${isMe ? RUBY + '44' : BORDER}`,
            borderRadius: 8, cursor: myVote === null ? 'pointer' : 'default',
            textAlign: 'left', position: 'relative', overflow: 'hidden',
          }}>
            {myVote !== null && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: isMe ? RUBY + '15' : BORDER + '55', transition: 'width 0.5s ease' }} />}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: INK, fontWeight: isMe ? 600 : 400 }}>{opt}{isMe ? ' ✦' : ''}</span>
              {myVote !== null && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>{pct}%</span>}
            </div>
          </button>
        );
      })}
      {total > 0 && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--slate)' + '77', marginTop: 2 }}>{total} {total === 1 ? 'vote' : 'votes'}</div>}
    </div>
  );
}

// ─── LINK PREVIEW ────────────────────────────────────────────────────────────

function LinkPreviewCard({ url }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!url) return;
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`).then(r => r.json()).then(d => { if (d.title) setData(d); }).catch(() => {});
  }, [url]);
  if (!data) return null;
  const BORDER = 'var(--border)'; const INK = 'var(--ink)'; const RUBY = 'var(--ruby)'; const CREAM = 'var(--cream)';
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginBottom: 14, textDecoration: 'none', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 0 }}>
        {data.image && <img src={data.image} alt="" style={{ width: 72, height: 72, objectFit: 'cover', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />}
        <div style={{ padding: '10px 12px', flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: RUBY, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{data.domain}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: INK, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{data.title}</div>
        </div>
      </div>
    </a>
  );
}

// ─── COMMENTS ────────────────────────────────────────────────────────────────

function CommentsPanel({ postId, supabase, currentUserId, currentProfile, tenantId, onClose, onCommentAdded, onViewProfile }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState(null);

  const INK = 'var(--ink)'; const RUBY = 'var(--ruby)'; const SLATE = 'var(--slate)';
  const SURFACE = 'var(--surface)'; const BORDER = 'var(--border)'; const CREAM = 'var(--cream)';
  const BLUSH = 'var(--blush)';

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('comments').select('*').eq('post_id', postId).eq('tenant_id', tenantId).order('created_at', { ascending: true });
    const list = data || [];
    const ids = [...new Set(list.map(c => c.author_id))];
    let pmap = {};
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, display_name, role, band_member, avatar_url').in('id', ids);
      if (profiles) profiles.forEach(p => { pmap[p.id] = p; });
    }
    // Load comment likes for this post's comments
    let likeCounts = {};
    let myLikes = new Set();
    const commentIds = list.map(c => c.id);
    if (commentIds.length) {
      const { data: likes } = await supabase.from('comment_likes').select('comment_id, user_id').in('comment_id', commentIds);
      if (likes) {
        likes.forEach(l => {
          likeCounts[l.comment_id] = (likeCounts[l.comment_id] || 0) + 1;
          if (l.user_id === currentUserId) myLikes.add(l.comment_id);
        });
      }
    }
    setComments(list.map(c => ({ ...c, profile: pmap[c.author_id] || null, like_count: likeCounts[c.id] || 0, liked_by_me: myLikes.has(c.id) })));
    setLoading(false);
  };

  const toggleCommentLike = async (comment) => {
    if (!currentUserId) return;
    const nowLiked = !comment.liked_by_me;
    // Optimistic update
    setComments(p => p.map(c => c.id === comment.id
      ? { ...c, liked_by_me: nowLiked, like_count: (c.like_count || 0) + (nowLiked ? 1 : -1) }
      : c));
    if (nowLiked) {
      await supabase.from('comment_likes').insert({ comment_id: comment.id, user_id: currentUserId, tenant_id: tenantId });
    } else {
      await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', currentUserId);
    }
  };

  useEffect(() => { load(); }, [postId]);

  const submit = async () => {
    if (!text.trim() || posting || !currentUserId) return;
    setPosting(true);
    const row = { post_id: postId, author_id: currentUserId, content: text.trim(), tenant_id: tenantId };
    if (replyTo) row.parent_id = replyTo.id;
    const { error } = await supabase.from('comments').insert(row);
    if (!error) {
      setText(''); setReplyTo(null);
      await load();
      if (onCommentAdded) onCommentAdded();
      // Stamps awarded server-side via DB trigger
    }
    setPosting(false);
  };

  const del = async (id) => {
    await supabase.from('comments').delete().eq('id', id);
    setComments(p => p.filter(c => c.id !== id && c.parent_id !== id));
  };

  const topLevel = comments.filter(c => !c.parent_id);
  const replies = (id) => comments.filter(c => c.parent_id === id);

  const renderComment = (c, depth = 0) => {
    const p = c.profile || {};
    const isBand = p.role === 'band'; const isAdmin = p.role === 'admin';
    const name = p.display_name?.toLowerCase() || 'fan';
    const canDel = c.author_id === currentUserId || currentProfile?.role === 'admin' || currentProfile?.role === 'band';
    const body = (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span onClick={() => onViewProfile?.(c.author_id)} style={{ fontSize: 12, fontWeight: 600, color: INK, cursor: 'pointer' }}>{name}</span>
          {isBand && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: RUBY, border: `1px solid ${RUBY}44`, padding: '0 5px', borderRadius: 2 }}>band</span>}
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '88', marginLeft: 'auto' }}>{timeAgo(c.created_at)}</span>
          <button onClick={() => toggleCommentLike(c)} title="like"
            style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', color: c.liked_by_me ? RUBY : SLATE + '77', fontSize: 11, fontFamily: "'DM Mono', monospace", padding: 0 }}>
            <span style={{ fontSize: 12 }}>{c.liked_by_me ? '♥' : '♡'}</span>
            {c.like_count > 0 && <span>{c.like_count}</span>}
          </button>
          <button onClick={() => setReplyTo({ id: c.id, name: p.display_name })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: SLATE + '55', fontSize: 10, fontFamily: "'DM Mono', monospace" }}>reply</button>
          {canDel && <button onClick={() => del(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: RUBY + '55', fontSize: 13 }}>×</button>}
        </div>
        <p style={{ fontSize: 12.5, color: INK + 'CC', lineHeight: 1.5, margin: 0 }}>{c.content}</p>
      </>
    );
    return (
      <div key={c.id}>
        <div style={{ paddingLeft: Math.min(depth, 2) * 14, padding: `8px 0 8px ${Math.min(depth, 2) * 14}px`, borderBottom: depth === 0 ? `1px solid ${BORDER}` : 'none' }}>
          {depth > 0 ? <div style={{ borderLeft: `2px solid ${BLUSH}44`, paddingLeft: 10 }}>{body}</div> : body}
        </div>
        {replies(c.id).map(r => renderComment(r, depth + 1))}
      </div>
    );
  };

  return (
    <div style={{ background: SURFACE, borderRadius: '0 0 10px 10px', padding: 16, marginTop: -4, marginBottom: 10, border: `1px solid ${BORDER}`, borderTop: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE }}>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: SLATE }}>×</button>
      </div>
      {loading ? <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>loading...</div> : topLevel.map(c => renderComment(c))}
      {replyTo && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: BLUSH + '22', borderRadius: 6, fontSize: 11, color: SLATE }}>
          <span>replying to <strong style={{ color: INK }}>{replyTo.name?.toLowerCase()}</strong></span>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: SLATE, fontSize: 13, marginLeft: 'auto' }}>×</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
        <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder={replyTo ? `reply to ${replyTo.name?.toLowerCase()}...` : 'add a comment...'}
          style={{ flex: 1, padding: '9px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
        <button onClick={submit} disabled={!text.trim() || posting} style={{ padding: '9px 14px', background: text.trim() ? 'var(--ruby)' : BORDER, color: text.trim() ? CREAM : SLATE + '66', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default' }}>
          {posting ? '...' : 'post'}
        </button>
      </div>
    </div>
  );
}

// ─── POST CARD ───────────────────────────────────────────────────────────────

function PostCard({ post, currentUserId, currentProfile, supabase, tenantId, memberMap, currencyName, currencyIcon, onRefresh, onViewProfile, defaultShowComments = false }) {
  const [liked, setLiked] = useState(post.user_has_liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || '');
  const [savingEdit, setSavingEdit] = useState(false);

  const INK = 'var(--ink)'; const RUBY = 'var(--ruby)'; const SLATE = 'var(--slate)';
  const SURFACE = 'var(--surface)'; const BORDER = 'var(--border)'; const CREAM = 'var(--cream)';
  const WARM_GOLD = 'var(--warm-gold)'; const BLUSH = 'var(--blush)';

  const prof = post.profiles || {};
  const isBand = prof.role === 'band'; const isAdmin = prof.role === 'admin';
  const memberKey = prof.band_member;
  const memberInfo = memberKey ? memberMap[memberKey] : null;
  // For solo artists (admin, no band_member), find first member's avatar
  const artistAvatar = memberInfo?.avatar_url || (isAdmin ? Object.values(memberMap)[0]?.avatar_url : null);
  const memberColor = memberInfo?.accentColor;
  const displayName = prof.display_name || 'fan';
  const canModerate = currentProfile?.role === 'admin' || currentProfile?.role === 'band';
  const canDelete = post.author_id === currentUserId || canModerate;

  const like = async () => {
    if (!currentUserId) return;
    const nl = !liked;
    setLiked(nl); setLikeCount(c => c + (nl ? 1 : -1));
    if (nl) await supabase.from('post_likes').insert({ post_id: post.id, user_id: currentUserId, tenant_id: tenantId });
    else await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', currentUserId);
    // Stamps awarded server-side via DB trigger (rate-limited, self-like protected)
  };

  return (
    <>
      <div style={{
        background: SURFACE, borderRadius: 10, padding: '18px 20px',
        marginBottom: showComments ? 0 : 10,
        border: `1px solid ${post.is_highlight ? WARM_GOLD + '44' : BORDER}`,
        borderLeft: isBand && memberColor ? `3px solid ${memberColor}` : post.is_highlight ? `3px solid ${WARM_GOLD}` : undefined,
      }}>
        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, marginBottom: post.is_pinned || post.is_highlight ? 8 : 0 }}>
          {post.is_pinned && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: WARM_GOLD, border: `1px solid ${WARM_GOLD}44`, padding: '2px 8px', borderRadius: 3 }}>pinned</span>}
          {post.is_highlight && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: WARM_GOLD, border: `1px solid ${WARM_GOLD}44`, padding: '2px 8px', borderRadius: 3 }}>✦ highlight</span>}
          {post.tag && post.tag !== 'general' && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: BLUSH, border: `1px solid ${BLUSH}44`, padding: '2px 6px', borderRadius: 3 }}>{post.tag}</span>}
        </div>

        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {artistAvatar ? (
            <img src={artistAvatar} alt="" onClick={() => setLightboxUrl(artistAvatar)} style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }} />
          ) : prof.avatar_url && !isBand && !isAdmin ? (
            <img src={prof.avatar_url} alt="" onClick={() => onViewProfile?.(post.author_id)} style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }} />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: 6, background: isBand && memberColor ? memberColor : (isBand || isAdmin) ? INK : BLUSH + '33', color: (isBand || isAdmin) ? CREAM : SLATE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isBand ? 14 : 13, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
              {(isBand || isAdmin) ? '✦' : displayName.charAt(0).toLowerCase()}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span onClick={() => onViewProfile?.(post.author_id)} style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: INK, cursor: 'pointer' }}>
                {isBand ? (memberInfo?.name?.toLowerCase() || displayName?.toLowerCase()) : displayName?.toLowerCase()}
              </span>
              {isBand && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: memberColor || RUBY, border: `1px solid ${(memberColor || RUBY)}55`, padding: '1px 6px', borderRadius: 2, letterSpacing: '0.8px' }}>band</span>}
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + '88' }}>{timeAgo(post.created_at)}</span>
          </div>
          {canDelete && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowMenu(!showMenu)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', fontFamily: "'DM Mono', monospace", fontSize: 16, color: SLATE + '55', lineHeight: 1 }}>···</button>
              {showMenu && (
                <div style={{ position: 'absolute', right: 0, top: 28, background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10, minWidth: 140 }}>
                  {canModerate && <>
                    <button onClick={async () => { await supabase.from('posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id); onRefresh?.(); setShowMenu(false); }} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: WARM_GOLD, textAlign: 'left' }}>{post.is_pinned ? 'unpin' : 'pin post'}</button>
                    <button onClick={async () => { await supabase.from('posts').update({ is_highlight: !post.is_highlight }).eq('id', post.id); onRefresh?.(); setShowMenu(false); }} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: WARM_GOLD, textAlign: 'left' }}>{post.is_highlight ? 'remove highlight' : '✦ highlight'}</button>
                  </>}
                  {canDelete && <button onClick={() => { setEditing(true); setEditContent(post.content || ''); setShowMenu(false); }} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: INK, textAlign: 'left' }}>edit post</button>}
                  <button onClick={async () => { await supabase.from('posts').delete().eq('id', post.id); setShowMenu(false); onRefresh?.(); }} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: RUBY, textAlign: 'left' }}>delete</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {editing ? (
          <div style={{ marginBottom: 14 }}>
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13.5, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', resize: 'vertical', minHeight: 80, lineHeight: 1.65 }} />
            {/* Existing media controls */}
            {post.image_url && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '8px 10px', background: SURFACE, borderRadius: 6, border: `1px solid ${BORDER}` }}>
                <img src={post.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, flex: 1 }}>image attached</span>
                <button onClick={async () => { setSavingEdit(true); await supabase.from('posts').update({ image_url: null, images: null }).eq('id', post.id); setSavingEdit(false); onRefresh?.(); }}
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY, background: 'none', border: 'none', cursor: 'pointer' }}>remove</button>
              </div>
            )}
            {post.audio_url && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '8px 10px', background: SURFACE, borderRadius: 6, border: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 16 }}>♫</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, flex: 1 }}>audio attached</span>
                <button onClick={async () => { setSavingEdit(true); await supabase.from('posts').update({ audio_url: null }).eq('id', post.id); setSavingEdit(false); onRefresh?.(); }}
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY, background: 'none', border: 'none', cursor: 'pointer' }}>remove</button>
              </div>
            )}
            {post.video_url && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '8px 10px', background: SURFACE, borderRadius: 6, border: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 16 }}>▶</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, flex: 1 }}>video attached</span>
                <button onClick={async () => { setSavingEdit(true); await supabase.from('posts').update({ video_url: null }).eq('id', post.id); setSavingEdit(false); onRefresh?.(); }}
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY, background: 'none', border: 'none', cursor: 'pointer' }}>remove</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(false)} style={{ padding: '7px 14px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>cancel</button>
              <button onClick={async () => {
                setSavingEdit(true);
                await supabase.from('posts').update({ content: editContent.trim() }).eq('id', post.id);
                setSavingEdit(false); setEditing(false); onRefresh?.();
              }} disabled={savingEdit} style={{ padding: '7px 14px', background: INK, color: CREAM, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: savingEdit ? 0.5 : 1 }}>
                {savingEdit ? 'saving...' : 'save'}
              </button>
            </div>
          </div>
        ) : post.content && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, lineHeight: 1.65, color: INK + 'CC', margin: '0 0 14px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.content}</p>}

        {/* Poll */}
        {post.poll_options?.length > 0 && <PollWidget postId={post.id} options={post.poll_options} supabase={supabase} currentUserId={currentUserId} tenantId={tenantId} />}

        {/* Link preview */}
        {post.link_url && <LinkPreviewCard url={post.link_url} />}

        {/* Live stream embed */}
        {post.live_url && (() => {
          const embedUrl = getLiveEmbedUrl(post.live_url);
          const isMux = post.live_url.includes('mux.com') || post.live_url.includes('.m3u8');
          return (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E05050', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#E05050', fontWeight: 600 }}>live</span>
                <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
              </div>
              {embedUrl && !isMux ? (
                <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
                  <iframe src={embedUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                    allowFullScreen allow="autoplay; fullscreen" />
                </div>
              ) : (
                <a href={post.live_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#E0505015', border: '1px solid #E0505033', borderRadius: 10, textDecoration: 'none' }}>
                  <span style={{ fontSize: 20 }}>▶</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>watch live</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginTop: 2 }}>{post.live_url}</div>
                  </div>
                </a>
              )}
            </div>
          );
        })()}

        {/* Images */}
        {(post.images?.length > 1) ? (
          <div style={{ marginBottom: 14, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {post.images.map((url, i) => <img key={i} src={url} alt="" onClick={() => setLightboxUrl(url)} style={{ width: post.images.length === 2 ? 'calc(50% - 2px)' : 'calc(33.33% - 3px)', height: 160, objectFit: 'cover', borderRadius: 6, border: `1px solid ${BORDER}`, cursor: 'pointer' }} />)}
          </div>
        ) : post.image_url && (
          <img src={post.image_url} alt="" onClick={() => setLightboxUrl(post.image_url)} style={{ width: '100%', borderRadius: 6, border: `1px solid ${BORDER}`, cursor: 'pointer', marginBottom: 14, display: 'block' }} />
        )}

        {/* Audio */}
        {post.audio_url && (
          <div style={{ marginBottom: 14, background: CREAM, borderRadius: 10, padding: '12px 14px', border: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 15, color: RUBY }}>♫</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE }}>audio</span>
            </div>
            <audio controls preload="metadata" style={{ width: '100%', height: 36, borderRadius: 6 }}>
              <source src={post.audio_url} />
            </audio>
          </div>
        )}

        {/* Video */}
        {post.video_url && (
          <div style={{ marginBottom: 14 }}>
            <video controls style={{ width: '100%', borderRadius: 6, border: `1px solid ${BORDER}` }}>
              <source src={post.video_url} />
            </video>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <button onClick={like} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Mono', monospace", fontSize: 12, color: liked ? RUBY : SLATE + '88', padding: 0 }}>
            <span style={{ fontSize: 14 }}>{liked ? '✦' : '✧'}</span><span>{likeCount || ''}</span>
          </button>
          <button onClick={() => setShowComments(!showComments)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Mono', monospace", fontSize: 12, color: showComments ? INK : SLATE + '88', padding: 0 }}>
            ↩ {commentCount || ''}
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <img src={lightboxUrl} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 6, objectFit: 'contain' }} />
          <button onClick={() => setLightboxUrl(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 22, width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}

      {/* Comments */}
      {showComments && (
        <CommentsPanel postId={post.id} supabase={supabase} currentUserId={currentUserId} currentProfile={currentProfile} tenantId={tenantId} onClose={() => setShowComments(false)} onCommentAdded={() => setCommentCount(c => c + 1)} onViewProfile={onViewProfile} />
      )}
    </>
  );
}

// ─── USER PROFILE MODAL ──────────────────────────────────────────────────────

function UserProfileModal({ userId, supabase, tenantId, onClose, levels, currencyName, currencyIcon }) {
  const [prof, setProf] = useState(null);
  const INK = 'var(--ink)'; const RUBY = 'var(--ruby)'; const SLATE = 'var(--slate)';
  const SURFACE = 'var(--surface)'; const BLUSH = 'var(--blush)'; const WARM_GOLD = 'var(--warm-gold)';

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('*').eq('id', userId).eq('tenant_id', tenantId).single().then(({ data }) => setProf(data));
  }, [userId]);

  if (!userId) return null;
  const lvl = prof ? (levels || DEFAULT_LEVELS).filter(l => (prof.stamp_count || 0) >= l.stamps).pop() : null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,16,24,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: SURFACE, borderRadius: 14, padding: '28px 24px', maxWidth: 340, width: '100%', textAlign: 'center', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: SLATE }}>×</button>
        {!prof ? <div style={{ padding: 30, fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>loading...</div> : (
          <>
            {prof.avatar_url ? <img src={prof.avatar_url} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', margin: '0 auto 12px', display: 'block' }} /> : (
              <div style={{ width: 64, height: 64, borderRadius: 12, background: BLUSH + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, margin: '0 auto 12px', color: RUBY }}>{prof.display_name?.charAt(0) || '✦'}</div>
            )}
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>{prof.display_name}</div>
            {prof.bio && <p style={{ fontSize: 12, color: SLATE, marginTop: 8, lineHeight: 1.5, fontStyle: 'italic' }}>{prof.bio}</p>}
            {prof.city && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: BLUSH, marginTop: 4 }}>📍 {prof.city}</div>}
            {lvl && <div style={{ display: 'inline-block', marginTop: 10, background: RUBY + '11', border: `1px solid ${RUBY}22`, borderRadius: 20, padding: '3px 12px' }}><span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: RUBY }}>{lvl.icon} {lvl.name.toLowerCase()}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 16 }}>
              <div><div style={{ fontSize: 22, fontWeight: 700, color: RUBY }}>{prof.stamp_count || 0}</div><div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: SLATE, letterSpacing: 1.5, textTransform: 'uppercase' }}>{currencyName}</div></div>
              <div><div style={{ fontSize: 22, fontWeight: 700, color: WARM_GOLD }}>{prof.show_count || 0}</div><div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: SLATE, letterSpacing: 1.5 }}>shows</div></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── EDIT PROFILE MODAL ──────────────────────────────────────────────────────

function EditProfileModal({ profile, supabase, tenantId, onSave, onClose }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [city, setCity] = useState(profile?.city || '');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(profile?.avatar_url || null);
  const [file, setFile] = useState(null);
  const [emailNotifs, setEmailNotifs] = useState(profile?.email_notifications !== false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null); // { type: 'error' | 'ok', text }

  const INK = 'var(--ink)'; const CREAM = 'var(--cream)'; const RUBY = 'var(--ruby)';
  const SLATE = 'var(--slate)'; const SURFACE = 'var(--surface)'; const BORDER = 'var(--border)';

  // Change password directly from the logged-in session — no email reset link,
  // so it sidesteps the single-use-link / wrong-browser pitfalls of recovery.
  const changePassword = async () => {
    if (newPw.length < 8) { setPwMsg({ type: 'error', text: 'password must be at least 8 characters' }); return; }
    if (newPw !== confirmPw) { setPwMsg({ type: 'error', text: 'passwords do not match' }); return; }
    setPwSaving(true); setPwMsg(null);
    try {
      const { error } = await withTimeout(supabase.auth.updateUser({ password: newPw }), 15000);
      if (error) { setPwMsg({ type: 'error', text: authErrorMessage(error) }); return; }
      setNewPw(''); setConfirmPw('');
      setPwMsg({ type: 'ok', text: 'password updated ✦' });
    } catch (e) {
      setPwMsg({ type: 'error', text: e?.message === 'timeout'
        ? 'this is taking too long — your network may be rate-limited. try mobile data, then retry.'
        : authErrorMessage(e) });
    } finally {
      setPwSaving(false);
    }
  };

  const save = async () => {
    setSaving(true);
    let avatarUrl = profile?.avatar_url || null;
    if (file) {
      const ext = file.name.split('.').pop();
      const path = `avatars/${tenantId}/${profile.id}.${ext}`;
      console.log('[EditProfile] uploading avatar', { path, size: file.size, type: file.type });
      const { data: upData, error: upErr } = await supabase.storage.from('media').upload(path, file, { cacheControl: '3600', upsert: true });
      console.log('[EditProfile] upload result', { upData, upErr });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
        avatarUrl = urlData?.publicUrl ? `${urlData.publicUrl}?v=${Date.now()}` : null;
        console.log('[EditProfile] avatar URL', avatarUrl);
      } else {
        console.error('[EditProfile] upload FAILED', upErr);
        alert('Photo upload failed: ' + upErr.message);
        setSaving(false); return;
      }
    }
    const result = await onSave({ display_name: displayName, bio, city, avatar_url: avatarUrl, email_notifications: emailNotifs });
    console.log('[EditProfile] save result', result);
    setSaving(false); onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,26,26,0.6)', backdropFilter: 'blur(8px)', padding: 20 }} onClick={onClose}>
      <div style={{ background: CREAM, borderRadius: 12, padding: '24px 18px', width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: INK, marginBottom: 20, textTransform: 'lowercase' }}>edit profile</div>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <label style={{ cursor: 'pointer', display: 'inline-block', position: 'relative' }}>
            <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 10 * 1024 * 1024) { alert('image must be under 10MB'); return; } setFile(f); const r = new FileReader(); r.onload = ev => setPreview(ev.target.result); r.readAsDataURL(f); }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }} />
            {preview ? <img src={preview} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', border: `2px solid ${BORDER}` }} /> : <div style={{ width: 72, height: 72, borderRadius: 10, background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: SLATE }}>{displayName?.charAt(0)?.toLowerCase() || '○'}</div>}
            <div style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: '50%', background: INK, color: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✎</div>
          </label>
        </div>
        {[{ label: 'display name', value: displayName, set: setDisplayName }, { label: 'city', value: city, set: setCity }].map(({ label, value, set }) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>{label}</label>
            <input type="text" value={value} onChange={e => set(e.target.value)} style={{ width: '100%', padding: '11px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
          </div>
        ))}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 6 }}>bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={160} rows={3} style={{ width: '100%', padding: '11px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', marginBottom: 20, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <div style={{ fontSize: 13, color: INK, fontWeight: 500 }}>email notifications</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, marginTop: 2 }}>get emailed when the artist posts</div>
          </div>
          <button onClick={() => setEmailNotifs(!emailNotifs)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: emailNotifs ? RUBY : BORDER, position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 2, left: emailNotifs ? 22 : 2, transition: 'left 0.2s' }} />
          </button>
        </div>
        <div style={{ paddingBottom: 18, marginBottom: 20, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 13, color: INK, fontWeight: 500 }}>change password</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, marginTop: 2, marginBottom: 10 }}>set a new password for your account</div>
          <input type="password" value={newPw} onChange={e => { setNewPw(e.target.value); setPwMsg(null); }} placeholder="new password" autoComplete="new-password"
            style={{ width: '100%', padding: '11px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', marginBottom: 8 }} />
          <input type="password" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setPwMsg(null); }} onKeyDown={e => e.key === 'Enter' && changePassword()} placeholder="confirm new password" autoComplete="new-password"
            style={{ width: '100%', padding: '11px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
          {pwMsg && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: pwMsg.type === 'ok' ? '#3B7D4F' : RUBY, marginTop: 8 }}>{pwMsg.text}</div>}
          <button onClick={changePassword} disabled={pwSaving || !newPw || !confirmPw} style={{ marginTop: 10, padding: '9px 16px', background: 'transparent', color: INK, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: (pwSaving || !newPw || !confirmPw) ? 'default' : 'pointer', opacity: (pwSaving || !newPw || !confirmPw) ? 0.5 : 1 }}>
            {pwSaving ? 'updating...' : 'update password'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>cancel</button>
          <button onClick={save} disabled={saving || !displayName.trim()} style={{ padding: '10px 20px', background: INK, color: CREAM, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: saving || !displayName.trim() ? 0.5 : 1 }}>
            {saving ? 'saving...' : 'save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CLAIM REWARD MODAL ──────────────────────────────────────────────────────

function ClaimRewardModal({ level, existingClaim, supabase, userId, tenantId, onClaimed, onClose }) {
  const [name, setName] = useState(existingClaim?.shipping_name || ''); const [address, setAddress] = useState(existingClaim?.shipping_address || '');
  const [city, setCity] = useState(existingClaim?.shipping_city || ''); const [country, setCountry] = useState(existingClaim?.shipping_country || '');
  const [postcode, setPostcode] = useState(existingClaim?.shipping_postcode || ''); const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const needsShipping = levelNeedsShipping(level);
  const INK = 'var(--ink)'; const CREAM = 'var(--cream)'; const BORDER = 'var(--border)';
  const SLATE = 'var(--slate)'; const WARM_GOLD = 'var(--warm-gold)'; const SURFACE = 'var(--surface)';
  const RUBY = 'var(--ruby)';

  const claim = async () => {
    setSubmitting(true); setErr('');
    const ship = needsShipping
      ? { shipping_name: name, shipping_address: address, shipping_city: city, shipping_country: country, shipping_postcode: postcode }
      : {};
    let error;
    if (existingClaim) {
      // Adding an address to an existing claim — only touch the shipping fields
      // so an already-approved/shipped status isn't reset. Select back so we can
      // tell whether the row actually changed (RLS denial = 0 rows, no error).
      const resp = await supabase.from('reward_claims').update(ship).eq('id', existingClaim.id).select();
      error = resp.error;
      if (!error && (!resp.data || resp.data.length === 0)) {
        error = { message: 'could not save your address — please refresh the page and try again' };
      }
    } else {
      ({ error } = await supabase.from('reward_claims').insert({
        user_id: userId, tenant_id: tenantId, level_key: level.key, reward_type: level.reward, status: 'pending', ...ship,
      }));
      // Already claimed (double-tap / race) — treat as success, don't re-offer.
      if (error && (error.code === '23505' || /duplicate|unique/i.test(error.message || ''))) error = null;
    }
    setSubmitting(false);
    if (error) { setErr(error.message || 'could not save — please try again'); return; }
    onClaimed();
  };

  const fieldStyle = { width: '100%', padding: '9px 12px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' };
  const labelStyle = { fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,26,26,0.6)', backdropFilter: 'blur(8px)', padding: 20 }} onClick={onClose}>
      <div style={{ background: CREAM, borderRadius: 12, padding: '24px 18px', width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{level.icon}</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>{existingClaim ? 'add your address' : 'claim your reward'}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: WARM_GOLD, marginTop: 6 }}>{level.name} · {level.stamps} ✦</div>
        </div>
        <div style={{ background: SURFACE, borderRadius: 8, padding: '14px 16px', marginBottom: 20, border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 13, color: INK, lineHeight: 1.5 }}>{level.rewardDesc}</div>
        </div>
        {needsShipping && <>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>full name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="your name" style={fieldStyle} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>address</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="street address" style={fieldStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>city</label>
              <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="city" style={fieldStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>postcode</label>
              <input type="text" value={postcode} onChange={e => setPostcode(e.target.value)} placeholder="postcode" style={fieldStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>country</label>
            <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="country" style={fieldStyle} />
          </div>
        </>}
        {err && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY, marginBottom: 10 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>cancel</button>
          <button onClick={claim} disabled={submitting || (needsShipping && (!name || !address || !city || !country || !postcode))} style={{ padding: '10px 20px', background: WARM_GOLD, color: INK, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}>
            {submitting ? 'saving...' : existingClaim ? 'save address ✦' : 'claim ✦'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MEMBER HEADER ───────────────────────────────────────────────────────────

function MemberHeader({ member, memberMap }) {
  const info = memberMap[member];
  if (!info) return null;
  const INK = 'var(--ink)'; const SLATE = 'var(--slate)'; const CREAM = 'var(--cream)';
  return (
    <div style={{ background: info.accentColor || 'var(--ruby)', borderRadius: 10, padding: '20px 18px', marginBottom: 14, color: CREAM }}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, textTransform: 'lowercase', marginBottom: 6 }}>{info.name?.toLowerCase()}</div>
      {info.bio && <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, opacity: 0.8, lineHeight: 1.6, margin: 0 }}>{info.bio}</p>}
    </div>
  );
}

// ─── MAIN FLOCK APP ──────────────────────────────────────────────────────────

export function FlockApp({ tenantId: propTenantId }) {
  const { user, profile, signOut, supabase, tenantId: authTenantId, refreshProfile, updateProfile } = useAuth();
  const tenantId = propTenantId || authTenantId;

  // Tenant config
  const [tenant, setTenant] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberMap, setMemberMap] = useState({});
  const [currencyName, setCurrencyName] = useState('points');
  const [currencyIcon, setCurrencyIcon] = useState('✦');
  const [rewardsLabel, setRewardsLabel] = useState('rewards');
  const [logoUrl, setLogoUrl] = useState(null);
  const [STAMP_LEVELS, setStampLevels] = useState(DEFAULT_LEVELS);

  // UI state
  const [mainTab, setMainTab] = useState('feed');
  const [feedView, setFeedView] = useState('community');
  const [feedTagFilter, setFeedTagFilter] = useState(null);
  const [feedArtistOnly, setFeedArtistOnly] = useState(false); // "everyone" feed: show only the artist's posts
  const [artistIds, setArtistIds] = useState([]); // profile ids of admin/band (the artist) in this tenant

  // Data
  const [posts, setPosts] = useState([]);
  const [shows, setShows] = useState({});
  const [bandsintownEvents, setBandsintownEvents] = useState([]);
  const [stampActions, setStampActions] = useState([]);
  const [topCollectors, setTopCollectors] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [rewardClaims, setRewardClaims] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [myAttendance, setMyAttendance] = useState(new Set());

  // Post composer
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [postImages, setPostImages] = useState([]);
  const [postImagePreviews, setPostImagePreviews] = useState([]);
  const [postAudio, setPostAudio] = useState(null);
  const [postAudioName, setPostAudioName] = useState(null);
  const [postVideo, setPostVideo] = useState(null);
  const [postVideoPreview, setPostVideoPreview] = useState(null);
  const [postTag, setPostTag] = useState('general');
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [postLink, setPostLink] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [liveUrl, setLiveUrl] = useState('');
  const [showLiveInput, setShowLiveInput] = useState(false);
  const [linkPreviewData, setLinkPreviewData] = useState(null);
  const [linkFetching, setLinkFetching] = useState(false);

  // UI toggles
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const POSTS_PAGE_SIZE = 40;
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [claimingLevel, setClaimingLevel] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [focusPostId, setFocusPostId] = useState(null); // post opened from a notification / ?post= link
  const [focusPost, setFocusPost] = useState(null);
  const [pushState, setPushState] = useState('unknown'); // unknown | unsupported | off | on | busy
  const [checkinShow, setCheckinShow] = useState(null);
  const [checkinCode, setCheckinCode] = useState('');
  const [checkinStatus, setCheckinStatus] = useState('');
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [expandedRegion, setExpandedRegion] = useState(null);

  const INK = 'var(--ink)'; const CREAM = 'var(--cream)'; const RUBY = 'var(--ruby)';
  const BLUSH = 'var(--blush)'; const WARM_GOLD = 'var(--warm-gold)'; const SLATE = 'var(--slate)';
  const SURFACE = 'var(--surface)'; const BORDER = 'var(--border)'; const SAGE = '#7D8B6A';

  // ── Load tenant config ────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase || !tenantId) return;
    (async () => {
      const { data: t } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
      if (t) setTenant(t);

      const [cfgRes, memRes, tiersRes] = await Promise.all([
        supabase.from('tenant_config').select('key, value').eq('tenant_id', tenantId),
        supabase.from('tenant_members').select('*').eq('tenant_id', tenantId).order('display_order'),
        supabase.from('reward_tiers').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('sort_order'),
      ]);

      const cfg = {};
      (cfgRes.data || []).forEach(({ key, value }) => { cfg[key] = value; });
      if (cfg.currency_name) setCurrencyName(cfg.currency_name);
      if (cfg.rewards_label) setRewardsLabel(cfg.rewards_label);
      if (cfg.currency_icon) setCurrencyIcon(cfg.currency_icon);
      if (cfg.logo_url) setLogoUrl(cfg.logo_url);
      // Apply colours + font client-side
      if (typeof document !== 'undefined') {
        if (cfg.color_ruby) document.documentElement.style.setProperty('--ruby', cfg.color_ruby);
        if (cfg.color_cream) document.documentElement.style.setProperty('--cream', cfg.color_cream);
        if (cfg.color_ink) document.documentElement.style.setProperty('--ink', cfg.color_ink);
        // Derive supporting colours from tenant palette
        if (cfg.color_ink) {
          // --slate: ink at 60% opacity blended - use ink with transparency
          document.documentElement.style.setProperty('--slate', cfg.color_ink + '99');
          // --border: ink at 15% opacity for subtle borders
          document.documentElement.style.setProperty('--border', cfg.color_ink + '26');
        }
        if (cfg.color_cream) {
          // --surface: slightly darker than cream for card backgrounds
         
        }
        const fontMap = { dm_sans: "'DM Sans', sans-serif", playfair: "'Playfair Display', serif", space_grotesk: "'Space Grotesk', sans-serif", libre_baskerville: "'Libre Baskerville', serif", syne: "'Syne', sans-serif" };
        const font = fontMap[cfg.font_key];
        if (font) document.documentElement.style.setProperty('--font-heading', font);
      }
      if (cfg.currency_icon) setCurrencyIcon(cfg.currency_icon);

      const mems = memRes.data || [];
      const map = {};
      mems.forEach(m => { map[m.slug] = { name: m.name, slug: m.slug, accentColor: m.accent_color || 'var(--ruby)', bio: m.bio || '', avatar_url: m.avatar_url || null }; });
      setMembers(mems);
      setMemberMap(map);

      if (tiersRes.data?.length) {
        // DB tiers are fully authoritative. If an artist has set up any tiers,
        // we show exactly those active ones - no default backfill. This lets an
        // artist deliberately remove tiers (e.g. hide higher reward tiers they
        // can't fulfil) without defaults reappearing. The DEFAULT_LEVELS are only
        // used when a tenant has zero tiers configured (handled by initial state).
        const dbTiers = tiersRes.data.map(t => ({ name: t.name, key: t.key, stamps: t.stamps, icon: t.icon, reward: t.reward_type, rewardDesc: t.reward_desc, collectAddress: t.collect_address }));
        dbTiers.sort((a, b) => a.stamps - b.stamps);
        // Always keep a welcome/first tier at 0 so new fans see a starting point
        if (!dbTiers.some(t => t.stamps === 0)) {
          const welcome = DEFAULT_LEVELS.find(d => d.stamps === 0);
          if (welcome) dbTiers.unshift(welcome);
        }
        setStampLevels(dbTiers);
      }
    })();

    // Welcome banner
    if (typeof window !== 'undefined' && !localStorage.getItem(`flock_welcomed_${tenantId}`)) {
      setShowWelcome(true);
    }

    // Geo capture
    if (user && profile && !profile.signup_ip) {
      fetch('/api/geo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: navigator.language }) }).catch(() => {});
    }
  }, [supabase, tenantId]);

  // ── Fetch posts ───────────────────────────────────────────────────────────
  const fetchPosts = useCallback(async (feed = feedView, append = false) => {
    if (!supabase || !tenantId) return;
    if (append) setLoadingMorePosts(true);
    else { setLoadingPosts(true); setHasMorePosts(true); }
    try {
      // For append mode, fetch posts older than the oldest currently shown
      let query = supabase.from('posts').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(POSTS_PAGE_SIZE);
      if (feed === 'community') query = query.eq('feed_type', 'community');
      else if (feed === 'highlights') query = query.eq('is_highlight', true);
      else query = query.eq('feed_type', feed);

      // "everyone" feed: optionally narrow to just the artist's posts (server-side
      // so it surfaces every one of them, not only those on the first page).
      if (feed === 'community' && feedArtistOnly && artistIds.length) {
        query = query.in('author_id', artistIds);
      }

      if (append && posts.length > 0) {
        const oldestPost = posts.filter(p => !p.is_pinned).slice(-1)[0];
        if (oldestPost) query = query.lt('created_at', oldestPost.created_at);
      }

      const { data } = await query;
      if (!data) {
        if (append) setLoadingMorePosts(false);
        else { setPosts([]); setLoadingPosts(false); }
        return;
      }

      // If we got fewer than the page size, we've hit the end
      if (data.length < POSTS_PAGE_SIZE) setHasMorePosts(false);

      const ids = [...new Set(data.map(p => p.author_id))];
      let pmap = {};
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, display_name, role, band_member, avatar_url').in('id', ids);
        if (profs) profs.forEach(p => { pmap[p.id] = p; });
      }

      let likedIds = new Set();
      if (user) {
        const { data: likes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id).eq('tenant_id', tenantId);
        if (likes) likedIds = new Set(likes.map(l => l.post_id));
      }

      const mapped = data.map(p => ({ ...p, profiles: pmap[p.author_id] || null, user_has_liked: likedIds.has(p.id) }));

      if (append) {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newOnes = mapped.filter(p => !existingIds.has(p.id));
          const combined = [...prev, ...newOnes];
          combined.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
          return combined;
        });
      } else {
        mapped.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
        setPosts(mapped);
      }
    } catch (e) {
      console.error('fetchPosts error:', e);
      if (!append) setPosts([]);
    }
    if (append) setLoadingMorePosts(false);
    else setLoadingPosts(false);
  }, [feedView, user, supabase, tenantId, posts, feedArtistOnly, artistIds]);

  const loadMorePosts = useCallback(() => {
    fetchPosts(feedView, true);
  }, [fetchPosts, feedView]);

  const fetchShows = useCallback(async () => {
    if (!supabase || !tenantId) return;
    const { data } = await supabase.from('shows').select('*').eq('tenant_id', tenantId).order('date');
    
    // Also fetch Bandsintown events if configured
    let bitEvents = [];
    try {
      const bitRes = await fetch(`/api/bandsintown?tenantId=${tenantId}`);
      const bitData = await bitRes.json();
      if (bitData.events?.length) {
        bitEvents = bitData.events.map(e => ({
          id: `bit-${e.id}`,
          venue: e.venue,
          city: `${e.city}${e.region ? `, ${e.region}` : ''}`,
          country: e.country,
          date: e.date?.split('T')[0],
          time: e.date ? new Date(e.date).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }) : null,
          ticket_url: e.ticket_url,
          ticket_status: e.ticket_status,
          region: ['australia', 'new zealand'].includes(e.country?.toLowerCase()) ? 'australia' :
                  ['united kingdom', 'uk', 'ireland'].includes(e.country?.toLowerCase()) ? 'uk' :
                  ['united states', 'canada', 'usa', 'us'].includes(e.country?.toLowerCase()) ? 'north_america' :
                  ['germany', 'france', 'netherlands', 'belgium', 'austria', 'switzerland', 'italy', 'spain', 'portugal', 'sweden', 'norway', 'denmark', 'finland', 'czech republic', 'poland', 'hungary', 'slovenia', 'croatia'].includes(e.country?.toLowerCase()) ? 'europe' : 'other',
          source: 'bandsintown',
        }));
        setBandsintownEvents(bitEvents);
      }
    } catch (e) {}

    // Merge manual shows + bandsintown events
    const allShows = [...(data || []), ...bitEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
    const grouped = {};
    allShows.forEach(s => { const r = s.region || 'other'; if (!grouped[r]) grouped[r] = []; grouped[r].push(s); });
    setShows(grouped);

    if (user) {
      const { data: att } = await supabase.from('show_attendance').select('show_id').eq('user_id', user.id).eq('tenant_id', tenantId);
      if (att) setMyAttendance(new Set(att.map(a => a.show_id)));
    }
  }, [supabase, user, tenantId]);

  const fetchStampData = useCallback(async () => {
    if (!supabase || !tenantId) return;
    const { data: actions } = await supabase.from('stamp_actions').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('points');
    if (actions) setStampActions(actions);
    // Enriched select; fall back to the basic columns if member_number isn't
    // migrated yet, so the leaderboard never regresses before the SQL is applied.
    let { data: top } = await supabase.from('profiles').select('display_name, stamp_count, member_number').eq('tenant_id', tenantId).order('stamp_count', { ascending: false }).limit(10);
    if (!top) ({ data: top } = await supabase.from('profiles').select('display_name, stamp_count').eq('tenant_id', tenantId).order('stamp_count', { ascending: false }).limit(10));
    if (top) setTopCollectors(top);
    if (user) {
      const { data: claims } = await supabase.from('reward_claims').select('*').eq('user_id', user.id).eq('tenant_id', tenantId);
      if (claims) setRewardClaims(claims);
      // My leaderboard rank = fans ahead of me + 1 (shown when I'm outside the top 10).
      const { count: ahead } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gt('stamp_count', profile?.stamp_count || 0);
      setMyRank((ahead || 0) + 1);
    }
  }, [supabase, user, tenantId]);

  const fetchNotifications = useCallback(async () => {
    if (!user || !supabase || !tenantId) return;
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(30);
    if (data) { setNotifications(data); setUnreadCount(data.filter(n => !n.is_read).length); }
  }, [user, supabase, tenantId]);

  useEffect(() => { if (supabase && tenantId) fetchPosts(); }, [feedView, supabase, tenantId, feedArtistOnly]);

  // Load the artist's author ids (admin/band) so the "just the artist" feed filter
  // can query by them.
  useEffect(() => {
    if (!supabase || !tenantId) return;
    supabase.from('profiles').select('id').eq('tenant_id', tenantId).in('role', ['admin', 'band'])
      .then(({ data }) => { if (data) setArtistIds(data.map(p => p.id)); });
  }, [supabase, tenantId]);
  useEffect(() => {
    if (mainTab === 'shows') fetchShows();
    if (mainTab === 'points') fetchStampData();
    if (mainTab === 'you') refreshProfile();
    fetchNotifications();
  }, [mainTab]);

  // Daily check-in: advances the streak and awards the daily_login stamps, once
  // per UTC day. Idempotent server-side; best-effort here so a missing function
  // (pre-migration) or any error never blocks the app.
  useEffect(() => {
    if (!supabase || !tenantId || !user) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `flock_checkin_${tenantId}_${user.id}`;
    try { if (localStorage.getItem(key) === today) return; } catch {}
    supabase.rpc('daily_checkin', { p_tenant_id: tenantId })
      .then(({ error }) => { if (!error) { try { localStorage.setItem(key, today); } catch {} refreshProfile(); } })
      .catch(() => {});
  }, [supabase, tenantId, user]);

  // Open a single post (with its comments) from a notification or a ?post= deep
  // link — so "someone replied to your comment" actually takes you to the post.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pid = new URLSearchParams(window.location.search).get('post');
    if (pid) setFocusPostId(pid);
  }, []);

  useEffect(() => {
    if (!focusPostId || !supabase || !tenantId) { setFocusPost(null); return; }
    let cancelled = false;
    (async () => {
      const { data: p } = await supabase.from('posts').select('*').eq('id', focusPostId).eq('tenant_id', tenantId).maybeSingle();
      if (cancelled) return;
      if (!p) { setFocusPost(null); return; }
      const { data: prof } = await supabase.from('profiles').select('id, display_name, role, band_member, avatar_url').eq('id', p.author_id).maybeSingle();
      let liked = false;
      if (user) {
        const { data: lk } = await supabase.from('post_likes').select('post_id').eq('post_id', p.id).eq('user_id', user.id).maybeSingle();
        liked = !!lk;
      }
      if (!cancelled) setFocusPost({ ...p, profiles: prof || null, user_has_liked: liked });
    })();
    return () => { cancelled = true; };
  }, [focusPostId, supabase, tenantId, user]);

  // Detect current push state on mount (supported? already subscribed?).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) {
        if (!cancelled) setPushState('unsupported');
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setPushState(sub && Notification.permission === 'granted' ? 'on' : 'off');
      } catch {
        if (!cancelled) setPushState('off');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const enablePush = async () => {
    if (!user || !tenantId || pushState === 'busy') return;
    setPushState('busy');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setPushState('off'); return; }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const j = sub.toJSON();
      await supabase.from('push_subscriptions').upsert(
        { endpoint: j.endpoint, user_id: user.id, tenant_id: tenantId, p256dh: j.keys.p256dh, auth: j.keys.auth },
        { onConflict: 'endpoint' },
      );
      setPushState('on');
    } catch (e) {
      console.error('[push] enable failed:', e?.message);
      setPushState('off');
    }
  };

  // Poll notifications every 60s so the bell updates without changing tabs.
  // This is a plain table read (notifications table), NOT an auth call, so it
  // does not touch auth rate limits.
  useEffect(() => {
    if (!supabase || !tenantId || !user) return;
    const id = setInterval(() => { fetchNotifications(); }, 60000);
    return () => clearInterval(id);
  }, [supabase, tenantId, user, fetchNotifications]);

  // ── Post submission ───────────────────────────────────────────────────────
  const handlePost = async () => {
    if ((!newPost.trim() && postImages.length === 0 && !postAudio && !postVideo && !liveUrl.trim() && !(showPollCreator && pollOptions.filter(o => o.trim()).length >= 2)) || posting) return;
    setPosting(true);

    const canMember = profile?.role === 'band' && profile?.band_member === feedView;
    const canAdmin = profile?.role === 'admin';
    const feedType = (feedView === 'community' || feedView === 'highlights' || canMember || canAdmin) ? (feedView === 'highlights' ? 'community' : feedView) : 'community';

    let imageUrl = null; let imageUrls = []; let audioUrl = null; let videoUrl = null;
    for (const img of postImages) {
      const ext = img.name.split('.').pop();
      const fn = `posts/${tenantId}/${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { data: ud, error: ue } = await supabase.storage.from('media').upload(fn, img, { cacheControl: '3600', upsert: false });
      if (!ue && ud) { const { data: u } = supabase.storage.from('media').getPublicUrl(fn); if (u?.publicUrl) imageUrls.push(u.publicUrl); }
    }
    if (imageUrls.length) imageUrl = imageUrls[0];
    if (postAudio) {
      const ext = postAudio.name.split('.').pop();
      const fn = `audio/${tenantId}/${user.id}-${Date.now()}.${ext}`;
      const { data: ud, error: ue } = await supabase.storage.from('media').upload(fn, postAudio, { cacheControl: '3600', upsert: false });
      if (!ue && ud) { const { data: u } = supabase.storage.from('media').getPublicUrl(fn); audioUrl = u?.publicUrl; }
    }
    if (postVideo) {
      const ext = postVideo.name.split('.').pop();
      const fn = `video/${tenantId}/${user.id}-${Date.now()}.${ext}`;
      const { data: ud, error: ue } = await supabase.storage.from('media').upload(fn, postVideo, { cacheControl: '3600', upsert: false });
      if (!ue && ud) { const { data: u } = supabase.storage.from('media').getPublicUrl(fn); videoUrl = u?.publicUrl; }
    }

    const row = { author_id: user.id, content: newPost.trim() || '', feed_type: feedType, image_url: imageUrl, tenant_id: tenantId };
    if (imageUrls.length > 1) row.images = imageUrls;
    if (audioUrl) row.audio_url = audioUrl;
    if (videoUrl) row.video_url = videoUrl;
    if (postLink.trim()) row.link_url = postLink.trim();
    if (postTag && postTag !== 'general') row.tag = postTag;
    if (showPollCreator && pollOptions.filter(o => o.trim()).length >= 2) row.poll_options = pollOptions.filter(o => o.trim());
    if (liveUrl.trim()) row.live_url = liveUrl.trim();

    const { data: inserted, error } = await supabase.from('posts').insert(row).select('id').single();
    if (!error) {
      setNewPost(''); setPostImages([]); setPostImagePreviews([]); setPostAudio(null); setPostAudioName(null);
      setPostVideo(null); setPostVideoPreview(null);
      setPostTag('general'); setShowPollCreator(false); setPollOptions(['', '']); setPostLink(''); setShowLinkInput(false); setLinkPreviewData(null);
      setLiveUrl(''); setShowLiveInput(false);
      // Post stamps awarded server-side via DB trigger
      await fetchPosts();
      if (profile?.role === 'band' || profile?.role === 'admin') {
        // Only notify fans if artist hasn't disabled it
        if (cfg.notify_fans_on_post !== 'false') {
          fetch('/api/email/band-post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId, authorName: profile.display_name, content: newPost.trim(), feedType, postId: inserted?.id }) }).catch(() => {});
        }
      }
    }
    setPosting(false);
  };

  const handleCheckin = async () => {
    if (!checkinCode.trim() || !checkinShow || checkinLoading) return;
    setCheckinLoading(true); setCheckinStatus('');
    const { data, error } = await supabase.rpc('checkin_show', { p_show_id: checkinShow.id, p_code: checkinCode.trim(), p_tenant_id: tenantId });
    if (error) setCheckinStatus(error.message);
    else if (data === 'success') { setCheckinStatus('success'); setMyAttendance(prev => new Set([...prev, checkinShow.id])); refreshProfile(); }
    else setCheckinStatus(data);
    setCheckinLoading(false);
  };

  const userStamps = profile?.stamp_count || 0;
  const currentLevel = STAMP_LEVELS.slice().reverse().find(l => userStamps >= l.stamps) || STAMP_LEVELS[0];
  const nextLevel = STAMP_LEVELS.find(l => l.stamps > userStamps);
  const tenantName = tenant?.name || 'flock';
  const REGION_ORDER = ['australia', 'europe', 'uk', 'north_america', 'other'];

  const feedTabs = [
    { id: 'community', label: 'everyone', icon: '✦', color: RUBY },
    ...members.map(m => ({ id: m.slug, label: m.name?.toLowerCase(), icon: m.name?.charAt(0)?.toLowerCase(), color: m.accent_color, avatar_url: m.avatar_url })),
    { id: 'highlights', label: 'highlights', icon: '◉', color: RUBY },
  ];

  const isArtist = profile?.role === 'admin' || profile?.role === 'band';

  const mainTabs = [
    { id: 'feed', label: 'feed', icon: '◎' },
    { id: 'shows', label: 'shows', icon: '♫' },
    { id: 'points', label: currencyName, icon: currencyIcon },
    { id: 'you', label: 'you', icon: '○' },
    ...(isArtist ? [{ id: 'dashboard', label: 'dashboard', icon: '⚙', href: '/dashboard' }] : []),
  ];

  const visiblePosts = feedTagFilter ? posts.filter(p => p.tag === feedTagFilter) : posts;

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'DM Sans', sans-serif", color: INK }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* ── MODALS ── */}
      {showEditProfile && <EditProfileModal profile={profile} supabase={supabase} tenantId={tenantId} onSave={updateProfile} onClose={() => setShowEditProfile(false)} />}

      {/* Post opened from a notification ("replied to your comment") or ?post= link */}
      {focusPostId && (
        <div onClick={() => { setFocusPostId(null); setFocusPost(null); }} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(26,16,24,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button onClick={() => { setFocusPostId(null); setFocusPost(null); }} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>close ×</button>
            </div>
            {focusPost ? (
              <PostCard post={focusPost} currentUserId={user?.id} currentProfile={profile} supabase={supabase} tenantId={tenantId} memberMap={memberMap} currencyName={currencyName} currencyIcon={currencyIcon} onRefresh={() => fetchPosts(feedView)} onViewProfile={setViewingProfile} defaultShowComments />
            ) : (
              <div style={{ background: SURFACE, borderRadius: 10, padding: 30, textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>loading post…</div>
            )}
          </div>
        </div>
      )}
      {claimingLevel && <ClaimRewardModal level={claimingLevel} existingClaim={rewardClaims.find(c => c.level_key === claimingLevel.key) || null} supabase={supabase} userId={user?.id} tenantId={tenantId} onClaimed={() => { setClaimingLevel(null); fetchStampData(); }} onClose={() => setClaimingLevel(null)} />}
      {viewingProfile && <UserProfileModal userId={viewingProfile} supabase={supabase} tenantId={tenantId} onClose={() => setViewingProfile(null)} levels={STAMP_LEVELS} currencyName={currencyName} currencyIcon={currencyIcon} />}

      {/* ── CHECK-IN MODAL ── */}
      {checkinShow && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,26,26,0.6)', backdropFilter: 'blur(8px)', padding: 20 }} onClick={() => setCheckinShow(null)}>
          <div style={{ background: CREAM, borderRadius: 12, padding: '24px 18px', width: '100%', maxWidth: 340, textAlign: 'center', animation: 'fadeIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{currencyIcon}</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: INK, marginBottom: 4, textTransform: 'lowercase' }}>check in</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, marginBottom: 20 }}>{checkinShow.venue}, {checkinShow.city}</div>
            {checkinStatus === 'success' ? (
              <div style={{ padding: '16px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{currencyIcon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 4 }}>you're in!</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>+50 {currencyName} earned</div>
                <button onClick={() => setCheckinShow(null)} style={{ marginTop: 16, padding: '10px 24px', background: INK, color: CREAM, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>nice {currencyIcon}</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: SLATE, marginBottom: 16, lineHeight: 1.5 }}>enter the code shown at the venue</div>
                <input type="text" value={checkinCode} onChange={e => setCheckinCode(e.target.value.toUpperCase().slice(0, 6))} onKeyDown={e => e.key === 'Enter' && handleCheckin()} placeholder="CODE" maxLength={6} autoFocus
                  style={{ width: 160, padding: '14px', background: SURFACE, border: `2px solid ${BORDER}`, borderRadius: 8, fontSize: 24, color: INK, outline: 'none', textAlign: 'center', fontFamily: "'DM Mono', monospace", fontWeight: 700, letterSpacing: '6px' }} />
                {checkinStatus && checkinStatus !== 'success' && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginTop: 10 }}>{checkinStatus}</div>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                  <button onClick={() => setCheckinShow(null)} style={{ padding: '10px 20px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>cancel</button>
                  <button onClick={handleCheckin} disabled={checkinLoading || !checkinCode.trim()} style={{ padding: '10px 20px', background: WARM_GOLD, color: INK, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: checkinLoading || !checkinCode.trim() ? 0.5 : 1 }}>
                    {checkinLoading ? '...' : `check in ${currencyIcon}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: CREAM + 'EE', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${BORDER}` }}>
        {/* Admin bar */}
        {(profile?.role === 'admin' || profile?.role === 'band') && (
          <div style={{ background: INK, padding: '6px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: profile?._god ? WARM_GOLD : CREAM + '55', letterSpacing: '1px' }}>{profile?._god ? '⚡ god mode' : 'artist view'}</div>
            <a href="/dashboard" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM, background: RUBY, padding: '4px 12px', borderRadius: 6, textDecoration: 'none', fontWeight: 600, letterSpacing: '0.5px' }}>
              dashboard →
            </a>
          </div>
        )}
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 26, fontWeight: 700, color: INK, textTransform: 'lowercase', letterSpacing: '-0.5px' }}>
            {logoUrl
              ? <img src={logoUrl} alt={tenantName} style={{ height: 44, maxWidth: 200, objectFit: 'contain', display: 'block' }} />
              : tenantName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications && user) { supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('tenant_id', tenantId).eq('is_read', false).then(() => setUnreadCount(0)); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', fontFamily: "'DM Mono', monospace", fontSize: 16, color: RUBY, padding: '4px' }}>
              ◈
              {unreadCount > 0 && <span style={{ position: 'absolute', top: -2, right: -4, background: RUBY, color: '#fff', fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            <div onClick={() => setMainTab('points')} style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: RUBY, background: RUBY + '11', padding: '5px 12px', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>{currencyIcon} {userStamps}</div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 100px' }}>

        {/* Notifications */}
        {showNotifications && (
          <div style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}`, margin: '10px 0', padding: '4px 0', animation: 'fadeIn 0.2s ease-out', maxHeight: 360, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase' }}>notifications</span>
              <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: SLATE }}>×</button>
            </div>
            {notifications.length === 0 ? <div style={{ padding: '24px 16px', textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>no notifications yet</div> :
              notifications.map(n => {
                const postMatch = (n.link || '').match(/post=([0-9a-fA-F-]+)/);
                return (
                <div key={n.id}
                  onClick={postMatch ? () => { setShowNotifications(false); setFocusPostId(postMatch[1]); } : undefined}
                  style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, background: n.is_read ? 'transparent' : WARM_GOLD + '08', cursor: postMatch ? 'pointer' : 'default' }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: n.type === 'stamp' ? WARM_GOLD : n.type === 'like' ? RUBY : SLATE, flexShrink: 0 }}>
                      {n.type === 'stamp' ? currencyIcon : n.type === 'like' ? '♥' : n.type === 'comment' ? '↩' : n.type === 'reward' ? '♛' : '◈'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: n.is_read ? 400 : 600, color: INK, lineHeight: 1.4 }}>{n.title}</div>
                      {n.body && <div style={{ fontSize: 11, color: SLATE, marginTop: 2 }}>{n.body}</div>}
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '77', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                    </div>
                  </div>
                </div>
                );
              })
            }
          </div>
        )}

        {/* ─── FEED TAB ─── */}
        {mainTab === 'feed' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* Welcome banner */}
            {showWelcome && (
              <div style={{ background: RUBY, borderRadius: 10, padding: '24px 22px', margin: '14px 0', position: 'relative', animation: 'fadeIn 0.5s ease-out' }}>
                <button onClick={() => { setShowWelcome(false); if (typeof window !== 'undefined') localStorage.setItem(`flock_welcomed_${tenantId}`, '1'); }} style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', color: CREAM + '66', cursor: 'pointer', fontSize: 16 }}>×</button>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 24, fontWeight: 700, color: CREAM, marginBottom: 10, textTransform: 'lowercase', lineHeight: 1.2 }}>welcome to {tenantName}</div>
                <p style={{ fontSize: 13, color: CREAM + 'BB', lineHeight: 1.6, marginBottom: 16 }}>you're in. earn {currencyName} by posting, commenting, and attending shows. unlock {rewardsLabel} as you go.</p>
                <button onClick={() => { setShowWelcome(false); if (typeof window !== 'undefined') localStorage.setItem(`flock_welcomed_${tenantId}`, '1'); }} style={{ background: CREAM, color: INK, border: 'none', borderRadius: 6, padding: '10px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>start exploring</button>
              </div>
            )}

            {/* Feed tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginTop: 10, marginBottom: 14, background: SURFACE, borderRadius: '10px 10px 0 0', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {feedTabs.map(tab => {
                const isActive = feedView === tab.id;
                const color = tab.color || RUBY;
                return (
                  <button key={tab.id} onClick={() => { setFeedView(tab.id); setFeedTagFilter(null); setFeedArtistOnly(false); }} style={{ flex: tab.id === 'highlights' ? '0 0 auto' : 1, padding: '12px 8px 10px', background: 'transparent', border: 'none', borderBottom: isActive ? `2.5px solid ${color}` : '2.5px solid transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: tab.id === 'highlights' ? 80 : 56 }}>
                    <div style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {tab.id === 'community' ? <span style={{ fontSize: 16, color: isActive ? RUBY : SLATE + '66' }}>✦</span> :
                       tab.id === 'highlights' ? <span style={{ fontSize: 14, color: isActive ? RUBY : SLATE + '66' }}>◉</span> :
                       tab.avatar_url ? <div style={{ width: 30, height: 30, borderRadius: 15, overflow: 'hidden', border: isActive ? `2px solid ${color}` : '2px solid transparent', transition: 'all 0.15s', flexShrink: 0 }}><img src={tab.avatar_url} alt="" style={{ width: 30, height: 30, objectFit: 'cover', display: 'block' }} /></div> :
                       <div style={{ width: 30, height: 30, borderRadius: 7, background: isActive ? color : SLATE + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: isActive ? '#fff' : SLATE + '88', fontWeight: 700, fontFamily: "'DM Mono', monospace", transition: 'all 0.15s' }}>{tab.icon}</div>}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? color : SLATE, fontFamily: "'DM Mono', monospace" }}>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Member header */}
            {feedView !== 'community' && feedView !== 'highlights' && memberMap[feedView] && <MemberHeader member={feedView} memberMap={memberMap} />}

            {/* Tag filter */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
              <button onClick={() => setFeedTagFilter(null)} style={{ padding: '4px 10px', borderRadius: 12, border: `1px solid ${!feedTagFilter ? RUBY : BORDER}`, background: !feedTagFilter ? RUBY + '11' : 'transparent', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 9, color: !feedTagFilter ? RUBY : SLATE, whiteSpace: 'nowrap' }}>all</button>
              {feedView === 'community' && artistIds.length > 0 && (
                <button onClick={() => setFeedArtistOnly(v => !v)} style={{ padding: '4px 10px', borderRadius: 12, border: `1px solid ${feedArtistOnly ? RUBY : BORDER}`, background: feedArtistOnly ? RUBY + '11' : 'transparent', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 9, color: feedArtistOnly ? RUBY : SLATE, whiteSpace: 'nowrap', fontWeight: 600 }}>✦ from {tenantName?.toLowerCase() || 'the artist'}</button>
              )}
              {POST_TAGS.filter(t => t.key !== 'general').map(t => (
                <button key={t.key} onClick={() => setFeedTagFilter(feedTagFilter === t.key ? null : t.key)} style={{ padding: '4px 10px', borderRadius: 12, border: `1px solid ${feedTagFilter === t.key ? RUBY : BORDER}`, background: feedTagFilter === t.key ? RUBY + '11' : 'transparent', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 9, color: feedTagFilter === t.key ? RUBY : SLATE, whiteSpace: 'nowrap' }}>{t.icon} {t.label}</button>
              ))}
            </div>

            {/* Post composer */}
            <div style={{ background: SURFACE, borderRadius: 10, padding: '14px 16px', marginBottom: 12, border: `1px solid ${BORDER}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: 6, objectFit: 'cover', marginTop: 2 }} /> :
                  <div style={{ width: 30, height: 30, borderRadius: 6, background: BLUSH + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontFamily: "'DM Mono', monospace", color: SLATE, marginTop: 2, flexShrink: 0 }}>{profile?.display_name?.charAt(0)?.toLowerCase() || '○'}</div>}
                <textarea placeholder="say something..." value={newPost} onChange={e => setNewPost(e.target.value)} rows={newPost.length > 80 || newPost.includes('\n') ? 4 : 1}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: INK, background: 'transparent', resize: 'none', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, padding: '4px 0' }} />
              </div>

              {/* Tag selector */}
              <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                {POST_TAGS.map(t => (
                  <button key={t.key} onClick={() => { setPostTag(t.key); if (t.key === 'poll') setShowPollCreator(true); else setShowPollCreator(false); }} style={{ padding: '3px 8px', borderRadius: 10, border: `1px solid ${postTag === t.key ? RUBY + '44' : BORDER}`, background: postTag === t.key ? RUBY + '08' : 'transparent', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 9, color: postTag === t.key ? RUBY : SLATE + '88' }}>{t.icon} {t.label}</button>
                ))}
              </div>

              {/* Poll creator */}
              {showPollCreator && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: CREAM, borderRadius: 8, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, marginBottom: 6 }}>poll options</div>
                  {pollOptions.map((opt, i) => (
                    <input key={i} type="text" value={opt} onChange={e => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n); }} placeholder={`option ${i + 1}`}
                      style={{ display: 'block', width: '100%', padding: '7px 10px', marginBottom: 4, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
                  ))}
                  {pollOptions.length < 5 && <button onClick={() => setPollOptions([...pollOptions, ''])} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY, padding: '4px 0' }}>+ add option</button>}
                </div>
              )}

              {/* Link input */}
              {showLinkInput && (
                <div style={{ marginTop: 8 }}>
                  <input type="url" placeholder="paste a link..." value={postLink} onChange={async e => {
                    const val = e.target.value; setPostLink(val); setLinkPreviewData(null);
                    if (!val.trim()) return;
                    try { new URL(val); } catch { return; }
                    setLinkFetching(true);
                    try { const r = await fetch(`/api/link-preview?url=${encodeURIComponent(val)}`); const d = await r.json(); if (d.title) setLinkPreviewData(d); } catch {}
                    setLinkFetching(false);
                  }} style={{ width: '100%', padding: '8px 10px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, color: INK, outline: 'none', fontFamily: "'DM Mono', monospace", boxSizing: 'border-box' }} />
                  {linkFetching && <div style={{ fontSize: 10, color: SLATE + '88', fontFamily: "'DM Mono', monospace", marginTop: 4 }}>fetching preview...</div>}
                  {linkPreviewData && (
                    <div style={{ marginTop: 6, background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
                      {linkPreviewData.image && <img src={linkPreviewData.image} alt="" style={{ width: 64, height: 64, objectFit: 'cover', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />}
                      <div style={{ padding: '8px 10px', flex: 1 }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: RUBY, marginBottom: 2 }}>{linkPreviewData.domain}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: INK, lineHeight: 1.3 }}>{linkPreviewData.title}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Image previews */}
              {postImagePreviews.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {postImagePreviews.map((p, i) => (
                    <div key={i} style={{ position: 'relative', width: postImagePreviews.length === 1 ? '100%' : 'calc(50% - 3px)' }}>
                      <img src={p} alt="" style={{ width: '100%', height: postImagePreviews.length === 1 ? 'auto' : 120, objectFit: 'cover', borderRadius: 6, border: `1px solid ${BORDER}`, display: 'block' }} />
                      <button onClick={() => { setPostImages(prev => prev.filter((_, j) => j !== i)); setPostImagePreviews(prev => prev.filter((_, j) => j !== i)); }} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: INK + 'CC', color: CREAM, border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {postAudioName && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, background: CREAM, borderRadius: 8, padding: '8px 12px', border: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 14, color: RUBY }}>♫</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{postAudioName}</span>
                  <button onClick={() => { setPostAudio(null); setPostAudioName(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: SLATE + '88' }}>×</button>
                </div>
              )}

              {/* Live URL input */}
              {showLiveInput && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, marginBottom: 5 }}>paste youtube, twitch, or mux live url</div>
                  <input type="url" value={liveUrl} onChange={e => setLiveUrl(e.target.value)} placeholder="https://youtube.com/watch?v=... or https://twitch.tv/..."
                    style={{ width: '100%', padding: '9px 12px', background: CREAM, border: `1px solid ${liveUrl ? RUBY + '44' : BORDER}`, borderRadius: 8, fontSize: 12, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
                  {liveUrl && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: RUBY, marginTop: 4 }}>✦ fans will see a live player embedded in this post</div>}
                </div>
              )}

              {/* Composer actions */}
              {postVideoPreview && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: CREAM, borderRadius: 6, margin: '6px 0', border: `1px solid ${BORDER}` }}>
                  <video src={postVideoPreview} style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4 }} />
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, flex: 1 }}>{postVideo?.name}</div>
                  <button onClick={() => { setPostVideo(null); setPostVideoPreview(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: SLATE + '88' }}>x</button>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
                <label style={{ cursor: postImages.length >= 6 ? 'default' : 'pointer', padding: '4px 8px', color: postImages.length >= 6 ? SLATE + '33' : SLATE + '88', fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
                  <input type="file" accept="image/*" multiple onChange={e => { const files = Array.from(e.target.files || []); const toAdd = files.slice(0, 6 - postImages.length); setPostImages(p => [...p, ...toAdd]); toAdd.forEach(f => { const r = new FileReader(); r.onload = ev => setPostImagePreviews(p => [...p, ev.target.result]); r.readAsDataURL(f); }); e.target.value = ''; }} style={{ display: 'none' }} disabled={postImages.length >= 6} />
                  {postImages.length > 0 ? `📷 ${postImages.length}/6` : '📷'}
                </label>
                {(profile?.role === 'band' || profile?.role === 'admin') && (
                  <label style={{ cursor: 'pointer', padding: '4px 6px', color: SLATE + '88', fontSize: 13 }}>
                    <input type="file" accept="audio/*,.m4a,.mp3,.wav,.aac" onChange={e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 20 * 1024 * 1024) { alert('audio must be under 20MB'); return; } setPostAudio(f); setPostAudioName(f.name); }} style={{ display: 'none' }} />
                    ♫
                  </label>
                )}
                <label style={{ cursor: 'pointer', padding: '4px 6px', color: postVideo ? RUBY : SLATE + '88', fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
                  <input type="file" accept="video/*,.mp4,.mov,.webm" onChange={e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 400 * 1024 * 1024) { alert('video must be under 400MB'); return; } setPostVideo(f); setPostVideoPreview(URL.createObjectURL(f)); }} style={{ display: 'none' }} />
                  {postVideo ? '▶ video' : '▶'}
                </label>
                {(profile?.role === 'band' || profile?.role === 'admin') && (
                  <button onClick={() => { setShowLiveInput(!showLiveInput); if (showLiveInput) setLiveUrl(''); }}
                    style={{ padding: '4px 8px', background: showLiveInput ? RUBY + '15' : 'none', border: 'none', cursor: 'pointer', color: showLiveInput ? RUBY : SLATE + '88', fontFamily: "'DM Mono', monospace", fontSize: 11, borderRadius: 4 }} title="go live">
                    ▶
                  </button>
                )}
                <button onClick={() => { setShowLinkInput(!showLinkInput); if (showLinkInput) { setPostLink(''); setLinkPreviewData(null); } }} style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: showLinkInput ? RUBY : SLATE + '88', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>↗</button>
                <button onClick={handlePost} disabled={posting || (!newPost.trim() && postImages.length === 0 && !postAudio && !postVideo && !liveUrl.trim() && !(showPollCreator && pollOptions.filter(o => o.trim()).length >= 2))}
                  style={{ background: (newPost.trim() || postImages.length > 0 || postAudio || postVideo || liveUrl.trim() || (showPollCreator && pollOptions.filter(o => o.trim()).length >= 2)) ? RUBY : BORDER, border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 11, fontWeight: 600, color: (newPost.trim() || postImages.length > 0 || postAudio || postVideo || liveUrl.trim()) ? CREAM : SLATE + '66', cursor: 'pointer' }}>
                  {posting ? '...' : liveUrl.trim() ? 'go live' : 'post'}
                </button>
              </div>
            </div>

            {/* Posts */}
            {loadingPosts ? (
              <div style={{ textAlign: 'center', padding: 40, fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE }}>loading...</div>
            ) : visiblePosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', animation: 'fadeIn 0.4s ease-out' }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>✦</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 8 }}>
                  {feedView === 'highlights' ? 'no highlights yet' : 'nothing here yet'}
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, lineHeight: 1.7, marginBottom: 20 }}>
                  {profile?.role === 'admin' || profile?.role === 'band'
                    ? 'write your first post to welcome fans in. they\'ll see it the moment they join.'
                    : 'the artist hasn\'t posted yet. check back soon.'}
                </div>
              </div>
            ) : (
              <>
                {visiblePosts.map((post, i) => (
                  <div key={post.id} style={{ animation: `fadeIn 0.3s ease-out ${i * 0.03}s both` }}>
                    <PostCard post={post} currentUserId={user?.id} currentProfile={profile} supabase={supabase} tenantId={tenantId} memberMap={memberMap} currencyName={currencyName} currencyIcon={currencyIcon} onRefresh={fetchPosts} onViewProfile={setViewingProfile} />
                  </div>
                ))}

                {/* Load older posts button */}
                {!feedTagFilter && posts.length >= POSTS_PAGE_SIZE && (
                  <div style={{ padding: '20px 0 40px', textAlign: 'center' }}>
                    {hasMorePosts ? (
                      <button onClick={loadMorePosts} disabled={loadingMorePosts}
                        style={{ padding: '12px 24px', background: 'transparent', border: `1px solid ${SLATE}44`, borderRadius: 6, cursor: loadingMorePosts ? 'default' : 'pointer', fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, letterSpacing: '0.5px', opacity: loadingMorePosts ? 0.5 : 1 }}>
                        {loadingMorePosts ? 'loading...' : 'load older posts'}
                      </button>
                    ) : (
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + '77', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        ✦ you're all caught up
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── SHOWS TAB ─── */}
        {mainTab === 'shows' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out', paddingTop: 14 }}>
            <div style={{ background: INK, borderRadius: 10, padding: '28px 22px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 70% 30%, ${RUBY}22, transparent 60%)` }} />
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: WARM_GOLD, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10, position: 'relative' }}>on the road</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 32, fontWeight: 700, color: CREAM, textTransform: 'lowercase', position: 'relative' }}>{tenantName}</div>
            </div>

            {Object.keys(shows).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>♫</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, color: INK, textTransform: 'lowercase', marginBottom: 8 }}>no shows yet</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, lineHeight: 1.7, marginBottom: 20 }}>
                  add upcoming shows so fans can check in and earn {currencyName}
                </div>
                {(profile?.role === 'admin' || profile?.role === 'band') && (
                  <a href="/dashboard" style={{ display: 'inline-block', padding: '10px 24px', background: RUBY, color: CREAM, borderRadius: 10, textDecoration: 'none', fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600 }}>
                    add shows in dashboard →
                  </a>
                )}
              </div>
            ) : REGION_ORDER.filter(r => shows[r]).map(region => (
              <div key={region} style={{ marginBottom: 10 }}>
                <button onClick={() => setExpandedRegion(expandedRegion === region ? null : region)} style={{ width: '100%', background: expandedRegion === region ? INK : SURFACE, border: `1px solid ${BORDER}`, borderRadius: expandedRegion === region ? '8px 8px 0 0' : 8, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700, color: expandedRegion === region ? CREAM : INK, textTransform: 'lowercase' }}>{region.replace('_', ' ')}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: expandedRegion === region ? CREAM + '66' : SLATE }}>{shows[region].length} shows {expandedRegion === region ? '−' : '+'}</span>
                </button>
                {expandedRegion === region && (
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                    {shows[region].map((show, i) => {
                      const isPast = new Date(show.date + 'T23:59:59') < new Date();
                      const attended = myAttendance.has(show.id);
                      const sold = show.status === 'sold_out';
                      return (
                        <div key={show.id} style={{ padding: '13px 18px', borderBottom: i < shows[region].length - 1 ? `1px solid ${BORDER}` : 'none', opacity: isPast && !attended ? 0.45 : 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, minWidth: 52 }}>
                              {new Date(show.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                              {show.end_date && ` - ${new Date(show.end_date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{show.city}</div>
                              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + 'AA' }}>{show.venue}{show.source === 'bandsintown' ? <span style={{ marginLeft: 6, fontSize: 8, color: SLATE + '55', letterSpacing: '0.5px' }}>via bandsintown</span> : ''}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {attended ? <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: WARM_GOLD }}>{currencyIcon} attended</span> :
                               isPast ? <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '66' }}>past</span> :
                               show.checkin_code && !sold ? <button onClick={() => { setCheckinShow(show); setCheckinCode(''); setCheckinStatus(''); }} style={{ background: WARM_GOLD, color: INK, border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}>check in</button> :
                               sold ? <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: RUBY }}>sold out</span> :
                               show.ticket_url ? <a href={show.ticket_url} target="_blank" rel="noopener noreferrer" style={{ background: INK, color: CREAM, borderRadius: 6, padding: '6px 12px', fontSize: 10, fontWeight: 600, textDecoration: 'none' }}>tickets</a> : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── POINTS TAB ─── */}
        {mainTab === 'points' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out', paddingTop: 14 }}>
            {/* Hero */}
            <div style={{ background: INK, borderRadius: 10, padding: '30px 22px', textAlign: 'center', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${RUBY}15, transparent 70%)` }} />
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: WARM_GOLD, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12, position: 'relative' }}>your {currencyName}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 56, fontWeight: 700, color: CREAM, position: 'relative' }}>{userStamps}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM + '77', marginTop: 6, position: 'relative' }}>{currencyName} · {currentLevel.name}</div>
              {profile?.login_streak > 0 && (
                <div style={{ display: 'inline-block', marginTop: 12, background: WARM_GOLD + '22', borderRadius: 20, padding: '4px 14px', position: 'relative' }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: WARM_GOLD }}>🔥 {profile.login_streak} day streak</span>
                </div>
              )}
              {nextLevel && (
                <>
                  <div style={{ marginTop: 18, background: CREAM + '15', borderRadius: 2, height: 4, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: `${Math.min((userStamps / nextLevel.stamps) * 100, 100)}%`, height: '100%', background: `linear-gradient(90deg, ${RUBY}, ${WARM_GOLD})`, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: CREAM + '55', marginTop: 6, position: 'relative' }}>{nextLevel.stamps - userStamps} to {nextLevel.name} {nextLevel.icon}</div>
                </>
              )}
            </div>

            {/* Reward tiers */}
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>your {rewardsLabel}</div>
            {STAMP_LEVELS.map(level => {
              const unlocked = userStamps >= level.stamps;
              const claimRow = rewardClaims.find(c => c.level_key === level.key);
              const claimed = !!claimRow;
              const claimStatus = claimRow?.status;
              // Only nag for an address while the claim is still pending (unfulfilled).
              // Once the artist approves/ships it, don't ask — they've handled it.
              const missingAddress = claimed && claimRow.status === 'pending' && levelNeedsShipping(level) && !claimRow.shipping_address;
              return (
                <div key={level.key} style={{ background: unlocked ? SURFACE : CREAM, borderRadius: 10, padding: '16px 18px', marginBottom: 8, border: `1px solid ${unlocked ? WARM_GOLD + '33' : BORDER}`, opacity: unlocked ? 1 : 0.45 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 8, background: unlocked ? INK : BORDER, color: unlocked ? WARM_GOLD : SLATE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontFamily: "'DM Mono', monospace" }}>{level.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>{level.name}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: unlocked ? WARM_GOLD : SLATE }}>{level.stamps > 0 ? `${level.stamps} ${currencyIcon}` : '✓ welcome'}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: SLATE, marginTop: 3, lineHeight: 1.4 }}>{level.rewardDesc}</div>
                    </div>
                  </div>
                  {unlocked && level.stamps > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
                      {!claimed ? (
                        <button onClick={() => setClaimingLevel(level)} style={{ padding: '8px 16px', background: WARM_GOLD, color: INK, border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>claim reward {currencyIcon}</button>
                      ) : missingAddress ? (
                        <button onClick={() => setClaimingLevel(level)} style={{ padding: '8px 16px', background: WARM_GOLD, color: INK, border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ add shipping address</button>
                      ) : (
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: WARM_GOLD }}>{currencyIcon} {claimStatus || 'claimed'}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* How to earn */}
            {stampActions.length > 0 && <>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 20, marginBottom: 10 }}>how to earn {currencyName}</div>
              <div style={{ background: SURFACE, borderRadius: 10, padding: '4px 18px', border: `1px solid ${BORDER}`, marginBottom: 20 }}>
                {stampActions.map((a, i) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < stampActions.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: SLATE }}>↗</span>
                    <span style={{ flex: 1, fontSize: 12, color: INK + 'CC' }}>{a.name}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: RUBY }}>+{a.points} {currencyIcon}</span>
                  </div>
                ))}
              </div>
            </>}

            {/* Leaderboard */}
            {topCollectors.length > 0 && <>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>top fans</div>
              <div style={{ background: SURFACE, borderRadius: 10, padding: '4px 18px', border: `1px solid ${BORDER}` }}>
                {topCollectors.map((u, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < topCollectors.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: i < 3 ? WARM_GOLD : SLATE, width: 20, fontWeight: i < 3 ? 700 : 400 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: INK }}>
                      {u.display_name?.toLowerCase()}
                      {u.member_number ? <span style={{ color: SLATE + '88', fontFamily: "'DM Mono', monospace", fontSize: 9, marginLeft: 6 }}>#{u.member_number}</span> : null}
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>{u.stamp_count} {currencyIcon}</span>
                  </div>
                ))}
                {myRank && myRank > topCollectors.length && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `2px solid ${BORDER}` }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: RUBY, width: 20, fontWeight: 700 }}>{myRank}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: RUBY }}>you</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY }}>{userStamps} {currencyIcon}</span>
                  </div>
                )}
              </div>
            </>}
          </div>
        )}

        {/* ─── YOU TAB ─── */}
        {mainTab === 'you' && profile && (
          <div style={{ animation: 'fadeIn 0.3s ease-out', paddingTop: 14 }}>
            {/* Profile card */}
            <div style={{ background: `linear-gradient(145deg, ${RUBY}15, ${BLUSH}15, ${SURFACE})`, borderRadius: 12, padding: '32px 22px 28px', textAlign: 'center', border: `1px solid ${BORDER}`, marginBottom: 14 }}>
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', margin: '0 auto 16px', display: 'block', border: `3px solid ${BLUSH}44` }} /> : (
                <div style={{ width: 80, height: 80, borderRadius: 12, background: `linear-gradient(135deg, ${RUBY}22, ${BLUSH}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, margin: '0 auto 16px', color: RUBY }}>
                  {profile.display_name?.charAt(0)?.toLowerCase() || '✦'}
                </div>
              )}
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 24, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>{profile.display_name?.toLowerCase()}</div>
              {profile.bio && <p style={{ fontSize: 13, color: SLATE, marginTop: 8, lineHeight: 1.5, fontStyle: 'italic', maxWidth: 280, margin: '8px auto 0' }}>{profile.bio}</p>}
              {profile.city && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: BLUSH, marginTop: 6 }}>📍 {profile.city}</div>}
              <div style={{ display: 'inline-block', marginTop: 12, background: RUBY + '11', border: `1px solid ${RUBY}22`, borderRadius: 20, padding: '4px 14px' }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY }}>{currentLevel.icon} {currentLevel.name.toLowerCase()}</span>
              </div>
              {(profile.member_number || profile.login_streak > 0) && (
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginTop: 12, display: 'flex', gap: 16, justifyContent: 'center' }}>
                  {profile.member_number ? <span>✦ member #{profile.member_number}</span> : null}
                  {profile.login_streak > 0 ? <span style={{ color: WARM_GOLD }}>🔥 {profile.login_streak} day streak</span> : null}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 20 }}>
                <div><div style={{ fontSize: 28, fontWeight: 700, color: RUBY }}>{userStamps}</div><div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: SLATE, letterSpacing: 1.5, textTransform: 'uppercase' }}>{currencyName}</div></div>
                <div><div style={{ fontSize: 28, fontWeight: 700, color: WARM_GOLD }}>{profile.show_count || 0}</div><div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: SLATE, letterSpacing: 1.5 }}>shows</div></div>
                <div><div style={{ fontSize: 28, fontWeight: 700, color: BLUSH }}>{profile.referral_count || 0}</div><div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: SLATE, letterSpacing: 1.5 }}>referrals</div></div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ background: SURFACE, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              {(profile.role === 'admin' || profile.role === 'band') && (
                <div onClick={() => window.location.href = '/dashboard'} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', background: WARM_GOLD + '08' }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: WARM_GOLD, width: 24, textAlign: 'center' }}>◈</span>
                  <span style={{ fontSize: 13, color: INK, flex: 1, fontWeight: 600 }}>dashboard</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: WARM_GOLD, fontSize: 14 }}>→</span>
                </div>
              )}
              {[
                { icon: '✎', label: 'edit profile', action: () => setShowEditProfile(true) },
              ].map(item => (
                <div key={item.label} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: SLATE, width: 24, textAlign: 'center' }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: INK, flex: 1 }}>{item.label}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: SLATE + '55', fontSize: 14 }}>→</span>
                </div>
              ))}

              {/* Push notifications */}
              {pushState !== 'unsupported' && pushState !== 'unknown' && (
                <div onClick={pushState === 'on' ? undefined : enablePush}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, cursor: pushState === 'on' ? 'default' : 'pointer' }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: pushState === 'on' ? SAGE : SLATE, width: 24, textAlign: 'center' }}>◔</span>
                  <span style={{ fontSize: 13, color: INK, flex: 1 }}>
                    {pushState === 'on' ? 'notifications on' : 'turn on notifications'}
                    <span style={{ display: 'block', fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '99', marginTop: 2 }}>
                      {pushState === 'on' ? 'you’ll get a ping when new posts drop' : 'get pinged when the artist posts'}
                    </span>
                  </span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: pushState === 'on' ? SAGE : SLATE + '55', fontSize: pushState === 'busy' ? 11 : 14 }}>
                    {pushState === 'busy' ? '...' : pushState === 'on' ? '✓' : '→'}
                  </span>
                </div>
              )}

              {/* Referral */}
              {profile.referral_code && (
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: SLATE, width: 24, textAlign: 'center' }}>⊕</span>
                    <span style={{ fontSize: 13, color: INK, flex: 1, fontWeight: 600 }}>invite a friend</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input readOnly value={typeof window !== 'undefined' ? `${window.location.origin}/join/${profile.referral_code}` : ''} style={{ flex: 1, padding: '8px 10px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, color: SLATE, fontFamily: "'DM Mono', monospace", outline: 'none' }} />
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join/${profile.referral_code}`).then(() => { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }); }} style={{ padding: '8px 14px', background: copiedLink ? WARM_GOLD : INK, color: CREAM, border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                      {copiedLink ? `copied ${currencyIcon}` : 'copy'}
                    </button>
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '77', marginTop: 6 }}>you both earn 25 {currencyName} when they join</div>
                </div>
              )}

              <div onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: RUBY, width: 24, textAlign: 'center' }}>↪</span>
                <span style={{ fontSize: 13, color: RUBY, flex: 1 }}>sign out</span>
              </div>
            </div>

            {/* flock brand mark — clear, tappable, links to the marketing site */}
            <a
              href={`https://fans-flock.com?utm_source=tenant&utm_medium=app_profile&utm_campaign=${typeof window !== 'undefined' ? window.location.hostname.split('.')[0] : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, textDecoration: 'none', padding: '28px 0 8px' }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: RUBY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>✦</div>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: INK, textTransform: 'lowercase', letterSpacing: '-0.5px' }}>flock</span>
              </div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '99', letterSpacing: '0.5px' }}>start your own fan community →</span>
            </a>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: SURFACE + 'F0', backdropFilter: 'blur(16px)', borderTop: `1px solid ${BORDER}`, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', justifyContent: 'space-around', padding: '6px 0 12px' }}>
          {mainTabs.map(tab => (
            tab.href
              ? <a key={tab.id} href={tab.href} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 16px', minWidth: 56, textDecoration: 'none' }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, color: SLATE + '66' }}>{tab.icon}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '66' }}>{tab.label}</span>
                </a>
              : <button key={tab.id} onClick={() => { setMainTab(tab.id); if (tab.id === 'feed') setFeedView('community'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 16px', minWidth: 56 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, color: mainTab === tab.id ? RUBY : SLATE + '66' }}>{tab.icon}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: mainTab === tab.id ? 500 : 400, color: mainTab === tab.id ? INK : SLATE + '66' }}>{tab.label}</span>
                </button>
          ))}
        </div>
      </div>
    </div>
  );
}
