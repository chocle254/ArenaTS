import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck,
  CalendarHeart,
  Crown,
  Flame,
  Gamepad2,
  Medal,
  Radio,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import type { Profile } from '@/types/database';

/* ------------------------------------------------------------------ */
/* Levels                                                              */
/* ------------------------------------------------------------------ */

/** XP is derived from match history, so it can't drift from real results. */
export function computeXp(profile: Partial<Profile> | null | undefined): number {
  if (!profile) return 0;
  const p = profile as Partial<Profile> & { tournaments_won?: number };
  const wins = Number(p.wins) || 0;
  const losses = Number(p.losses) || 0;
  const played = Number(p.tournaments_played) || 0;
  const titles = Number(p.tournaments_won) || 0;
  return wins * 100 + losses * 25 + played * 150 + titles * 500;
}

/** Total XP needed to *reach* a level. Level 2 = 150, level 5 = 1,500, level 10 = 6,750. */
export function xpToReachLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return (150 * (l - 1) * l) / 2;
}

export interface LevelInfo {
  level: number;
  xp: number;
  /** XP earned inside the current level */
  intoLevel: number;
  /** XP the current level spans */
  levelSpan: number;
  /** 0..1 progress to the next level */
  progress: number;
  toNext: number;
}

export function getLevelInfo(profile: Partial<Profile> | null | undefined): LevelInfo {
  const xp = computeXp(profile);
  let level = 1;
  while (xpToReachLevel(level + 1) <= xp && level < 999) level++;
  const floor = xpToReachLevel(level);
  const ceil = xpToReachLevel(level + 1);
  const span = ceil - floor;
  const intoLevel = xp - floor;
  return { level, xp, intoLevel, levelSpan: span, progress: span > 0 ? intoLevel / span : 0, toNext: ceil - xp };
}

/* ------------------------------------------------------------------ */
/* Achievements                                                        */
/* ------------------------------------------------------------------ */

export interface AchievementContext {
  profile: Partial<Profile> | null | undefined;
  friendsCount: number;
  gameAccountsCount: number;
  challengesPlayed: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Visual weight: bronze → legendary */
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  target: number;
  current: (ctx: AchievementContext) => number;
}

const n = (v: unknown) => Number(v) || 0;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-win', title: 'First blood', description: 'Win your first match.', icon: Swords, rarity: 'common', target: 1, current: (c) => n(c.profile?.wins) },
  { id: 'loadout', title: 'Loadout ready', description: 'Add an in-game ID to your profile.', icon: Gamepad2, rarity: 'common', target: 1, current: (c) => c.gameAccountsCount },
  { id: 'debut', title: 'Tournament debut', description: 'Play in your first tournament.', icon: Trophy, rarity: 'common', target: 1, current: (c) => n(c.profile?.tournaments_played) },
  { id: 'quick-draw', title: 'Quick draw', description: 'Finish 5 quick-match challenges.', icon: Zap, rarity: 'common', target: 5, current: (c) => c.challengesPlayed },
  { id: 'squad', title: 'Squad up', description: 'Add 5 friends.', icon: Users, rarity: 'common', target: 5, current: (c) => c.friendsCount },
  { id: 'hot-hand', title: 'Hot hand', description: 'Win 3 matches in a row.', icon: Flame, rarity: 'rare', target: 3, current: (c) => n(c.profile?.longest_streak) },
  { id: 'contender', title: 'Contender', description: 'Win 10 matches.', icon: Target, rarity: 'rare', target: 10, current: (c) => n(c.profile?.wins) },
  { id: 'regular', title: 'Bracket regular', description: 'Play in 10 tournaments.', icon: Medal, rarity: 'rare', target: 10, current: (c) => n(c.profile?.tournaments_played) },
  { id: 'paid', title: 'Paid pro', description: 'Earn your first prize money.', icon: Wallet, rarity: 'rare', target: 1, current: (c) => (n(c.profile?.total_earnings) > 0 ? 1 : 0) },
  { id: 'verified', title: 'Verified competitor', description: 'Complete identity verification.', icon: BadgeCheck, rarity: 'rare', target: 1, current: (c) => (c.profile?.kyc_status === 'verified' ? 1 : 0) },
  { id: 'streamer', title: 'On air', description: 'Link your Twitch channel.', icon: Radio, rarity: 'common', target: 1, current: (c) => (c.profile?.twitch_handle ? 1 : 0) },
  { id: 'champion', title: 'Champion', description: 'Win a tournament.', icon: Crown, rarity: 'epic', target: 1, current: (c) => n((c.profile as { tournaments_won?: number } | null | undefined)?.tournaments_won) },
  { id: 'unstoppable', title: 'Unstoppable', description: 'Win 10 matches in a row.', icon: Sparkles, rarity: 'epic', target: 10, current: (c) => n(c.profile?.longest_streak) },
  { id: 'veteran', title: 'Veteran', description: 'Win 50 matches.', icon: Shield, rarity: 'epic', target: 50, current: (c) => n(c.profile?.wins) },
  { id: 'high-roller', title: 'High roller', description: 'Earn $100 in prizes.', icon: Wallet, rarity: 'legendary', target: 100, current: (c) => Math.floor(n(c.profile?.total_earnings)) },
  {
    id: 'season-one',
    title: 'Season one',
    description: 'Joined Arena during its first season.',
    icon: CalendarHeart,
    rarity: 'legendary',
    target: 1,
    current: (c) => (c.profile?.created_at && new Date(c.profile.created_at) < new Date('2027-01-01T00:00:00Z') ? 1 : 0),
  },
];

export interface AchievementState extends AchievementDef {
  value: number;
  unlocked: boolean;
  progress: number;
}

export function evaluateAchievements(ctx: AchievementContext): AchievementState[] {
  return ACHIEVEMENTS.map((a) => {
    const value = Math.max(0, a.current(ctx));
    return { ...a, value: Math.min(value, a.target), unlocked: value >= a.target, progress: Math.min(1, value / a.target) };
  });
}

export const RARITY_STYLES: Record<AchievementDef['rarity'], { ring: string; text: string; bg: string; label: string }> = {
  common: { ring: 'ring-white/15', text: 'text-foreground', bg: 'bg-white/5', label: 'Common' },
  rare: { ring: 'ring-primary/50', text: 'text-primary-soft', bg: 'bg-primary/10', label: 'Rare' },
  epic: { ring: 'ring-fuchsia-400/50', text: 'text-fuchsia-300', bg: 'bg-fuchsia-500/10', label: 'Epic' },
  legendary: { ring: 'ring-gold/60', text: 'text-gold', bg: 'bg-gold/10', label: 'Legendary' },
};

/* ------------------------------------------------------------------ */
/* Visit streak (cosmetic, stored on this device)                       */
/* ------------------------------------------------------------------ */

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface VisitStreak {
  current: number;
  best: number;
  /** Last 7 days, oldest first, true if visited */
  week: { label: string; visited: boolean; isToday: boolean }[];
}

/** Records today's visit and returns the streak. Never throws. */
export function recordVisit(userId: string, now = new Date()): VisitStreak {
  const key = `arena:visits:${userId}`;
  let days: string[] = [];
  let best = 0;
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '{}');
    days = Array.isArray(raw.days) ? raw.days : [];
    best = Number(raw.best) || 0;
  } catch {
    /* storage unavailable or corrupt */
  }
  const today = dayKey(now);
  if (!days.includes(today)) days.push(today);
  days = days.sort().slice(-60);

  const set = new Set(days);
  let current = 0;
  const cursor = new Date(now);
  while (set.has(dayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  best = Math.max(best, current);
  try {
    localStorage.setItem(key, JSON.stringify({ days, best }));
  } catch {
    /* storage unavailable */
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return { label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), visited: set.has(dayKey(d)), isToday: i === 6 };
  });
  return { current, best, week };
}
