'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { LandingPage } from '@/components/LandingPage';
import { FlockApp } from '@/components/FlockApp';

export default function Home() {
    const { user, loading } = useAuth();
    const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
        const timer = setTimeout(() => {
                if (loading) setTimedOut(true);
        }, 3000);
        return () => clearTimeout(timer);
  }, [loading]);

  if (loading && !timedOut) {
        return (
                <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: 'var(--slate)' }}>✦</div>
  </div>
    );
}

  if (!user) return <LandingPage />;
      return <FlockApp />;
    }
