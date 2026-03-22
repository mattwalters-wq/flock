'use client';
import { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { getSupabase } from '@/lib/supabase-browser';

const AuthContext = createContext({});

export function AuthProvider({ children, tenantId }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);
  const supabase = getSupabase();

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .single();
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

  const signInWithEmail = async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signUpWithEmail = async (email, password, displayName) => {
    return await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName, tenant_id: tenantId } },
    });
  };

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
    if (!user) return { error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    if (data) setProfile(data);
    return { data, error };
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      if (p) setProfile(p);
    }
  };

  const value = useMemo(() => ({
    user, profile, loading, tenantId, supabase,
    signInWithEmail, signUpWithEmail, signInWithGoogle,
    signOut, updateProfile, refreshProfile,
  }), [user, profile, loading, tenantId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
