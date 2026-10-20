import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/arena/Rail';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { formatArenaCurrency } from '@/lib/arena-currency';
import { GAME_INFO, type GameType } from '@/types/database';

export interface QuickDispute {
  id: string;
  game: string;
  stake_amount: number;
  prize_pool: number | null;
  status: string;
  challenger_id: string;
  opponent_id: string;
  challenger_reported_winner: string | null;
  opponent_reported_winner: string | null;
  screenshot_url: string | null;
  updated_at: string | null;
  challenger: { gamertag: string | null } | null;
  opponent: { gamertag: string | null } | null;
}

export interface BracketDispute {
  id: string;
  match_id: string;
  round: number;
  tournament_id: string;
  player1_id: string | null;
  player2_id: string | null;
  updated_at: string | null;
  tournaments: { name: string; game: GameType } | null;
}

export function AdminDisputes({
  quick,
  bracket,
  names,
  currentUserId,
  onChanged,
}: {
  quick: QuickDispute[];
  bracket: BracketDispute[];
  names: Record<string, string>;
  currentUserId: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const settle = async (c: QuickDispute, winner: string | 'cancel') => {
    setBusy(c.id);
    try {
      const update =
        winner === 'cancel'
          ? { status: 'cancelled', submitted_by: currentUserId }
          : {
              status: 'completed',
              winner_id: winner,
              challenger_reported_winner: winner,
              opponent_reported_winner: winner,
              completed_at: new Date().toISOString(),
              submitted_by: currentUserId,
            };
      const { error } = await supabase.from('challenges').update(update).eq('id', c.id);
      if (error) throw error;
      toast.success(winner === 'cancel' ? 'Match cancelled. Both stakes refunded.' : 'Winner confirmed. Prize paid out.');
      onChanged();
    } catch (e: any) {
      toast.error(e.message || 'Could not settle this match');
    } finally {
      setBusy(null);
    }
  };

  if (quick.length === 0 && bracket.length === 0) {
    return <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="No disputes" description="When two players report different winners, the match shows up here." />;
  }

  return (
    <div className="space-y-8">
      {quick.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl">Quick matches</h2>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {quick.map((c) => {
              const a = c.challenger?.gamertag || 'Challenger';
              const b = c.opponent?.gamertag || 'Opponent';
              const said = (id: string | null) => (id ? `${id === c.challenger_id ? a : b} won` : 'No report yet');
              const playing = currentUserId === c.challenger_id || currentUserId === c.opponent_id;
              const game = GAME_INFO[c.game as GameType];
              return (
                <li key={c.id} className="flex flex-col gap-3 rounded-2xl border border-live/40 bg-card p-4">
                  <div className="flex items-center gap-2.5">
                    {game && <img src={game.icon} alt="" className="h-8 w-8 rounded-lg object-cover" loading="lazy" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-score text-lg font-bold">
                        {a} <span className="text-xs font-semibold text-muted-foreground">VS</span> {b}
                      </p>
                      <p className="text-xs text-muted-foreground">Stake {formatArenaCurrency(c.stake_amount)} each</p>
                    </div>
                    <AlertTriangle className="h-4 w-4 shrink-0 text-live" aria-label="Disputed" />
                  </div>
                  <dl className="grid grid-cols-2 gap-2 rounded-xl bg-live/10 p-2.5 text-xs">
                    <div>
                      <dt className="text-muted-foreground">{a} says</dt>
                      <dd className="font-semibold">{said(c.challenger_reported_winner)}</dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-muted-foreground">{b} says</dt>
                      <dd className="font-semibold">{said(c.opponent_reported_winner)}</dd>
                    </div>
                  </dl>
                  {c.screenshot_url && (
                    <a href={c.screenshot_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-soft hover:text-foreground">
                      View screenshot <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {playing ? (
                    <p className="rounded-xl bg-secondary p-2.5 text-xs text-muted-foreground">You're playing in this match, so another admin has to settle it.</p>
                  ) : (
                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => settle(c, c.challenger_id)}>
                        {a} won
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => settle(c, c.opponent_id)}>
                        {b} won
                      </Button>
                      <Button size="sm" variant="ghost" className="col-span-2 text-muted-foreground hover:text-destructive" disabled={busy === c.id} onClick={() => settle(c, 'cancel')}>
                        {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel and refund both'}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {bracket.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-xl">Tournament matches</h2>
            <Link to="/referee" className="text-sm font-semibold text-primary-soft hover:text-foreground">
              Open referee center
            </Link>
          </div>
          <ul className="grid gap-2 md:grid-cols-2">
            {bracket.map((m) => {
              const game = m.tournaments ? GAME_INFO[m.tournaments.game] : null;
              const p1 = m.player1_id ? names[m.player1_id] || 'Player' : 'TBD';
              const p2 = m.player2_id ? names[m.player2_id] || 'Player' : 'TBD';
              const playing = currentUserId === m.player1_id || currentUserId === m.player2_id;
              return (
                <li key={m.id}>
                  <Link
                    to={`/tournaments/${m.tournament_id}?match=${m.match_id}`}
                    className="flex items-center gap-3 rounded-2xl border border-live/40 bg-card px-3 py-2.5 hover:border-primary/60"
                  >
                    {game && <img src={game.icon} alt="" className="h-10 w-10 rounded-xl object-cover" loading="lazy" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {p1} vs {p2}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.tournaments?.name}, round {m.round}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-primary-soft">{playing ? 'Your match' : 'Decide'}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
