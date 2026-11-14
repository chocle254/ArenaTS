import { getLevelInfo, getTier } from '@/lib/progression';
import type { Profile } from '@/types/database';

export type RankName = 'Rookie' | 'Contender' | 'Pro' | 'Elite' | 'Legend';

/** The player's rank (tier) from their level, same as on their profile. */
export function rankOf(profile: Partial<Profile> | null | undefined): RankName {
  if (!profile) return 'Rookie';
  return getTier(getLevelInfo(profile).level).name as RankName;
}

interface BubbleLook {
  /** Classes for the bubble itself */
  bubble: string;
  /** Classes for time, ticks and "edited" */
  meta: string;
  /** Read-tick colour */
  read: string;
  /** Reply quote panel */
  quote: string;
}

/**
 * Chat bubbles get fancier as players rank up. Own messages stay in the
 * player's colour family so they're easy to tell apart; higher ranks add
 * gradients, rims and (for Legends) a gold glow.
 */
const OWN: Record<RankName, BubbleLook> = {
  Rookie: { bubble: 'bg-primary text-white', meta: 'text-white/70', read: 'text-[#9fe7ff]', quote: 'bg-black/20 border-white/60' },
  Contender: { bubble: 'bg-primary text-white ring-1 ring-inset ring-success/60', meta: 'text-white/70', read: 'text-[#9fe7ff]', quote: 'bg-black/20 border-success' },
  Pro: { bubble: 'bg-gradient-to-br from-primary to-[#3f7bff] text-white', meta: 'text-white/75', read: 'text-[#b5f0ff]', quote: 'bg-black/20 border-white/70' },
  Elite: {
    bubble: 'bg-gradient-to-br from-[#4b3fd1] via-primary to-[#22d3ee] text-white ring-1 ring-inset ring-white/35',
    meta: 'text-white/80',
    read: 'text-white',
    quote: 'bg-black/25 border-white/80',
  },
  Legend: {
    bubble: 'bg-gradient-to-br from-[#f5c451] via-[#e8a93a] to-[#b7791f] text-[#1b1406] shadow-[0_0_14px_rgba(245,196,81,0.35)]',
    meta: 'text-[#1b1406]/70',
    read: 'text-[#0b5cad]',
    quote: 'bg-black/10 border-[#1b1406]/60',
  },
};

const OTHER: Record<RankName, BubbleLook> = {
  Rookie: { bubble: 'bg-secondary text-foreground', meta: 'text-muted-foreground', read: '', quote: 'bg-black/20 border-primary' },
  Contender: { bubble: 'bg-secondary text-foreground ring-1 ring-inset ring-success/45', meta: 'text-muted-foreground', read: '', quote: 'bg-black/20 border-success' },
  Pro: { bubble: 'bg-secondary text-foreground ring-1 ring-inset ring-primary/60', meta: 'text-muted-foreground', read: '', quote: 'bg-black/20 border-primary' },
  Elite: {
    bubble: 'bg-gradient-to-br from-secondary to-[#23304a] text-foreground ring-1 ring-inset ring-[#7dd3fc]/50',
    meta: 'text-muted-foreground',
    read: '',
    quote: 'bg-black/25 border-[#7dd3fc]',
  },
  Legend: {
    bubble: 'bg-gradient-to-br from-secondary to-[#3a2e12] text-foreground ring-1 ring-inset ring-gold/70 shadow-[0_0_14px_rgba(245,196,81,0.22)]',
    meta: 'text-gold/80',
    read: '',
    quote: 'bg-black/25 border-gold',
  },
};

export function bubbleLook(rank: RankName | undefined, own: boolean): BubbleLook {
  return (own ? OWN : OTHER)[rank || 'Rookie'];
}

/** Small badge next to a name in group chats */
export const RANK_BADGE: Record<RankName, string> = {
  Rookie: '',
  Contender: 'bg-success/15 text-success',
  Pro: 'bg-primary/20 text-primary-soft',
  Elite: 'bg-[#7dd3fc]/15 text-[#7dd3fc]',
  Legend: 'bg-gold/15 text-gold',
};
