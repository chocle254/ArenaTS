import type { User } from '@supabase/supabase-js';
import * as React from 'react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { getProfile } from '@/db/profile';
import { flushPendingGameAccounts } from '@/lib/pending-game-accounts';
import { claimSavedRefCode } from '@/lib/referral';
import type { Profile } from '@/types/database';

interface SignUpData {
  fullName: string;
  username: string;
  email: string;
  password: string;
  gamertag: string;
  location: string;
  timezone: string;
  favoriteGames: string[];
  twitchHandle?: string;
  efootballId?: string;
  pubgId?: string;
  gameAccounts?: { game: string; inGameName: string }[];
  /** Invite code from a friend's link; the server links the two accounts */
  referralCode?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (usernameOrEmail: string, password: string) => Promise<string>;
  signUp: (email: string, password: string) => Promise<void>;
  signUpWithProfile: (data: SignUpData) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithDiscord: () => Promise<void>;
  signInWithTwitch: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refreshProfile = React.useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const profileData = await getProfile(user.id);
    setProfile(profileData);
  }, [user]);

  // Keep the logged-in user stable across token refreshes so that consumers
  // depending on `user` don't tear down and rebuild subscriptions every hour.
  const applySessionUser = React.useCallback((next: User | null, force = false) => {
    setUser((prev) => {
      if (!force && prev && next && prev.id === next.id) return prev;
      return next;
    });
  }, []);

  React.useEffect(() => {
    // ── Initial session fetch ──────────────────────────────
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySessionUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
      }
      setLoading(false);
    });

    // ── Auth state changes (login / logout / token refresh) ─
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        applySessionUser(session?.user ?? null, event === 'USER_UPDATED');
        if (!session?.user) {
          setProfile(null);
          return;
        }
        // Token refreshes don't change the profile; skip the extra request.
        if (event !== 'TOKEN_REFRESHED') {
          getProfile(session.user.id).then(setProfile);
        }
      }
    );

    return () => {
      authSubscription.unsubscribe();
    };
  }, [applySessionUser]);

  const userId = user?.id;

  // Save in-game names entered at sign-up once the player has a session
  React.useEffect(() => {
    if (!user) return;
    flushPendingGameAccounts(user.id, user.email).catch(() => {});
    // Google/Discord/Twitch sign-ups: apply the invite code saved from the link
    claimSavedRefCode(user.created_at).then((ok) => {
      if (ok) toast.success('Invite code added. You and your friend get a ticket bonus after your first deposit.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Real-time profile row subscription ─────────────────
  // Keeps balances and stats live (wins, earnings, arena currency) for
  // whoever is signed in — including users who sign in after page load.
  React.useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`profile-updates-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          setProfile((prev) => ({ ...(prev || {}), ...(payload.new as Profile) }) as Profile);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const signIn = React.useCallback(async (usernameOrEmail: string, password: string) => {
    let email = usernameOrEmail.trim();
    // Emails are private, so there's no gamertag-to-email lookup. Very old
    // accounts created with a username only used this address format.
    if (!email.includes('@')) {
      email = `${email}@miaoda.com`;
    }
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return email;
  }, []);

  const signUp = React.useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/sign-in?confirmed=true`
      }
    });
    if (error) throw error;
  }, []);

  const signUpWithProfile = React.useCallback(async (data: SignUpData) => {
    // Use provided email or convert username to email format
    const email = data.email || `${data.username}@miaoda.com`;
    
    // Sign up with metadata
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/sign-in?confirmed=true`,
        data: {
          full_name: data.fullName,
          username: data.username,
          gamertag: data.gamertag,
          location: data.location,
          timezone: data.timezone,
          favorite_games: data.favoriteGames,
          twitch_handle: data.twitchHandle,
          efootball_id: data.efootballId,
          pubg_id: data.pubgId,
          referral_code: data.referralCode || undefined
        }
      }
    });

    if (signUpError) throw signUpError;
    if (!authData.user) throw new Error('Failed to create user');

    // Insert game accounts if provided
    if (data.gameAccounts && data.gameAccounts.length > 0) {
      const gameAccountsData = data.gameAccounts.map(account => ({
        user_id: authData.user!.id,
        game: account.game,
        in_game_name: account.inGameName
      }));

      const { error: gameAccountsError } = await supabase
        .from('game_accounts')
        .insert(gameAccountsData);

      if (gameAccountsError) {
        console.error('Failed to insert game accounts:', gameAccountsError);
        // Don't throw error, just log it
      }
    }
  }, []);

  const signInWithGoogle = React.useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    if (data?.url) window.location.href = data.url;
  }, []);

  const signInWithDiscord = React.useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  }, []);

  const signInWithTwitch = React.useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  }, []);

  const signOut = React.useCallback(async () => {
    setUser(null);
    setProfile(null);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out from Supabase:', error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signIn, 
      signUp, 
      signUpWithProfile, 
      signInWithGoogle, 
      signInWithDiscord, 
      signInWithTwitch, 
      signOut, 
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
