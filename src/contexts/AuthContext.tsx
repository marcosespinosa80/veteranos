import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: { nombre: string; apellido: string; equipo_id: string | null } | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const loadedUserIdRef = useRef<string | null>(null);
  const requestRef = useRef(0);

  const clearUserState = useCallback(() => {
    loadedUserIdRef.current = null;
    requestRef.current += 1;
    setProfile(null);
    setRole(null);
  }, []);

  const fetchProfileAndRole = useCallback(async (userId: string) => {
    const requestId = ++requestRef.current;

    try {
      const profileRes = await supabase
        .from('profiles')
        .select('nombre, apellido, equipo_id')
        .eq('id', userId)
        .maybeSingle();

      const roleRes = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (!mountedRef.current || requestId !== requestRef.current) return;

      if (profileRes.error) {
        console.error('Error fetching profile:', profileRes.error);
      }

      if (roleRes.error) {
        console.error('Error fetching role:', roleRes.error);
      }

      setProfile(profileRes.data ?? null);
      setRole((roleRes.data?.role as UserRole | undefined) ?? null);
    } catch (err) {
      console.error('Error fetching profile/role:', err);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const syncAuthState = async (nextSession: Session | null, forceRefresh = false) => {
      if (!mountedRef.current) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      const nextUserId = nextSession?.user?.id ?? null;

      if (!nextUserId) {
        clearUserState();
        if (mountedRef.current) setLoading(false);
        return;
      }

      if (!forceRefresh && loadedUserIdRef.current === nextUserId) {
        if (mountedRef.current) setLoading(false);
        return;
      }

      loadedUserIdRef.current = nextUserId;
      await fetchProfileAndRole(nextUserId);

      if (mountedRef.current) {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mountedRef.current) return;

      if (event === 'TOKEN_REFRESHED') {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        return;
      }

      void syncAuthState(nextSession, event === 'SIGNED_IN' || event === 'USER_UPDATED');
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void syncAuthState(session);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [clearUserState, fetchProfileAndRole]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
