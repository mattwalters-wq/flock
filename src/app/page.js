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

  // No tenant = root domain, but we shouldn't reach here since
  // root domain serves the marketing page via layout redirect
  if (!tenantId) {
    if (typeof window !== 'undefined') {
      window.location.href = '/start';
    }
    return null;
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
