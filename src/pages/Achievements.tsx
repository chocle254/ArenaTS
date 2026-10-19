import { Lock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LevelRing } from '@/components/arena/LevelRing';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerProgress } from '@/hooks/use-player-progress';
import { RARITY_STYLES, xpToReachLevel } from '@/lib/progression';
import { cn } from '@/lib/utils';

const FILTERS = ['All', 'Unlocked', 'In progress'] as const;

export default function Achievements() {
  const { profile } = useAuth();
  const { level, achievements, unlockedCount } = usePlayerProgress();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const list = useMemo(() => {
    const sorted = [...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.progress - a.progress);
    if (filter === 'Unlocked') return sorted.filter((a) => a.unlocked);
    if (filter === 'In progress') return sorted.filter((a) => !a.unlocked);
    return sorted;
  }, [achievements, filter]);

  const nextUp = achievements.filter((a) => !a.unlocked).sort((a, b) => b.progress - a.progress)[0];

  return (
    <div className="space-y-8">
      <section className="surface-raised relative overflow-hidden p-6 md:p-8">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(224 100% 60% / 0.22), transparent 70%)' }}
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          <LevelRing level={level.level} progress={level.progress} size={128} stroke={8}>
            <Avatar className="h-full w-full">
              <AvatarImage src={profile?.avatar_url || ''} alt="" />
              <AvatarFallback className="bg-primary/20 font-score text-4xl">{profile?.gamertag?.[0]?.toUpperCase() || 'P'}</AvatarFallback>
            </Avatar>
          </LevelRing>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">{profile?.gamertag || 'Player'}</p>
              <h1 className="text-5xl leading-none">Level {level.level}</h1>
            </div>
            <div className="max-w-md space-y-1.5">
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-primary-soft to-primary" style={{ width: `${Math.round(level.progress * 100)}%` }} />
              </div>
              <p className="flex justify-between text-xs text-muted-foreground">
                <span>
                  <span className="font-score text-sm text-foreground">{level.xp.toLocaleString()}</span> XP
                </span>
                <span>
                  {level.toNext.toLocaleString()} XP to level {level.level + 1} ({xpToReachLevel(level.level + 1).toLocaleString()})
                </span>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Wins earn 100 XP, losses 25, each tournament 150 and every title 500.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-64">
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="font-score text-3xl leading-none">
                {unlockedCount}
                <span className="text-base text-muted-foreground">/{achievements.length}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Unlocked</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="font-score text-3xl leading-none">{profile?.longest_streak ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">Best win streak</p>
            </div>
          </div>
        </div>
      </section>

      {nextUp && (
        <section className="surface flex items-center gap-4 p-4">
          <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1', RARITY_STYLES[nextUp.rarity].bg, RARITY_STYLES[nextUp.rarity].ring)}>
            <nextUp.icon className={cn('h-6 w-6', RARITY_STYLES[nextUp.rarity].text)} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Closest to unlocking</p>
            <p className="truncate font-semibold">
              {nextUp.title} <span className="font-normal text-muted-foreground">— {nextUp.description}</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(nextUp.progress * 100)}%` }} />
            </div>
          </div>
          <span className="font-score text-lg">
            {nextUp.value}/{nextUp.target}
          </span>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl">Achievements</h2>
          <div className="flex rounded-xl border border-border p-1" role="tablist" aria-label="Filter achievements">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', filter === f ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground')}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((a) => {
            const style = RARITY_STYLES[a.rarity];
            const Icon = a.icon;
            return (
              <article
                key={a.id}
                className={cn('surface flex gap-4 p-4', a.unlocked ? 'border-gold/25' : 'opacity-90')}
              >
                <span
                  className={cn(
                    'relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1',
                    a.unlocked ? cn(style.bg, style.ring) : 'bg-muted ring-border',
                  )}
                >
                  <Icon className={cn('h-7 w-7', a.unlocked ? style.text : 'text-muted-foreground/60')} />
                  {!a.unlocked && (
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background ring-1 ring-border">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="truncate text-lg leading-tight">{a.title}</h3>
                    <span className={cn('shrink-0 text-[11px] font-semibold', style.text)}>{style.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.description}</p>
                  {a.unlocked ? (
                    <p className="text-xs font-semibold text-gold">Unlocked</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, Math.round(a.progress * 100))}%` }} />
                      </div>
                      <span className="font-score text-sm text-muted-foreground">
                        {a.value}/{a.target}
                      </span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
