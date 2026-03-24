'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { LandingPage } from '@/components/LandingPage';
import { FlockApp } from '@/components/FlockApp';

export default function Home() {
  const { user, loading, tenantId } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { if (loading) setTimedOut(true); }, 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  // No tenant = either root domain or tenant failed to resolve
  // Show landing page rather than redirecting (avoids loops)
  if (!tenantId) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5EFE6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1018', marginBottom: 8, textTransform: 'lowercase' }}>flock</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#6A5A62', marginBottom: 24 }}>fan communities for independent artists</div>
          <a href="/start" style={{ background: '#8B1A2B', color: '#fff', padding: '12px 28px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>get started</a>
        </div>
      </div>
    );
  }

  if (loading && !timedOut) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: 'var(--slate)', animation: 'fadeIn 0.5s ease-out' }}>✦</div>
      </div>
    );
  }

  if (!user) return <LandingPage />;
  return <FlockApp />;
}
