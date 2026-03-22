'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';

// Full FlockApp component - placeholder for build
// TODO: Restore full component from git history (ce65456)
export function FlockApp() {
    const { user, profile, loading, signOut, tenantId } = useAuth();

  const INK = 'var(--ink)';
    const CREAM = 'var(--cream)';
    const RUBY = 'var(--ruby)';
    const SLATE = 'var(--slate)';
    const SURFACE = 'var(--surface)';
    const BORDER = 'var(--border)';

  if (loading) {
        return (
                <div style={{ minHeight: '100vh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: SLATE }}>✦</div>
  </div>
    );
}

  return (
        <div style={{ minHeight: '100vh', background: CREAM, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: INK, textTransform: 'lowercase' }}>✦ flock</div>
          <button onClick={signOut} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}>sign out</button>
    </div>
        <div style={{ background: SURFACE, borderRadius: 12, padding: 20, border: `1px solid ${BORDER}` }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: SLATE, marginBottom: 8, letterSpacing: '0.5px' }}>welcome back</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: INK }}>{profile?.display_name || user?.email || 'fan'}</div>
    </div>
    </div>
    </div>
  );
}
