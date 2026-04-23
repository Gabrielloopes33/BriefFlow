import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@shared/supabase";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth error:', error);
        }

        if (session?.user) {
          setUser(session.user);
          setSession(session);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Auth check error:', err);
        setLoading(false);
      }
    };

    checkAuth();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setSession(session);
      } else {
        setUser(null);
        setSession(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const refetch = () => {
    setLoading(true);
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setSession(session);
      } else {
        setUser(null);
        setSession(null);
      }
      setLoading(false);
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setLocation('/');
  };

  return {
    user,
    session,
    isLoading: loading,
    isAuthenticated: !!user,
    logout,
    refetch,
  };
}
