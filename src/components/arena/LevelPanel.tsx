import { formatCompactNumber } from '@/lib/arena-currency';
import { getLevelInfo, getTier, nextTier, TIERS, xpBreakdown, XP_RULES, xpToReachLevel } from '@/lib/progression';
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
  const rows = xpBreakdown(profile);
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
          <table className="mt-2 w-full text-sm">
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-2">{r.label}</td>
                  <td className="py-2 pr-2 text-right text-muted-foreground">
                    {r.count} × {r.each}
                  </td>
                  <td className="py-2 text-right font-score text-base font-bold">{formatCompactNumber(r.xp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            Every win, in a quick match or a tournament round, earns {XP_RULES.win} XP. Taking part always counts: a loss earns {XP_RULES.loss} and entering a tournament earns {XP_RULES.tournamentEntered}.
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
