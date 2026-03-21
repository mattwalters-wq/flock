'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';

// ============ HELPERS ============
function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const DEFAULT_STAMP_LEVELS = [
  { name: 'First Press', key: 'first_press', stamps: 0, icon: '◐', reward: null, rewardDesc: 'welcome to the community' },
  { name: 'B-Side', key: 'b_side', stamps: 50, icon: '◑', reward: 'postcard', rewardDesc: 'handwritten digital postcard from the artist' },
  { name: 'Deep Cut', key: 'deep_cut', stamps: 150, icon: '●', reward: 'tshirt', rewardDesc: 'exclusive community t-shirt shipped to your door' },
  { name: 'Inner Sleeve', key: 'inner_sleeve', stamps: 300, icon: '◉', reward: 'vinyl', rewardDesc: 'signed vinyl or limited edition release' },
  { name: 'Stamped', key: 'stamped', stamps: 500, icon: '✦', reward: 'zoom', rewardDesc: 'monthly group hangout with the artist' },
  { name: 'Inner Circle', key: 'inner_circle', stamps: 1000, icon: '♛', reward: 'meetgreet', rewardDesc: 'meet and greet at a show + name in the liner notes' },
];

// ============ EDIT PROFILE MODAL ============
function EditProfileModal({ profile, supabase, tenantId, onSave, onClose }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [city, setCity] = useState(profile?.city || '');
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [emailNotifications, setEmailNotifications] = useState(profile?.email_notifications !== false);

  const INK = 'var(--ink)'; const CREAM = 'var(--cream)'; const RUBY = 'var(--ruby)';
  const SLATE = 'var(--slate)'; const SURFACE = 'var(--surface)'; const BORDER = 'var(--border)';
  const BLUSH = 'var(--blush)';

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('image must be under 2MB'); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    let avatarUrl = profile?.avatar_url || null;

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const fileName = `avatars/${tenantId}/${profile.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, avatarFile, { cacheControl: '3600', upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
        avatarUrl = urlData?.publicUrl;
      }
    }

    await onSave({ display_name: displayName, bio, city, avatar_url: avatarUrl, email_notifications: emailNotifications });
    setSaving(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(26,26,26,0.6)', backdropFilter: 'blur(8px)', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: CREAM, borderRadius: 12, padding: '24px 18px', width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto',
        animation: 'fadeIn 0.3s ease-out',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: INK, marginBottom: 20, textTransform: 'lowercase' }}>edit profile</div>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <label style={{ cursor: 'pointer', display: 'inline-block', position: 'relative' }}>
            <input type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', border: `2px solid ${BORDER}` }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: 10, background: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontFamily: "'DM Mono', monospace", color: SLATE }}>
                {displayName?.charAt(0)?.toLowerCase() || '○'}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: '50%', background: INK, color: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, border: `2px solid ${CREAM}` }}>✎</div>
          </label>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '88', marginTop: 8 }}>tap to change photo</div>
        </div>

        {[
          { label: 'display name', value: displayName, onChange: setDisplayName, maxLength: 24 },
          { label: 'city', value: city, onChange: setCity, placeholder: 'e.g. melbourne, london, toronto' },
        ].map(({ label, value, onChange, maxLength, placeholder }) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>{label}</label>
            <input type="text" value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} placeholder={placeholder}
              style={{ width: '100%', padding: '11px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
          </div>
        ))}

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} rows={3}
            placeholder="tell people a bit about yourself..."
            style={{ width: '100%', padding: '11px 14px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif", resize: 'vertical', lineHeight: 1.5 }} />
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '77', marginTop: 4, textAlign: 'right' }}>{bio.length}/160</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', marginBottom: 20, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <div style={{ fontSize: 13, color: INK, fontWeight: 500 }}>email notifications</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, marginTop: 2 }}>get emailed when the artist posts</div>
          </div>
          <button onClick={() => setEmailNotifications(!emailNotifications)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: emailNotifications ? RUBY : BORDER, position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 2, left: emailNotifications ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>cancel</button>
          <button onClick={handleSave} disabled={saving || !displayName.trim()} style={{ padding: '10px 20px', background: INK, color: CREAM, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: saving || !displayName.trim() ? 0.5 : 1 }}>
            {saving ? 'saving...' : 'save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ CLAIM REWARD MODAL ============
function ClaimRewardModal({ level, supabase, userId, tenantId, onClaimed, onClose }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [postcode, setPostcode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const INK = 'var(--ink)'; const CREAM = 'var(--cream)'; const BORDER = 'var(--border)';
  const SLATE = 'var(--slate)'; const WARM_GOLD = 'var(--warm-gold)'; const SURFACE = 'var(--surface)';

  const needsShipping = ['tshirt', 'vinyl'].includes(level.reward);

  const handleClaim = async () => {
    if (needsShipping && (!name || !address || !city || !country || !postcode)) {
      setError('please fill in all shipping fields');
      return;
    }
    setSubmitting(true);
    setError('');

    const { error: insertError } = await supabase.from('reward_claims').insert({
      user_id: userId,
      tenant_id: tenantId,
      level_key: level.key,
      reward_type: level.reward,
      shipping_name: needsShipping ? name : null,
      shipping_address: needsShipping ? address : null,
      shipping_city: needsShipping ? city : null,
      shipping_country: needsShipping ? country : null,
      shipping_postcode: needsShipping ? postcode : null,
    });

    if (insertError) { setError(insertError.message); setSubmitting(false); return; }
    onClaimed();
  };

  const Field = ({ label, value, onChange, placeholder }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,26,26,0.6)', backdropFilter: 'blur(8px)', padding: 20 }} onClick={onClose}>
      <div style={{ background: CREAM, borderRadius: 12, padding: '24px 18px', width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto', animation: 'fadeIn 0.3s ease-out' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{level.icon}</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>claim your reward</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: WARM_GOLD, marginTop: 6 }}>{level.name} · {level.stamps} ✦</div>
        </div>
        <div style={{ background: SURFACE, borderRadius: 8, padding: '14px 16px', marginBottom: 20, border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 13, color: INK, lineHeight: 1.5 }}>{level.rewardDesc}</div>
        </div>
        {needsShipping && (
          <>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>shipping details</div>
            <Field label="full name" value={name} onChange={setName} placeholder="your name" />
            <Field label="address" value={address} onChange={setAddress} placeholder="street address" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Field label="city" value={city} onChange={setCity} placeholder="city" />
              <Field label="postcode" value={postcode} onChange={setPostcode} placeholder="postcode" />
            </div>
            <Field label="country" value={country} onChange={setCountry} placeholder="country" />
          </>
        )}
        {error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--ruby)', marginBottom: 10 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>cancel</button>
          <button onClick={handleClaim} disabled={submitting} style={{ padding: '10px 20px', background: WARM_GOLD, color: INK, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}>
            {submitting ? 'claiming...' : 'claim ✦'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ USER PROFILE MODAL ============
function UserProfileModal({ userId, supabase, tenantId, onClose, stampLevels }) {
  const [prof, setProf] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !supabase) return;
    (async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).eq('tenant_id', tenantId).single();
      setProf(data);
      setLoading(false);
    })();
  }, [userId, supabase, tenantId]);

  if (!userId) return null;
  const INK = 'var(--ink)'; const CREAM = 'var(--cream)'; const RUBY = 'var(--ruby)';
  const SLATE = 'var(--slate)'; const SURFACE = 'var(--surface)'; const BLUSH = 'var(--blush)';
  const WARM_GOLD = 'var(--warm-gold)';

  const currentLevel = prof ? (stampLevels || DEFAULT_STAMP_LEVELS).filter(l => (prof.stamp_count || 0) >= l.stamps).pop() : null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,16,24,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: SURFACE, borderRadius: 14, padding: '28px 24px', maxWidth: 340, width: '100%', textAlign: 'center', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: SLATE, fontFamily: "'DM Mono', monospace" }}>×</button>
        {loading ? (
          <div style={{ padding: 30, fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>loading...</div>
        ) : prof ? (
          <>
            {prof.avatar_url ? (
              <img src={prof.avatar_url} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', margin: '0 auto 12px', display: 'block' }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: 12, background: BLUSH + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, margin: '0 auto 12px', color: RUBY }}>
                {prof.display_name?.charAt(0) || '✦'}
              </div>
            )}
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>{prof.display_name}</div>
            {prof.role === 'band' && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: RUBY, border: `1px solid ${RUBY}44`, padding: '2px 8px', borderRadius: 3, letterSpacing: '0.8px', display: 'inline-block', marginTop: 6 }}>artist</span>}
            {prof.bio && <p style={{ fontSize: 12, color: SLATE, marginTop: 8, lineHeight: 1.5, fontStyle: 'italic' }}>{prof.bio}</p>}
            {prof.city && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: BLUSH, marginTop: 4 }}>📍 {prof.city}</div>}
            {currentLevel && (
              <div style={{ display: 'inline-block', marginTop: 10, background: RUBY + '11', border: `1px solid ${RUBY}22`, borderRadius: 20, padding: '3px 12px' }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: RUBY }}>{currentLevel.icon} {currentLevel.name.toLowerCase()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 16 }}>
              <div><div style={{ fontSize: 22, fontWeight: 700, color: RUBY }}>{prof.stamp_count || 0}</div><div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: SLATE, letterSpacing: 1.5 }}>stamps</div></div>
              <div><div style={{ fontSize: 22, fontWeight: 700, color: WARM_GOLD }}>{prof.show_count || 0}</div><div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: SLATE, letterSpacing: 1.5 }}>shows</div></div>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '66', marginTop: 14 }}>
              joined {new Date(prof.joined_at || prof.created_at).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
            </div>
          </>
        ) : <div style={{ padding: 30, fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>user not found</div>}
      </div>
    </div>
  );
}

// ============ COMMENTS PANEL ============
function CommentsPanel({ postId, postAuthorId, supabase, currentUserId, currentProfile, tenantId, onClose, onCommentAdded, onViewProfile }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [commentImage, setCommentImage] = useState(null);
  const [commentImagePreview, setCommentImagePreview] = useState(null);

  const INK = 'var(--ink)'; const RUBY = 'var(--ruby)'; const SLATE = 'var(--slate)';
  const SURFACE = 'var(--surface)'; const BORDER = 'var(--border)'; const BLUSH = 'var(--blush)';
  const CREAM = 'var(--cream)';

  useEffect(() => { loadComments(); }, [postId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('comments').select('*').eq('post_id', postId).eq('tenant_id', tenantId).order('created_at', { ascending: true });
      const commentsData = data || [];
      const authorIds = [...new Set(commentsData.map(c => c.author_id))];
      let profileMap = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, display_name, role, band_member, avatar_url').in('id', authorIds);
        if (profiles) profiles.forEach(p => { profileMap[p.id] = p; });
      }
      setComments(commentsData.map(c => ({ ...c, profiles: profileMap[c.author_id] || null })));
    } catch (e) { console.error('Comments error:', e); }
    setLoading(false);
  };

  const handleComment = async () => {
    if ((!newComment.trim() && !commentImage) || posting || !currentUserId) return;
    setPosting(true);

    let imageUrl = null;
    if (commentImage) {
      const ext = commentImage.name.split('.').pop();
      const path = `comments/${tenantId}/${currentUserId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('media').upload(path, commentImage, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
        imageUrl = urlData?.publicUrl || null;
      }
    }

    const insertData = { post_id: postId, author_id: currentUserId, content: newComment.trim(), tenant_id: tenantId };
    if (imageUrl) insertData.image_url = imageUrl;
    if (replyTo) insertData.parent_id = replyTo.id;

    const { error } = await supabase.from('comments').insert(insertData);
    if (!error) {
      setNewComment(''); setCommentImage(null); setCommentImagePreview(null); setReplyTo(null);
      loadComments();
      if (currentProfile?.role === 'fan') {
        supabase.rpc('award_stamps', { target_user_id: currentUserId, action_trigger_key: 'comment_created', p_tenant_id: tenantId }).catch(() => {});
      }
    }
    if (onCommentAdded) onCommentAdded();
    setPosting(false);
  };

  const topLevel = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

  const renderComment = (c, depth = 0) => {
    const prof = c.profiles || {};
    const isBand = prof.role === 'band';
    const displayName = isBand ? (prof.display_name || 'artist') : (prof.display_name || 'fan');
    const canDelete = c.author_id === currentUserId || currentProfile?.role === 'admin' || currentProfile?.role === 'band';
    const replies = getReplies(c.id);
    const indent = Math.min(depth, 2) * 16;

    const body = (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span onClick={() => onViewProfile && onViewProfile(c.author_id)} style={{ fontSize: 12, fontWeight: 600, color: INK, cursor: 'pointer' }}>{displayName?.toLowerCase()}</span>
          {isBand && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: RUBY, border: `1px solid ${RUBY}44`, padding: '0px 5px', borderRadius: 2 }}>artist</span>}
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '88', marginLeft: 'auto' }}>{timeAgo(c.created_at)}</span>
          <button onClick={() => setReplyTo({ id: c.id, name: displayName, authorId: c.author_id })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: SLATE + '55', fontSize: 10, fontFamily: "'DM Mono', monospace", padding: '0 2px' }}>reply</button>
          {canDelete && <button onClick={async () => { await supabase.from('comments').delete().eq('id', c.id); setComments(prev => prev.filter(x => x.id !== c.id && x.parent_id !== c.id)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: RUBY + '55', fontSize: 13, padding: '0 2px' }}>×</button>}
        </div>
        {c.content && <p style={{ fontSize: 12.5, color: INK + 'CC', lineHeight: 1.5, margin: 0 }}>{c.content}</p>}
        {c.image_url && <img src={c.image_url} alt="" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginTop: 6, display: 'block' }} />}
      </>
    );

    return (
      <div key={c.id}>
        <div style={{ paddingLeft: indent, padding: `8px 0 8px ${indent}px`, borderBottom: depth === 0 ? `1px solid ${BORDER}` : 'none' }}>
          {depth > 0 ? <div style={{ borderLeft: `2px solid ${BLUSH}44`, paddingLeft: 10 }}>{body}</div> : body}
        </div>
        {replies.map(r => renderComment(r, depth + 1))}
      </div>
    );
  };

  return (
    <div style={{ background: SURFACE, borderRadius: '0 0 10px 10px', padding: '16px', marginTop: -4, marginBottom: 10, border: `1px solid ${BORDER}`, borderTop: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, letterSpacing: '0.5px' }}>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: SLATE, fontFamily: "'DM Mono', monospace" }}>×</button>
      </div>
      {loading ? <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, padding: '8px 0' }}>loading...</div> : topLevel.map(c => renderComment(c, 0))}
      {replyTo && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: BLUSH + '22', borderRadius: 6, fontSize: 11, color: SLATE }}>
          <span>replying to <strong style={{ color: INK }}>{replyTo.name?.toLowerCase()}</strong></span>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: SLATE, fontSize: 13, marginLeft: 'auto' }}>×</button>
        </div>
      )}
      {commentImagePreview && (
        <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
          <img src={commentImagePreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 6, border: `1px solid ${BORDER}` }} />
          <button onClick={() => { setCommentImage(null); setCommentImagePreview(null); }} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: INK + 'CC', color: CREAM, border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
        <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleComment()}
          placeholder={replyTo ? `reply to ${replyTo.name?.toLowerCase()}...` : 'reply...'}
          style={{ flex: 1, padding: '9px 12px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
        <label style={{ cursor: 'pointer', padding: '4px 6px', color: SLATE + '88', fontSize: 13 }}>
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setCommentImage(f); const r = new FileReader(); r.onload = ev => setCommentImagePreview(ev.target.result); r.readAsDataURL(f); }} style={{ display: 'none' }} />+
        </label>
        <button onClick={handleComment} disabled={(!newComment.trim() && !commentImage) || posting} style={{ padding: '9px 14px', background: (newComment.trim() || commentImage) ? RUBY : BORDER, color: (newComment.trim() || commentImage) ? CREAM : SLATE + '66', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: (newComment.trim() || commentImage) ? 'pointer' : 'default' }}>
          {posting ? '...' : 'reply'}
        </button>
      </div>
    </div>
  );
}

// ============ POST CARD ============
function PostCard({ post, currentUserId, currentProfile, supabase, tenantId, memberMap, onRefresh, onViewProfile }) {
  const [liked, setLiked] = useState(post.user_has_liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const INK = 'var(--ink)'; const RUBY = 'var(--ruby)'; const SLATE = 'var(--slate)';
  const SURFACE = 'var(--surface)'; const BORDER = 'var(--border)'; const CREAM = 'var(--cream)';
  const WARM_GOLD = 'var(--warm-gold)'; const BLUSH = 'var(--blush)';

  const isBand = post.profiles?.role === 'band';
  const isAdmin = post.profiles?.role === 'admin';
  const memberKey = post.profiles?.band_member;
  const memberInfo = memberKey ? memberMap[memberKey] : null;
  const memberColor = memberInfo?.accentColor;
  const isOwnPost = post.author_id === currentUserId;
  const canModerate = currentProfile?.role === 'admin' || currentProfile?.role === 'band';
  const canDelete = isOwnPost || canModerate;
  const displayName = post.profiles?.display_name || 'unknown';

  const handleLike = async () => {
    if (!currentUserId) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(c => c + (newLiked ? 1 : -1));
    if (newLiked) {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: currentUserId, tenant_id: tenantId });
    } else {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', currentUserId);
    }
  };

  const handleDelete = async () => {
    await supabase.from('posts').delete().eq('id', post.id);
    setShowMenu(false);
    if (onRefresh) onRefresh();
  };

  const avatar = post.profiles?.avatar_url;

  return (
    <>
      <div style={{
        background: SURFACE, borderRadius: 10, padding: '18px 20px', marginBottom: showComments ? 0 : 10,
        border: `1px solid ${BORDER}`, position: 'relative',
        borderLeft: isBand && memberColor ? `3px solid ${memberColor}` : undefined,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {avatar && !isBand && !isAdmin ? (
            <img src={avatar} alt="" style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: 34, height: 34, borderRadius: 6,
              background: isBand && memberColor ? memberColor : (isBand || isAdmin) ? INK : BLUSH + '33',
              color: (isBand || isAdmin) ? CREAM : SLATE,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600,
            }}>{(isBand || isAdmin) ? '✦' : displayName.charAt(0).toLowerCase()}</div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span onClick={() => onViewProfile && onViewProfile(post.author_id)} style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: INK, cursor: 'pointer' }}>
                {isBand ? (memberInfo?.name?.toLowerCase() || displayName?.toLowerCase()) : displayName?.toLowerCase()}
              </span>
              {isBand && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, fontWeight: 500, color: memberColor || RUBY, border: `1px solid ${(memberColor || RUBY)}55`, padding: '1px 6px', borderRadius: 2, letterSpacing: '0.8px', textTransform: 'uppercase' }}>artist</span>}
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + '99' }}>{timeAgo(post.created_at)}</span>
          </div>
          {canDelete && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowMenu(!showMenu)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', fontFamily: "'DM Mono', monospace", fontSize: 16, color: SLATE + '55', lineHeight: 1 }}>···</button>
              {showMenu && (
                <div style={{ position: 'absolute', right: 0, top: 28, background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10, minWidth: 120 }}>
                  {canModerate && (
                    <button onClick={async () => { await supabase.from('posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id); onRefresh(); setShowMenu(false); }} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: WARM_GOLD, textAlign: 'left', fontFamily: "'DM Sans', sans-serif" }}>
                      {post.is_pinned ? 'unpin post' : 'pin post'}
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={handleDelete} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: RUBY, textAlign: 'left', fontFamily: "'DM Sans', sans-serif" }}>delete post</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, lineHeight: 1.65, color: INK + 'CC', margin: '0 0 14px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.content}</p>

        {(post.images && post.images.length > 1) ? (
          <div style={{ marginBottom: 14, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {post.images.map((url, i) => (
              <img key={i} src={url} alt="" onClick={() => setLightboxUrl(url)} style={{ width: post.images.length === 2 ? 'calc(50% - 2px)' : 'calc(33.33% - 3px)', height: 160, objectFit: 'cover', borderRadius: 6, border: `1px solid ${BORDER}`, cursor: 'pointer' }} />
            ))}
          </div>
        ) : post.image_url && (
          <div style={{ marginBottom: 14 }}>
            <img src={post.image_url} alt="" onClick={() => setLightboxUrl(post.image_url)} style={{ width: '100%', borderRadius: 6, border: `1px solid ${BORDER}`, cursor: 'pointer' }} />
          </div>
        )}

        {post.audio_url && (
          <div style={{ marginBottom: 14, background: CREAM, borderRadius: 10, padding: '12px 14px', border: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 16, color: RUBY }}>♫</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, letterSpacing: '0.5px' }}>audio</span>
            </div>
            <audio controls preload="metadata" style={{ width: '100%', height: 36, borderRadius: 8 }}>
              <source src={post.audio_url} />
            </audio>
          </div>
        )}

        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <button onClick={handleLike} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Mono', monospace", fontSize: 12, color: liked ? RUBY : SLATE + '88', fontWeight: liked ? 600 : 400, padding: 0 }}>
            <span style={{ fontSize: 14 }}>{liked ? '♥' : '♡'}</span>
            <span>{likeCount}</span>
          </button>
          <button onClick={() => setShowComments(!showComments)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Mono', monospace", fontSize: 12, color: showComments ? INK : SLATE + '88', padding: 0 }}>
            ↩ {commentCount}
          </button>
        </div>
      </div>

      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <img src={lightboxUrl} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 6, objectFit: 'contain' }} />
          <button onClick={() => setLightboxUrl(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 22, width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}

      {showComments && (
        <CommentsPanel
          postId={post.id} postAuthorId={post.author_id} supabase={supabase}
          currentUserId={currentUserId} currentProfile={currentProfile} tenantId={tenantId}
          onClose={() => setShowComments(false)} onCommentAdded={() => setCommentCount(c => c + 1)}
          onViewProfile={onViewProfile}
        />
      )}
    </>
  );
}

// ============ MAIN APP ============
export function FlockApp() {
  const { user, profile, signOut, supabase, tenantId, refreshProfile, updateProfile } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [mainTab, setMainTab] = useState('feed');
  const [feedView, setFeedView] = useState('community');
  const [posts, setPosts] = useState([]);
  const [shows, setShows] = useState({});
  const [stampActions, setStampActions] = useState([]);
  const [topCollectors, setTopCollectors] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [postImages, setPostImages] = useState([]);
  const [postImagePreviews, setPostImagePreviews] = useState([]);
  const [postAudio, setPostAudio] = useState(null);
  const [postAudioName, setPostAudioName] = useState(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [claimingLevel, setClaimingLevel] = useState(null);
  const [rewardClaims, setRewardClaims] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [checkinShow, setCheckinShow] = useState(null);
  const [checkinCode, setCheckinCode] = useState('');
  const [checkinStatus, setCheckinStatus] = useState('');
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [myAttendance, setMyAttendance] = useState(new Set());
  const [viewingProfile, setViewingProfile] = useState(null);
  const [STAMP_LEVELS, setStampLevels] = useState(DEFAULT_STAMP_LEVELS);
  const [memberMap, setMemberMap] = useState({});
  const [expandedRegion, setExpandedRegion] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Colours from CSS vars
  const INK = 'var(--ink)'; const CREAM = 'var(--cream)'; const RUBY = 'var(--ruby)';
  const BLUSH = 'var(--blush)'; const WARM_GOLD = 'var(--warm-gold)'; const SLATE = 'var(--slate)';
  const SURFACE = 'var(--surface)'; const BORDER = 'var(--border)';

  // Load tenant data
  useEffect(() => {
    if (!supabase || !tenantId) return;
    (async () => {
      const { data: t } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
      if (t) {
        const [configRes, membersRes] = await Promise.all([
          supabase.from('tenant_config').select('key, value').eq('tenant_id', tenantId),
          supabase.from('tenant_members').select('*').eq('tenant_id', tenantId).order('display_order'),
        ]);
        const config = {};
        (configRes.data || []).forEach(({ key, value }) => { config[key] = value; });
        const members = membersRes.data || [];
        const map = {};
        members.forEach(m => { map[m.slug] = { name: m.name, slug: m.slug, accentColor: m.accent_color || '#888', bio: m.bio || '' }; });
        setTenant({ ...t, config, members });
        setMemberMap(map);
      }
    })();
  }, [supabase, tenantId]);

  // Load stamp tiers
  useEffect(() => {
    if (!supabase || !tenantId) return;
    (async () => {
      const { data } = await supabase.from('reward_tiers').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('sort_order');
      if (data && data.length > 0) {
        setStampLevels(data.map(t => ({ name: t.name, key: t.key, stamps: t.stamps, icon: t.icon, reward: t.reward_type, rewardDesc: t.reward_desc })));
      }
    })();
  }, [supabase, tenantId]);

  const fetchPosts = useCallback(async (feed = feedView) => {
    if (!supabase || !tenantId) return;
    setLoadingPosts(true);
    try {
      let query = supabase.from('posts').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(30);
      if (feed !== 'community') query = query.eq('feed_type', feed);
      else query = query.eq('feed_type', 'community');

      const { data } = await query;
      if (!data) { setPosts([]); setLoadingPosts(false); return; }

      const authorIds = [...new Set(data.map(p => p.author_id))];
      let profileMap = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, display_name, role, band_member, avatar_url').in('id', authorIds);
        if (profiles) profiles.forEach(p => { profileMap[p.id] = p; });
      }

      let likedPostIds = new Set();
      if (user) {
        const { data: likes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id).eq('tenant_id', tenantId);
        if (likes) likedPostIds = new Set(likes.map(l => l.post_id));
      }

      const mapped = data.map(p => ({ ...p, profiles: profileMap[p.author_id] || null, user_has_liked: likedPostIds.has(p.id) }));
      mapped.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
      setPosts(mapped);
    } catch (e) { console.error('fetchPosts error:', e); setPosts([]); }
    setLoadingPosts(false);
  }, [feedView, user, supabase, tenantId]);

  const fetchShows = useCallback(async () => {
    if (!supabase || !tenantId) return;
    const { data } = await supabase.from('shows').select('*').eq('tenant_id', tenantId).order('date');
    if (data) {
      const grouped = {};
      data.forEach(show => {
        const region = show.region || 'other';
        if (!grouped[region]) grouped[region] = [];
        grouped[region].push(show);
      });
      setShows(grouped);
    }
    if (user) {
      const { data: att } = await supabase.from('show_attendance').select('show_id').eq('user_id', user.id).eq('tenant_id', tenantId);
      if (att) setMyAttendance(new Set(att.map(a => a.show_id)));
    }
  }, [supabase, user, tenantId]);

  const fetchStampData = useCallback(async () => {
    if (!supabase || !tenantId) return;
    const { data: actions } = await supabase.from('stamp_actions').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('points');
    if (actions) setStampActions(actions);
    const { data: topUsers } = await supabase.from('profiles').select('display_name, stamp_count').eq('tenant_id', tenantId).order('stamp_count', { ascending: false }).limit(5);
    if (topUsers) setTopCollectors(topUsers);
    if (user) {
      const { data: claims } = await supabase.from('reward_claims').select('*').eq('user_id', user.id).eq('tenant_id', tenantId);
      if (claims) setRewardClaims(claims);
    }
  }, [supabase, user, tenantId]);

  const fetchNotifications = useCallback(async () => {
    if (!user || !supabase || !tenantId) return;
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(30);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  }, [user, supabase, tenantId]);

  useEffect(() => { if (supabase && tenantId) fetchPosts(); }, [feedView, supabase, tenantId]);
  useEffect(() => {
    if (mainTab === 'shows') fetchShows();
    if (mainTab === 'stamps') fetchStampData();
    if (mainTab === 'you') refreshProfile();
    fetchNotifications();
  }, [mainTab]);

  const handlePost = async () => {
    if ((!newPost.trim() && postImages.length === 0 && !postAudio) || posting) return;
    setPosting(true);

    let imageUrl = null; let imageUrls = []; let audioUrl = null;

    for (const img of postImages) {
      const ext = img.name.split('.').pop();
      const fileName = `posts/${tenantId}/${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { data: uploadData, error } = await supabase.storage.from('media').upload(fileName, img, { cacheControl: '3600', upsert: false });
      if (!error && uploadData) {
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
        if (urlData?.publicUrl) imageUrls.push(urlData.publicUrl);
      }
    }
    if (imageUrls.length > 0) imageUrl = imageUrls[0];

    if (postAudio) {
      const ext = postAudio.name.split('.').pop();
      const fileName = `audio/${tenantId}/${user.id}-${Date.now()}.${ext}`;
      const { data: uploadData, error } = await supabase.storage.from('media').upload(fileName, postAudio, { cacheControl: '3600', upsert: false });
      if (!error && uploadData) {
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
        audioUrl = urlData?.publicUrl;
      }
    }

    const canPostToMemberFeed = profile?.role === 'band' && profile?.band_member === feedView;
    const canPostToAnyFeed = profile?.role === 'admin';
    const actualFeedType = feedView === 'community' || canPostToMemberFeed || canPostToAnyFeed ? feedView : 'community';

    const insertData = { author_id: user.id, content: newPost.trim() || '', feed_type: actualFeedType, image_url: imageUrl, tenant_id: tenantId };
    if (imageUrls.length > 1) insertData.images = imageUrls;
    if (audioUrl) insertData.audio_url = audioUrl;

    const { error } = await supabase.from('posts').insert(insertData);
    if (!error) {
      setNewPost(''); setPostImages([]); setPostImagePreviews([]); setPostAudio(null); setPostAudioName(null);
      if (profile?.role === 'fan') {
        supabase.rpc('award_stamps', { target_user_id: user.id, action_trigger_key: 'post_created', p_tenant_id: tenantId }).catch(() => {});
      }
      await fetchPosts();
      if (profile?.role === 'band' || profile?.role === 'admin') {
        fetch('/api/email/band-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, authorName: profile.display_name, content: newPost.trim(), feedType: actualFeedType }),
        }).catch(() => {});
      }
    }
    setPosting(false);
  };

  const handleCheckin = async () => {
    if (!checkinCode.trim() || !checkinShow || checkinLoading) return;
    setCheckinLoading(true);
    setCheckinStatus('');
    const { data, error } = await supabase.rpc('checkin_show', { p_show_id: checkinShow.id, p_code: checkinCode.trim(), p_tenant_id: tenantId });
    if (error) setCheckinStatus(error.message);
    else if (data === 'success') {
      setCheckinStatus('success');
      setMyAttendance(prev => new Set([...prev, checkinShow.id]));
      refreshProfile();
    } else setCheckinStatus(data);
    setCheckinLoading(false);
  };

  const userStamps = profile?.stamp_count || 0;
  const currentLevel = STAMP_LEVELS.slice().reverse().find(l => userStamps >= l.stamps) || STAMP_LEVELS[0];
  const nextLevel = STAMP_LEVELS.find(l => l.stamps > userStamps);
  const tenantName = tenant?.name || 'flock';
  const members = tenant?.members || [];
  const REGION_ORDER = ['australia', 'europe', 'uk', 'north_america'];

  const mainTabs = [
    { id: 'feed', label: 'feed', icon: '◎' },
    { id: 'shows', label: 'shows', icon: '♫' },
    { id: 'stamps', label: 'stamps', icon: '✦' },
    { id: 'you', label: 'you', icon: '○' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'DM Sans', sans-serif", color: INK }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {showEditProfile && <EditProfileModal profile={profile} supabase={supabase} tenantId={tenantId} onSave={updateProfile} onClose={() => setShowEditProfile(false)} />}
      {claimingLevel && <ClaimRewardModal level={claimingLevel} supabase={supabase} userId={user?.id} tenantId={tenantId} onClaimed={() => { setClaimingLevel(null); fetchStampData(); }} onClose={() => setClaimingLevel(null)} />}
      {viewingProfile && <UserProfileModal userId={viewingProfile} supabase={supabase} tenantId={tenantId} onClose={() => setViewingProfile(null)} stampLevels={STAMP_LEVELS} />}

      {/* Check-in Modal */}
      {checkinShow && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,26,26,0.6)', backdropFilter: 'blur(8px)', padding: 20 }} onClick={() => setCheckinShow(null)}>
          <div style={{ background: CREAM, borderRadius: 12, padding: '24px 18px', width: '100%', maxWidth: 340, animation: 'fadeIn 0.3s ease-out', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✦</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: INK, marginBottom: 4, textTransform: 'lowercase' }}>check in</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, marginBottom: 20 }}>{checkinShow.venue}, {checkinShow.city}</div>
            {checkinStatus === 'success' ? (
              <div style={{ padding: '16px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✦</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 4 }}>you're in!</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>+50 stamps earned</div>
                <button onClick={() => setCheckinShow(null)} style={{ marginTop: 16, padding: '10px 24px', background: INK, color: CREAM, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>nice ✦</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: SLATE, marginBottom: 16, lineHeight: 1.5 }}>enter the code shown at the venue</div>
                <input type="text" value={checkinCode} onChange={e => setCheckinCode(e.target.value.toUpperCase().slice(0, 6))} onKeyDown={e => e.key === 'Enter' && handleCheckin()} placeholder="CODE" maxLength={6}
                  style={{ width: 160, padding: '14px', background: SURFACE, border: `2px solid ${BORDER}`, borderRadius: 8, fontSize: 24, color: INK, outline: 'none', textAlign: 'center', fontFamily: "'DM Mono', monospace", fontWeight: 700, letterSpacing: '6px' }} autoFocus />
                {checkinStatus && checkinStatus !== 'success' && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginTop: 10 }}>{checkinStatus}</div>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                  <button onClick={() => setCheckinShow(null)} style={{ padding: '10px 20px', background: 'transparent', color: SLATE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>cancel</button>
                  <button onClick={handleCheckin} disabled={checkinLoading || !checkinCode.trim()} style={{ padding: '10px 20px', background: WARM_GOLD, color: INK, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: checkinLoading || !checkinCode.trim() ? 0.5 : 1 }}>
                    {checkinLoading ? '...' : 'check in ✦'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: CREAM + 'EE', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>{tenantName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications && user) { supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('tenant_id', tenantId).eq('is_read', false).then(() => setUnreadCount(0)); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', fontFamily: "'DM Mono', monospace", fontSize: 16, color: BLUSH, padding: '4px' }}>
              ◈
              {unreadCount > 0 && <span style={{ position: 'absolute', top: -2, right: -4, background: RUBY, color: '#fff', fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            <div onClick={() => setMainTab('stamps')} style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: RUBY, background: RUBY + '11', padding: '5px 12px', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>✦ {userStamps}</div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 100px', position: 'relative' }}>

        {/* Notifications panel */}
        {showNotifications && (
          <div style={{ background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}`, margin: '10px 0', padding: '4px 0', animation: 'fadeIn 0.2s ease-out', maxHeight: 360, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase' }}>notifications</span>
              <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: SLATE }}>×</button>
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>no notifications yet</div>
            ) : notifications.map(n => (
              <div key={n.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, background: n.is_read ? 'transparent' : WARM_GOLD + '08' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: n.type === 'stamp' ? WARM_GOLD : n.type === 'like' ? RUBY : SLATE, flexShrink: 0, marginTop: 1 }}>
                    {n.type === 'stamp' ? '✦' : n.type === 'like' ? '♥' : n.type === 'comment' ? '↩' : '◈'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: n.is_read ? 400 : 600, color: INK, lineHeight: 1.4 }}>{n.title}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '77', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FEED TAB */}
        {mainTab === 'feed' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* Feed tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginTop: 10, marginBottom: 14, background: SURFACE, borderRadius: '10px 10px 0 0', overflowX: 'auto' }}>
              <button onClick={() => setFeedView('community')} style={{ flex: 1, padding: '12px 6px 10px', background: feedView === 'community' ? SURFACE : 'transparent', border: 'none', borderBottom: feedView === 'community' ? `2.5px solid ${RUBY}` : '2.5px solid transparent', cursor: 'pointer', fontSize: 11, fontWeight: feedView === 'community' ? 700 : 500, color: feedView === 'community' ? INK : SLATE, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 16 }}>✦</span>everyone
              </button>
              {members.map(m => {
                const isActive = feedView === m.slug;
                return (
                  <button key={m.slug} onClick={() => setFeedView(m.slug)} style={{ flex: 1, padding: '12px 6px 10px', background: isActive ? SURFACE : 'transparent', border: 'none', borderBottom: isActive ? `2.5px solid ${m.accent_color || RUBY}` : '2.5px solid transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: isActive ? (m.accent_color || RUBY) : SLATE + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: isActive ? '#fff' : SLATE + '88', fontWeight: 700, fontFamily: "'DM Mono', monospace", transition: 'all 0.15s' }}>{m.name?.charAt(0)?.toLowerCase()}</div>
                    <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? (m.accent_color || RUBY) : SLATE }}>{m.name?.toLowerCase()}</span>
                  </button>
                );
              })}
            </div>

            {/* Post composer */}
            <div style={{ background: SURFACE, borderRadius: 10, padding: '14px 16px', marginBottom: 12, border: `1px solid ${BORDER}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: 6, objectFit: 'cover', marginTop: 2 }} />
                ) : (
                  <div style={{ width: 30, height: 30, borderRadius: 6, background: BLUSH + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontFamily: "'DM Mono', monospace", color: SLATE, marginTop: 2, flexShrink: 0 }}>
                    {profile?.display_name?.charAt(0)?.toLowerCase() || '○'}
                  </div>
                )}
                <textarea placeholder="say something..." value={newPost} onChange={e => setNewPost(e.target.value)}
                  rows={newPost.length > 80 || newPost.includes('\n') ? 4 : 1}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: INK, background: 'transparent', resize: 'none', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, padding: '4px 0' }} />
              </div>
              {postImagePreviews.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {postImagePreviews.map((preview, i) => (
                    <div key={i} style={{ position: 'relative', width: postImagePreviews.length === 1 ? '100%' : 'calc(50% - 3px)' }}>
                      <img src={preview} alt="" style={{ width: '100%', height: postImagePreviews.length === 1 ? 'auto' : 120, objectFit: 'cover', borderRadius: 6, border: `1px solid ${BORDER}`, display: 'block' }} />
                      <button onClick={() => { setPostImages(prev => prev.filter((_, j) => j !== i)); setPostImagePreviews(prev => prev.filter((_, j) => j !== i)); }} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: INK + 'CC', color: CREAM, border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              {postAudioName && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, background: CREAM, borderRadius: 8, padding: '8px 12px', border: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 14, color: RUBY }}>♫</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{postAudioName}</span>
                  <button onClick={() => { setPostAudio(null); setPostAudioName(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: SLATE + '88', padding: '0 2px' }}>×</button>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
                <label style={{ cursor: postImages.length >= 6 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px', color: postImages.length >= 6 ? SLATE + '33' : SLATE + '88', fontSize: 11, fontFamily: "'DM Mono', monospace' " }} title="add images">
                  <input type="file" accept="image/*" multiple onChange={e => {
                    const files = Array.from(e.target.files || []);
                    const toAdd = files.slice(0, 6 - postImages.length);
                    setPostImages(prev => [...prev, ...toAdd]);
                    toAdd.forEach(file => { const r = new FileReader(); r.onload = ev => setPostImagePreviews(prev => [...prev, ev.target.result]); r.readAsDataURL(file); });
                    e.target.value = '';
                  }} style={{ display: 'none' }} disabled={postImages.length >= 6} />
                  {postImages.length > 0 ? `📷 ${postImages.length}/6` : '📷'}
                </label>
                {(profile?.role === 'band' || profile?.role === 'admin') && (
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 6px', color: SLATE + '88', fontSize: 13, fontFamily: "'DM Mono', monospace'" }} title="add audio">
                    <input type="file" accept="audio/*,.m4a,.mp3,.wav,.aac,.ogg" onChange={e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 20 * 1024 * 1024) { alert('audio must be under 20MB'); return; } setPostAudio(f); setPostAudioName(f.name); }} style={{ display: 'none' }} />
                    ♫
                  </label>
                )}
                <button onClick={handlePost} disabled={posting || (!newPost.trim() && postImages.length === 0 && !postAudio)} style={{ background: (newPost.trim() || postImages.length > 0 || postAudio) ? RUBY : BORDER, border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 11, fontWeight: 600, color: (newPost.trim() || postImages.length > 0 || postAudio) ? CREAM : SLATE + '66', cursor: (newPost.trim() || postImages.length > 0 || postAudio) ? 'pointer' : 'default' }}>
                  {posting ? '...' : 'post'}
                </button>
              </div>
            </div>

            {loadingPosts ? (
              <div style={{ textAlign: 'center', padding: 40, fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE }}>loading...</div>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE, lineHeight: 1.6 }}>
                {feedView !== 'community' ? 'no posts here yet. check back soon ✦' : 'no posts yet. be the first ✦'}
              </div>
            ) : posts.map((post, i) => (
              <div key={post.id} style={{ animation: `fadeIn 0.35s ease-out ${i * 0.04}s both` }}>
                <PostCard post={post} currentUserId={user?.id} currentProfile={profile} supabase={supabase} tenantId={tenantId} memberMap={memberMap} onRefresh={fetchPosts} onViewProfile={id => setViewingProfile(id)} />
              </div>
            ))}
          </div>
        )}

        {/* SHOWS TAB */}
        {mainTab === 'shows' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out', paddingTop: 14 }}>
            <div style={{ background: INK, borderRadius: 10, padding: '28px 22px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 70% 30%, ${RUBY}22, transparent 60%)` }} />
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: WARM_GOLD, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 10, position: 'relative' }}>on the road</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 32, fontWeight: 700, color: CREAM, textTransform: 'lowercase', position: 'relative' }}>{tenantName}</div>
            </div>

            {Object.keys(shows).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, fontFamily: "'DM Mono', monospace", fontSize: 12, color: SLATE }}>no shows announced yet</div>
            ) : REGION_ORDER.filter(r => shows[r]).map(region => (
              <div key={region} style={{ marginBottom: 10 }}>
                <button onClick={() => setExpandedRegion(expandedRegion === region ? null : region)} style={{ width: '100%', background: expandedRegion === region ? INK : SURFACE, border: `1px solid ${BORDER}`, borderRadius: expandedRegion === region ? '8px 8px 0 0' : 8, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700, color: expandedRegion === region ? CREAM : INK, textTransform: 'lowercase' }}>{region.replace('_', ' ')}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: expandedRegion === region ? CREAM + '66' : SLATE }}>{shows[region].length} shows {expandedRegion === region ? '−' : '+'}</span>
                </button>
                {expandedRegion === region && (
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                    {shows[region].map((show, i) => {
                      const sold = show.status === 'sold_out';
                      const attended = myAttendance.has(show.id);
                      const isPast = new Date(show.date + 'T23:59:59') < new Date();
                      return (
                        <div key={show.id} style={{ padding: '13px 18px', borderBottom: i < shows[region].length - 1 ? `1px solid ${BORDER}` : 'none', opacity: isPast && !attended ? 0.45 : 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE, minWidth: 52 }}>{new Date(show.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{show.city}</div>
                              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + 'AA' }}>{show.venue}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {attended ? (
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: WARM_GOLD }}>✦ attended</span>
                              ) : isPast ? (
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '66' }}>past</span>
                              ) : show.checkin_code && !sold ? (
                                <button onClick={() => { setCheckinShow(show); setCheckinCode(''); setCheckinStatus(''); }} style={{ background: WARM_GOLD, color: INK, border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Mono', monospace'" }}>check in</button>
                              ) : sold ? (
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: RUBY }}>sold out</span>
                              ) : show.ticket_url ? (
                                <a href={show.ticket_url} target="_blank" rel="noopener noreferrer" style={{ background: INK, color: CREAM, border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 10, fontWeight: 600, textDecoration: 'none' }}>tickets</a>
                              ) : null}
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

        {/* STAMPS TAB */}
        {mainTab === 'stamps' && (
          <div style={{ animation: 'fadeIn 0.3s ease-out', paddingTop: 14 }}>
            <div style={{ background: INK, borderRadius: 10, padding: '30px 22px', textAlign: 'center', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${RUBY}15, transparent 70%)` }} />
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: WARM_GOLD, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12, position: 'relative' }}>your collection</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 56, fontWeight: 700, color: CREAM, position: 'relative' }}>{userStamps}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: CREAM + '77', marginTop: 6, position: 'relative' }}>stamps collected · {currentLevel.name}</div>
              {nextLevel && (
                <>
                  <div style={{ marginTop: 18, background: CREAM + '15', borderRadius: 2, height: 4, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: `${(userStamps / nextLevel.stamps) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${RUBY}, ${WARM_GOLD})`, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: CREAM + '55', marginTop: 6, position: 'relative' }}>{nextLevel.stamps - userStamps} to {nextLevel.name} {nextLevel.icon}</div>
                </>
              )}
            </div>

            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>your rewards</div>
            {STAMP_LEVELS.map(level => {
              const unlocked = userStamps >= level.stamps;
              const claimed = rewardClaims.some(c => c.level_key === level.key);
              const claimStatus = rewardClaims.find(c => c.level_key === level.key)?.status;
              return (
                <div key={level.key} style={{ background: unlocked ? SURFACE : CREAM, borderRadius: 10, padding: '16px 18px', marginBottom: 8, border: `1px solid ${unlocked ? WARM_GOLD + '33' : BORDER}`, opacity: unlocked ? 1 : 0.45 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 8, background: unlocked ? INK : BORDER, color: unlocked ? WARM_GOLD : SLATE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontFamily: "'DM Mono', monospace'" }}>{level.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>{level.name}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: unlocked ? WARM_GOLD : SLATE }}>{level.stamps > 0 ? `${level.stamps} ✦` : '✓'}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: SLATE, marginTop: 3, lineHeight: 1.4 }}>{level.rewardDesc}</div>
                    </div>
                  </div>
                  {unlocked && level.reward && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
                      {claimed ? (
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: WARM_GOLD }}>✦ {claimStatus || 'claimed'}</span>
                      ) : (
                        <button onClick={() => setClaimingLevel(level)} style={{ padding: '8px 16px', background: WARM_GOLD, color: INK, border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>claim reward ✦</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {stampActions.length > 0 && (
              <>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 18, marginBottom: 10 }}>earn stamps</div>
                <div style={{ background: SURFACE, borderRadius: 10, padding: '16px 18px', border: `1px solid ${BORDER}`, marginBottom: 18 }}>
                  {stampActions.map((action, i) => (
                    <div key={action.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < stampActions.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: SLATE, width: 20, textAlign: 'center' }}>{action.action_type === 'auto' ? '↗' : '★'}</span>
                      <span style={{ flex: 1, fontSize: 12, color: INK + 'CC' }}>{action.name}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: RUBY }}>+{action.points}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {topCollectors.length > 0 && (
              <>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>top collectors</div>
                <div style={{ background: SURFACE, borderRadius: 10, padding: '12px 18px', border: `1px solid ${BORDER}` }}>
                  {topCollectors.map((u, i) => (
                    <div key={u.display_name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < topCollectors.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: i === 0 ? WARM_GOLD : SLATE, width: 20, textAlign: 'center' }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: INK }}>{u.display_name?.toLowerCase()}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: SLATE }}>{u.stamp_count} ✦</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* YOU TAB */}
        {mainTab === 'you' && profile && (
          <div style={{ animation: 'fadeIn 0.3s ease-out', paddingTop: 14 }}>
            <div style={{ background: `linear-gradient(145deg, ${RUBY}15, ${BLUSH}15, ${SURFACE})`, borderRadius: 12, padding: '32px 22px 28px', textAlign: 'center', border: `1px solid ${BORDER}`, marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', margin: '0 auto 16px', display: 'block', border: `3px solid ${BLUSH}44` }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: 12, background: `linear-gradient(135deg, ${RUBY}22, ${BLUSH}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, margin: '0 auto 16px', color: RUBY, border: `3px solid ${BLUSH}33` }}>
                  {profile.display_name?.charAt(0)?.toLowerCase() || '✦'}
                </div>
              )}
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 24, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>{profile.display_name?.toLowerCase()}</div>
              {profile.bio && <p style={{ fontSize: 13, color: SLATE, marginTop: 8, lineHeight: 1.5, fontStyle: 'italic', maxWidth: 280, margin: '8px auto 0' }}>{profile.bio}</p>}
              {profile.city && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: BLUSH, marginTop: 6 }}>📍 {profile.city}</div>}
              <div style={{ display: 'inline-block', marginTop: 12, background: RUBY + '11', border: `1px solid ${RUBY}22`, borderRadius: 20, padding: '4px 14px' }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: RUBY }}>{currentLevel.icon} {currentLevel.name.toLowerCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 20 }}>
                <div><div style={{ fontSize: 28, fontWeight: 700, color: RUBY }}>{userStamps}</div><div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: SLATE, letterSpacing: 1.5, textTransform: 'uppercase' }}>stamps</div></div>
                <div><div style={{ fontSize: 28, fontWeight: 700, color: WARM_GOLD }}>{profile.show_count || 0}</div><div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: SLATE, letterSpacing: 1.5, textTransform: 'uppercase' }}>shows</div></div>
                <div><div style={{ fontSize: 28, fontWeight: 700, color: BLUSH }}>{profile.referral_count || 0}</div><div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: SLATE, letterSpacing: 1.5, textTransform: 'uppercase' }}>referrals</div></div>
              </div>
            </div>

            <div style={{ background: SURFACE, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              {(profile.role === 'admin' || profile.role === 'band') && (
                <div onClick={() => window.location.href = '/dashboard'} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', background: WARM_GOLD + '08' }}
                  onMouseEnter={e => e.currentTarget.style.background = WARM_GOLD + '15'}
                  onMouseLeave={e => e.currentTarget.style.background = WARM_GOLD + '08'}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: WARM_GOLD, width: 24, textAlign: 'center' }}>◈</span>
                  <span style={{ fontSize: 13, color: INK, flex: 1, fontWeight: 600 }}>dashboard</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", color: WARM_GOLD, fontSize: 14 }}>→</span>
                </div>
              )}
              <div onClick={() => setShowEditProfile(true)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = CREAM}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: SLATE, width: 24, textAlign: 'center' }}>✎</span>
                <span style={{ fontSize: 13, color: INK, flex: 1 }}>edit profile</span>
                <span style={{ fontFamily: "'DM Mono', monospace", color: SLATE + '55', fontSize: 14 }}>→</span>
              </div>

              {/* Referral */}
              {profile.referral_code && (
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: SLATE, width: 24, textAlign: 'center' }}>⊕</span>
                    <span style={{ fontSize: 13, color: INK, flex: 1, fontWeight: 600 }}>invite a friend</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="text" readOnly value={typeof window !== 'undefined' ? `${window.location.origin}/join/${profile.referral_code}` : '...'} style={{ flex: 1, padding: '8px 10px', background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 11, color: SLATE, fontFamily: "'DM Mono', monospace", outline: 'none' }} />
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join/${profile.referral_code}`).then(() => { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }); }} style={{ padding: '8px 14px', background: copiedLink ? WARM_GOLD : INK, color: CREAM, border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                      {copiedLink ? 'copied ✦' : 'copy'}
                    </button>
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: SLATE + '77', marginTop: 6 }}>you both earn 25 stamps when they join</div>
                </div>
              )}

              <div onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = CREAM}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: RUBY, width: 24, textAlign: 'center' }}>↪</span>
                <span style={{ fontSize: 13, color: RUBY, flex: 1 }}>sign out</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: SURFACE + 'F0', backdropFilter: 'blur(16px)', borderTop: `1px solid ${BORDER}`, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', justifyContent: 'space-around', padding: '6px 0 12px' }}>
          {mainTabs.map(tab => (
            <button key={tab.id} onClick={() => { setMainTab(tab.id); if (tab.id === 'feed') setFeedView('community'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 20px', minWidth: 56 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, color: mainTab === tab.id ? RUBY : SLATE + '66' }}>{tab.icon}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: mainTab === tab.id ? 500 : 400, color: mainTab === tab.id ? INK : SLATE + '66' }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
