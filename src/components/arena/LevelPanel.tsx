import { formatCompactNumber } from '@/lib/arena-currency';
import { getLevelInfo, getTier, nextTier, TIERS, XP_RULES, xpToReachLevel } from '@/lib/progression';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types/database';

export function TierBadge({ level, className }: { level: number; className?: string }) {
  const tier = getTier(level);
  return <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold', tier.bg, tier.text, className)}>{tier.name}</span>;
}

/** Explains the player's level: progress, where their XP came from, and the tier ladder. */
export function LevelPanel({ profile }: { profile: Partial<Profile> | null | undefined }) {
  const info = getLevelInfo(profile);
  const tier = getTier(info.level);
  const upcoming = nextTier(info.level);
  const toTier = upcoming ? Math.max(0, xpToReachLevel(upcoming.minLevel) - info.xp) : 0;

  return (
    <section className="surface p-5 md:p-6" aria-labelledby="level-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="level-title" className="text-2xl">
            Level {info.level} <span className={cn('ml-1', tier.text)}>{tier.name}</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatCompactNumber(info.xp)} XP total. {formatCompactNumber(info.toNext)} XP to level {info.level + 1}
            {upcoming ? `, ${formatCompactNumber(toTier)} XP to ${upcoming.name}.` : '. You’re at the top tier.'}
          </p>
        </div>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(info.progress * 100)} aria-label="Progress to next level">
        <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${Math.max(2, info.progress * 100)}%` }} />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-lg">How you earn XP</h3>
          <ul className="mt-2 space-y-2 text-sm">
            <li className="flex justify-between border-b border-border/60 pb-2"><span>Win a quick match</span><span className="font-score font-bold">+ the stake</span></li>
            <li className="flex justify-between border-b border-border/60 pb-2"><span>Lose a quick match</span><span className="font-score font-bold">− the stake</span></li>
            <li className="flex justify-between border-b border-border/60 pb-2"><span>Take part in a tournament</span><span className="font-score font-bold">+{XP_RULES.tournamentEntered}</span></li>
            <li className="flex justify-between"><span>Daily top-up when below 100</span><span className="font-score font-bold">back to 100</span></li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Record: {Number(profile?.wins) || 0} wins, {Number(profile?.losses) || 0} losses, {Number(profile?.tournaments_played) || 0} tournaments.</p>
          <p className="mt-2 text-xs text-muted-foreground">
            XP is what you play for. In a quick match you and your opponent agree a stake and the winner takes it from the loser. Every tournament you take part in adds {XP_RULES.tournamentEntered} XP. Drop below 100 and you get topped back up to 100 once a day.
          </p>
        </div>
        <div>
          <h3 className="text-lg">Tiers</h3>
          <ol className="mt-2 space-y-1.5">
            {TIERS.map((t) => {
              const reached = info.level >= t.minLevel;
              const current = t.name === tier.name;
              return (
                <li key={t.name} className={cn('flex items-center justify-between rounded-lg border px-3 py-2 text-sm', current ? 'border-primary/50 bg-primary/10' : 'border-border')}>
                  <span className={cn('font-semibold', reached ? t.text : 'text-muted-foreground')}>{t.name}</span>
                  <span className="text-xs text-muted-foreground">{current ? 'You are here' : `From level ${t.minLevel}`}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
