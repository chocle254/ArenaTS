import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { invalidatePlayerProgress } from '@/hooks/use-player-progress';
import { formatArenaCurrency } from '@/lib/arena-currency';
import type { Tournament } from '@/types/database';

export interface PendingConsent {
  title: string;
  description: string;
  amount: number;
  onConfirm: () => void;
}

/** Turn database errors into something a player can act on. */
export function friendlyJoinError(error: unknown): string {
  const e = error as { message?: string; details?: string; code?: string } | null;
  const msg = `${e?.message || ''} ${e?.details || ''}`.toLowerCase();
  if (e?.code === '23505' || msg.includes('duplicate')) return "You're already registered for this tournament.";
  if (msg.includes('insufficient')) return 'Not enough in your play balance. Top up with M-Pesa in your wallet.';
  if (msg.includes('unauthorized attempt to modify')) return 'Joining failed because of a balance check. Please try again from the tournament page.';
  return e?.message || 'Could not join the tournament. Please try again.';
}

/**
 * Single source of truth for joining a solo tournament.
 *
 * The entry fee, transaction record and player count are all handled by the
 * database triggers on tournament_participants (tr_tournament_join_fee and
 * update_tournament_participant_count). The client must NOT deduct the fee
 * itself — the old dashboard card did, which failed for regular players and
 * double-charged admins.
 */
export function useJoinTournament() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [consent, setConsent] = useState<PendingConsent | null>(null);

  const insertParticipant = useCallback(
    async (tournament: Tournament, isStandby: boolean): Promise<boolean> => {
      if (!user) return false;
      setJoiningId(tournament.id);
      try {
        const gamertag = profile?.gamertag || user.email?.split('@')[0] || 'Player';
        const { error } = await supabase.from('tournament_participants').insert({
          tournament_id: tournament.id,
          user_id: user.id,
          gamertag,
          checked_in: false,
          is_standby: isStandby,
          amount_paid: tournament.entry_fee || 0,
        });
        if (error) throw error;
        invalidatePlayerProgress(user.id);
        await refreshProfile();
        toast.success(isStandby ? `You're on the standby list for ${tournament.name}` : `You're in! ${tournament.name}`, {
          description: isStandby ? "We'll slot you in if someone doesn't check in." : 'Turn on a reminder so you don’t miss check-in.',
        });
        setConsent(null);
        return true;
      } catch (error) {
        console.error('Error joining tournament:', error);
        toast.error(friendlyJoinError(error));
        return false;
      } finally {
        setJoiningId(null);
      }
    },
    [user, profile?.gamertag, refreshProfile],
  );

  /**
   * Start the join flow from a card. Returns true if it joined straight away.
   * Team tournaments and players without an in-game ID go to the detail page,
   * which has the team form and the game-ID prompt.
   */
  const startJoin = useCallback(
    async (tournament: Tournament) => {
      if (!user) {
        navigate('/sign-in');
        return;
      }
      if (joiningId) return;

      if ((tournament.team_size || 1) > 1) {
        navigate(`/tournaments/${tournament.id}?join=1`);
        return;
      }

      const { data: account } = await supabase
        .from('game_accounts')
        .select('id, in_game_name')
        .eq('user_id', user.id)
        .eq('game', tournament.game)
        .maybeSingle();
      if (!account?.in_game_name) {
        navigate(`/tournaments/${tournament.id}?join=1`);
        return;
      }

      const entryFee = tournament.entry_fee || 0;
      const isStandby = (tournament.current_players || 0) >= (tournament.max_players || Infinity);

      if (entryFee > 0) {
        const balance = profile?.arena_currency || 0;
        if (balance < entryFee) {
          toast.error(`You need ${formatArenaCurrency(entryFee)} to join`, {
            description: `Your balance is ${formatArenaCurrency(balance)}.`,
            action: { label: 'Top up', onClick: () => navigate('/wallet') },
          });
          return;
        }
        setConsent({
          title: `Join ${tournament.name}`,
          description: isStandby
            ? 'Main spots are full, so you will join the standby list. The entry fee comes out of your play balance.'
            : 'The entry fee comes out of your play balance.',
          amount: entryFee,
          onConfirm: () => {
            void insertParticipant(tournament, isStandby);
          },
        });
        return;
      }

      await insertParticipant(tournament, isStandby);
    },
    [user, profile?.arena_currency, joiningId, navigate, insertParticipant],
  );

  return { startJoin, joiningId, consent, setConsent, insertParticipant };
}
