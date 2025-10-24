import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../utils/supabase'
import type { Session, User } from '@supabase/supabase-js'
import { actions } from '../store';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // ✅ ИСПРАВЛЕНИЕ: Используем ref для предотвращения пересоздания функции
  const cleanupExecutedRef = useRef(false);

  const cleanupAndReset = useCallback(() => {
    if (cleanupExecutedRef.current) return;
    
    console.log('[AuthProvider] Cleaning up session and resetting store.');
    cleanupExecutedRef.current = true;
    
    supabase.removeAllChannels(); 
    actions.resetStore();
    setUser(null);
    setSession(null);
    
    // Сбрасываем флаг через небольшую задержку
    setTimeout(() => {
      cleanupExecutedRef.current = false;
    }, 100);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (mounted) {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setIsLoading(false);
        setIsInitialized(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        console.log(`[AuthProvider] Auth event: ${event}`);

        if (event === 'SIGNED_OUT') {
          cleanupAndReset();
        } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          setSession(newSession);
          setUser(newSession?.user ?? null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [cleanupAndReset]);

  const value = {
    user,
    session,
    isLoading,
    isInitialized,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};