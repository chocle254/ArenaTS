import { Bot, CheckCircle2, Gavel, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/arena/Rail';
import { type Dispute, timeLeft } from '@/components/disputes/evidence';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GAME_INFO, type GameType } from '@/types/database';

const STAGE: Record<string, { label: string; icon: typeof Bot }> = {
  collecting: { label: 'Collecting evidence', icon: Scale },
  ai_review: { label: 'AI reviewing', icon: Bot },
  proposed: { label: 'AI decided, appeal window open', icon: Bot },
  human_review: { label: 'Needs a referee', icon: Gavel },
};

/** Open disputes across quick and tournament matches. Decisions happen in the Referee Center. */
export function AdminDisputes({ disputes, names }: { disputes: Dispute[]; names: Record<string, string> }) {
  if (disputes.length === 0) {
    return <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="No open disputes" description="When two players report different winners, the dispute shows up here while the AI and referees handle it." />;
  }
  const needsHuman = disputes.filter((d) => d.status === 'human_review');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {needsHuman.length ? `${needsHuman.length} need a person. ` : ''}The rest are with the AI referee.
        </p>
        <Button asChild size="sm">
          <Link to="/referee">
            <Gavel className="h-4 w-4" /> Open referee center
          </Link>
        </Button>
      </div>
      <ul className="grid gap-2 md:grid-cols-2">
        {disputes.map((d) => {
          const stage = STAGE[d.status] || STAGE.collecting;
          const Icon = stage.icon;
          const game = d.game ? GAME_INFO[d.game as GameType] : null;
          return (
            <li key={d.id}>
              <Link to="/referee" className={cn('flex items-center gap-3 rounded-2xl border bg-card px-3 py-2.5 hover:border-primary/60', d.status === 'human_review' ? 'border-live/40' : 'border-border')}>
                {game && <img src={game.icon} alt="" className="h-10 w-10 rounded-xl object-cover" loading="lazy" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {names[d.player1_id] || 'Player'} vs {names[d.player2_id] || 'Player'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.match_kind === 'quick' ? 'Quick match' : 'Tournament'}, {stage.label}
                    {d.status === 'collecting' ? `, ${timeLeft(d.evidence_deadline)} left` : ''}
                    {d.status === 'human_review' ? (d.referee_id ? `, ${names[d.referee_id] || 'referee'} assigned` : ', no referee free') : ''}
                  </p>
                </div>
                <Icon className={cn('h-4 w-4 shrink-0', d.status === 'human_review' ? 'text-live' : 'text-muted-foreground')} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
