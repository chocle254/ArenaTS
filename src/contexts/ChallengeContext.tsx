import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { IncomingChallengeModal } from '@/components/IncomingChallengeModal';
import { AuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { buzz } from '@/lib/utils';

interface Challenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  challenger_team_id: string | null;
  opponent_team_id: string | null;
  game: string;
  stake_amount: number;
  prize_pool: number;
  platform_fee: number;
  expires_at: string;
  accepted_at: string | null;
  status: string;
  created_at: string;
  both_players_ready: boolean;
  challenger_checked_in: boolean;
  opponent_checked_in: boolean;
  check_in_deadline: string | null;
  match_started_at: string | null;
  match_deadline: string | null;
}

interface ChallengeWithProfiles extends Challenge {
  challenger: {
    gamertag: string;
    avatar_url: string | null;
    wins: number;
    losses: number;
  };
  opponent: {
    gamertag: string;
    avatar_url: string | null;
    wins: number;
    losses: number;
  };
}

interface ChallengeContextType {
  pendingChallenges: Challenge[];
  activeChallenges: Challenge[];
  unreadCount: number;
  refreshChallenges: () => Promise<void>;
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
  const auth = useContext(AuthContext);
  const userId = auth?.user?.id;
  const [pendingChallenges, setPendingChallenges] = useState<Challenge[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [currentChallenge, setCurrentChallenge] = useState<ChallengeWithProfiles | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  // Refs instead of state in the fetch callback, so opening/closing the modal
  // doesn't recreate the realtime subscription and immediately re-open it.
  const modalOpenRef = React.useRef(false);
  modalOpenRef.current = modalOpen;
  const dismissedIdsRef = React.useRef<Set<string>>(new Set());

  const fetchChallenges = useCallback(async () => {
    if (!userId) return;

    try {
      // Expire old challenges in the background — don't block UI.
      // (.then() is required: an un-awaited Supabase query is never sent.)
      supabase.rpc('expire_old_challenges').then(({ error }) => {
        if (error) console.error('Error expiring challenges:', error);
      });

      // Fetch pending and active challenges in parallel
      const [
        { data: pendingData, error: pendingError },
        { data: activeData, error: activeError },
      ] = await Promise.all([
        supabase
          .from('challenges')
          .select('*')
          .eq('opponent_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('challenges')
          .select('*')
          .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
          .in('status', ['accepted', 'disputed', 'disputed_warning'])
          .order('accepted_at', { ascending: false }),
      ]);

      if (pendingError) throw pendingError;
      if (activeError) throw activeError;

      const now = new Date();
      const validPendingData = (pendingData || []).filter(c => new Date(c.expires_at) > now);
      setPendingChallenges(validPendingData);
      setActiveChallenges(activeData || []);

      // Show the newest pending challenge the player hasn't already dismissed
      const next = validPendingData.find((c) => !dismissedIdsRef.current.has(c.id));
      if (next && !modalOpenRef.current) {
        await loadChallengeWithProfiles(next);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    }
  }, [userId]);

  const loadChallengeWithProfiles = useCallback(async (challenge: Challenge) => {
    try {
      // Fetch both profiles in parallel
      const [
        { data: challengerProfile },
        { data: opponentProfile },
      ] = await Promise.all([
        supabase.from('profiles').select('gamertag, avatar_url, wins, losses').eq('id', challenge.challenger_id).maybeSingle(),
        supabase.from('profiles').select('gamertag, avatar_url, wins, losses').eq('id', challenge.opponent_id).maybeSingle(),
      ]);

      if (challengerProfile && opponentProfile) {
        setCurrentChallenge({
          ...challenge,
          challenger: {
            gamertag: challengerProfile.gamertag || 'Unknown',
            avatar_url: challengerProfile.avatar_url,
            wins: challengerProfile.wins || 0,
            losses: challengerProfile.losses || 0
          },
          opponent: {
            gamertag: opponentProfile.gamertag || 'Unknown',
            avatar_url: opponentProfile.avatar_url,
            wins: opponentProfile.wins || 0,
            losses: opponentProfile.losses || 0
          }
        });
        setModalOpen(true);
        try {
          buzz([60, 40, 60]);
        } catch {
          /* not supported */
        }
      }
    } catch (error) {
      console.error('Error loading challenge profiles:', error);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchChallenges();

      // Subscribe to all challenge changes for current user
      const channel = supabase
        .channel(`challenges-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'challenges',
            filter: `opponent_id=eq.${userId}`
          },
          () => {
            fetchChallenges();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'challenges',
            filter: `challenger_id=eq.${userId}`
          },
          () => {
            fetchChallenges();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setPendingChallenges([]);
      setActiveChallenges([]);
      setModalOpen(false);
      setCurrentChallenge(null);
    }
  }, [userId, fetchChallenges]);

  const handleModalClose = useCallback(() => {
    if (currentChallenge) dismissedIdsRef.current.add(currentChallenge.id);
    setModalOpen(false);
    setCurrentChallenge(null);

    // Offer the next pending challenge the player hasn't seen yet
    const next = pendingChallenges.find(
      (c) => c.id !== currentChallenge?.id && !dismissedIdsRef.current.has(c.id) && new Date(c.expires_at) > new Date()
    );
    if (next) {
      setTimeout(() => {
        loadChallengeWithProfiles(next);
      }, 500);
    }
  }, [currentChallenge, pendingChallenges, loadChallengeWithProfiles]);

  return (
    <ChallengeContext.Provider
      value={{
        pendingChallenges,
        activeChallenges,
        unreadCount: pendingChallenges.length,
        refreshChallenges: fetchChallenges
      }}
    >
      {children}
      
      <IncomingChallengeModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        challenge={currentChallenge}
      />
    </ChallengeContext.Provider>
  );
}

export function useChallenges() {
  const context = useContext(ChallengeContext);
  if (context === undefined) {
    throw new Error('useChallenges must be used within a ChallengeProvider');
  }
  return context;
}
