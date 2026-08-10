import type { User } from '@supabase/supabase-js';
import * as React from 'react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { getProfile } from '@/db/profile';
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
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (usernameOrEmail: string, password: string) => Promise<void>;
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

  React.useEffect(() => {
    // ── Initial session fetch ──────────────────────────────
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
      }
      setLoading(false);
    });

    // ── Auth state changes (login / logout / token refresh) ─
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          getProfile(session.user.id).then(setProfile);
        } else {
          setProfile(null);
        }
      }
    );

    // ── Real-time profile row subscription ─────────────────
    // Fires whenever the current user's profile row is updated
    // in the database — wins, losses, earnings, tournaments_played etc.
    // This means stats reflect immediately after a tournament ends
    // without requiring a logout.
    let profileSubscription: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      profileSubscription = supabase
        .channel(`profile-updates-${session.user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${session.user.id}`,
          },
          (payload) => {
            // Update profile state directly from the realtime payload
            // No extra fetch needed — the payload contains the new row
            setProfile(payload.new as Profile);
          }
        )
        .subscribe();
    });

    // ── Cleanup all subscriptions on unmount ───────────────
    return () => {
      authSubscription.unsubscribe();
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription);
      }
    };
  }, []);

  const signIn = React.useCallback(async (usernameOrEmail: string, password: string) => {
    let email = usernameOrEmail;
    
    // If input doesn't contain @, it's a username or gamertag - convert to email format
    if (!usernameOrEmail.includes('@')) {
      // Try to find user by username or gamertag
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .or(`username.eq.${usernameOrEmail},gamertag.eq.${usernameOrEmail}`)
        .maybeSingle();
      
      if (profileData && profileData.email) {
        email = profileData.email;
      } else {
        // Fallback to default email format for legacy or unknown accounts
        email = `${usernameOrEmail}@miaoda.com`;
      }
    }
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
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
          pubg_id: data.pubgId
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
    const { data, error } = await supabase.auth.signInWithSSO({
      domain: 'miaoda-gg.com',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    if (data?.url) window.open(data.url, '_self');
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
