'use client';
import { useState } from 'react';

const INK = '#1A1018';
const CREAM = '#F5EFE6';
const RUBY = '#8B1A2B';
const SLATE = '#6A5A62';
const SURFACE = '#FAF5F0';
const BORDER = '#E8DDD4';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) { setError('all fields are required'); return; }
    if (!email.includes('@')) { setError('please enter a valid email'); return; }
    setSending(true); setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        setError('something went wrong, please try again');
      }
    } catch (e) {
      setError('something went wrong, please try again');
    }
    setSending(false);
  };

  const fieldStyle = {
    width: '100%', padding: '12px 14px', background: SURFACE, border: `1px solid ${BORDER}`,
    borderRadius: 8, fontSize: 14, color: INK, outline: 'none', fontFamily: "'DM Sans', sans-serif",
    boxSizing: 'border-box',
  };
  const labelStyle = {
    fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE,
    letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  };

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'DM Sans', sans-serif", color: INK }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <a href="/" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 700, color: INK, textDecoration: 'none', textTransform: 'lowercase' }}>flock</a>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: INK, marginBottom: 8 }}>get in touch</h1>
        <p style={{ fontSize: 14, color: SLATE, lineHeight: 1.6, marginBottom: 32 }}>
          questions, feedback, partnership ideas, or just want to say hi. we'd love to hear from you.
        </p>

        {sent ? (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>✦</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: INK, marginBottom: 8 }}>message sent</div>
            <div style={{ fontSize: 13, color: SLATE, lineHeight: 1.6 }}>thanks for reaching out. we'll get back to you soon.</div>
            <a href="/" style={{ display: 'inline-block', marginTop: 24, fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, textDecoration: 'none' }}>← back to flock</a>
          </div>
        ) : (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '28px 24px' }}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="your name" style={fieldStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={fieldStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="what's on your mind?" rows={5}
                style={{ ...fieldStyle, resize: 'vertical', minHeight: 100, lineHeight: 1.6 }} />
            </div>
            {error && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: RUBY, marginBottom: 12 }}>{error}</div>}
            <button onClick={submit} disabled={sending}
              style={{ width: '100%', padding: '12px', background: INK, color: CREAM, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: sending ? 0.6 : 1 }}>
              {sending ? 'sending...' : 'send message'}
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a href="/" style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE + '88', textDecoration: 'none', letterSpacing: '1px' }}>fans-flock.com</a>
        </div>
      </div>
    </div>
  );
}
