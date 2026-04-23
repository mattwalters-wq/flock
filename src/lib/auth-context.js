'use client';
import { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { getSupabase } from '@/lib/supabase-browser';

const AuthContext = createContext({});

export function AuthProvider({ children, tenantId: serverTenantId }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState(serverTenantId || null);
  const mounted = useRef(false);
  const supabase = getSupabase();

  // Resolve tenant client-side from subdomain - doesn't depend on server headers
  useEffect(() => {
    if (tenantId) return; // already set from server
    const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'fans-flock.com';
    const host = window.location.hostname;
    if (host.endsWith(`.${APP_DOMAIN}`)) {
      const slug = host.replace(`.${APP_DOMAIN}`, '');
      supabase.from('tenants').select('id').eq('slug', slug).single().then(({ data }) => {
        if (data?.id) setTenantId(data.id);
      });
    }
  }, []);

  const fetchProfile = async (userId, tid) => {
    const id = tid || tenantId;
    if (!id) return null;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .eq('tenant_id', id)
      .maybeSingle();
    return data;
  };

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const p = await fetchProfile(u.id);
        setProfile(p);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const p = await fetchProfile(u.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Re-fetch profile once tenantId resolves (client-side resolution case)
  useEffect(() => {
    if (!tenantId || !user || profile) return;
    fetchProfile(user.id, tenantId).then(p => { if (p) setProfile(p); });
  }, [tenantId, user]);

  const signInWithGoogle = async () => {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates) => {
    if (!user || !tenantId) return { error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .eq('tenant_id', tenantId)
      .select()
      .maybeSingle();
    if (data) setProfile(data);
    return { data, error };
  };

  const refreshProfile = async () => {
    if (user && tenantId) {
      const p = await fetchProfile(user.id, tenantId);
      if (p) setProfile(p);
    }
  };

  const value = useMemo(() => ({
    user, profile, loading, tenantId, supabase,
    signInWithGoogle, signOut, updateProfile, refreshProfile,
  }), [user, profile, loading, tenantId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
