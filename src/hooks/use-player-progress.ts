import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessages } from '@/contexts/DirectMessageContext';
import { supabase } from '@/db/supabase';
import { type AchievementState, evaluateAchievements, getLevelInfo, type LevelInfo } from '@/lib/progression';

interface Counts {
  gameAccounts: number;
  challengesPlayed: number;
  tournamentsJoined: number;
}

// Small shared cache so the dashboard, header and achievements page don't
// each fire the same count queries.
const cache = new Map<string, { at: number; counts: Counts }>();
const inflight = new Map<string, Promise<Counts>>();
const TTL = 60_000;

async function loadCounts(userId: string): Promise<Counts> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL) return hit.counts;
  const running = inflight.get(userId);
  if (running) return running;

  const p = (async () => {
    const [ga, ch, tp] = await Promise.all([
      supabase.from('game_accounts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase
        .from('challenges')
        .select('id', { count: 'exact', head: true })
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .eq('status', 'completed'),
      supabase.from('tournament_participants').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);
    const counts = {
      gameAccounts: ga.count ?? 0,
      challengesPlayed: ch.count ?? 0,
      tournamentsJoined: tp.count ?? 0,
    };
    cache.set(userId, { at: Date.now(), counts });
    return counts;
  })().finally(() => inflight.delete(userId));

  inflight.set(userId, p);
  return p;
}

export function invalidatePlayerProgress(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

export interface PlayerProgress {
  level: LevelInfo;
  achievements: AchievementState[];
  unlockedCount: number;
  counts: Counts | null;
  friendsCount: number;
  loading: boolean;
}

export function usePlayerProgress(): PlayerProgress {
  const { user, profile } = useAuth();
  const { friends } = useDirectMessages();
  const userId = user?.id;
  const [counts, setCounts] = useState<Counts | null>(() => (userId ? cache.get(userId)?.counts ?? null : null));

  useEffect(() => {
    if (!userId) {
      setCounts(null);
      return;
    }
    let cancelled = false;
    loadCounts(userId)
      .then((c) => {
        if (!cancelled) setCounts(c);
      })
      .catch((e) => console.error('Error loading player progress:', e));
    return () => {
      cancelled = true;
    };
  }, [userId, profile?.wins, profile?.tournaments_played]);

  return useMemo(() => {
    const achievements = evaluateAchievements({
      profile,
      friendsCount: friends.length,
      gameAccountsCount: counts?.gameAccounts ?? 0,
      challengesPlayed: counts?.challengesPlayed ?? 0,
    });
    return {
      level: getLevelInfo(profile),
      achievements,
      unlockedCount: achievements.filter((a) => a.unlocked).length,
      counts,
      friendsCount: friends.length,
      loading: !counts,
    };
  }, [profile, friends.length, counts]);
}
