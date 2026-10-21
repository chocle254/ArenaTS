/**
 * Prize pool helpers. A "sliding" tournament (the ACGL model) has a prize the
 * creator guarantees up front; once `sliding_after` slots are filled, every
 * further entry fee is added to the prize. The server works this out from
 * paid entries at payout (tournament_pool_bonus); this mirrors it for display.
 */
export interface PrizeFields {
  prize_pool: number | null;
  entry_fee?: number | null;
  team_size?: number | null;
  current_players?: number | null;
  prize_mode?: string | null;
  sliding_after?: number | null;
}

export function isSliding(t: PrizeFields): boolean {
  return t.prize_mode === 'sliding' && Number(t.entry_fee) > 0;
}

/** KES each extra slot adds once the pool is growing. */
export function perEntryBonus(t: PrizeFields): number {
  return isSliding(t) ? Number(t.entry_fee) * Math.max(Number(t.team_size) || 1, 1) : 0;
}

/** The prize right now: guarantee + entries past the threshold. */
export function livePrizePool(t: PrizeFields): number {
  const base = Number(t.prize_pool) || 0;
  if (!isSliding(t)) return base;
  const slots = Math.floor((Number(t.current_players) || 0) / Math.max(Number(t.team_size) || 1, 1));
  return base + Math.max(slots - (Number(t.sliding_after) || 0), 0) * perEntryBonus(t);
}

/**
 * Welcome ticket: entry credit (profiles.entry_credit) pays entry fees on
 * official tournaments (hosted by Arena or a verified organizer). Mirrors
 * handle_tournament_join_fee on the server, which is authoritative.
 */
export function ticketCover(
  tournament: { official?: boolean | null } | null | undefined,
  profile: { entry_credit?: number | null; arena_currency?: number | null } | null | undefined,
  fee: number,
): { credit: number; cash: number } {
  const credit = tournament?.official ? Math.min(Math.max(Number(profile?.entry_credit) || 0, 0), fee) : 0;
  return { credit, cash: Math.max(fee - credit, 0) };
}
