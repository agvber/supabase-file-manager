import { useState, useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabaseClient';
import { subscribeConfig } from '../lib/config';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubAuth: (() => void) | null = null;

    function init() {
      const supabase = getSupabase();
      if (!supabase) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      });

      unsubAuth = () => listener.subscription.unsubscribe();
    }

    init();

    const unsubConfig = subscribeConfig(() => {
      if (unsubAuth) {
        unsubAuth();
        unsubAuth = null;
      }
      init();
    });

    return () => {
      unsubConfig();
      if (unsubAuth) unsubAuth();
    };
  }, []);

  const signIn = async (identifier: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase 설정이 필요합니다.');
    const trimmed = identifier.trim();
    const looksLikeEmail = trimmed.includes('@');
    // Try the most likely method first; if "Invalid login credentials", retry as the other.
    const first = looksLikeEmail
      ? await supabase.auth.signInWithPassword({ email: trimmed, password })
      : await supabase.auth.signInWithPassword({ phone: trimmed, password });
    if (!first.error) return;
    if (!/invalid/i.test(first.error.message)) throw new Error(first.error.message);
    const second = looksLikeEmail
      ? await supabase.auth.signInWithPassword({ phone: trimmed, password })
      : await supabase.auth.signInWithPassword({ email: trimmed, password });
    if (second.error) throw new Error(second.error.message);
  };

  const signOut = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return { session, user, loading, signIn, signOut };
}
