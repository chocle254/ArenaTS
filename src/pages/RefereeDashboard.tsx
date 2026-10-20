import { Bot, CheckCircle2, Gavel, Loader2, Scale } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/arena/Rail';
import { EvidenceGallery } from '@/components/disputes/EvidenceGallery';
import { type Dispute, type Evidence, timeLeft } from '@/components/disputes/evidence';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { cn } from '@/lib/utils';
import { GAME_INFO, type GameType } from '@/types/database';

type Tab = 'mine' | 'open' | 'ai' | 'done';

const STATUS_TEXT: Record<Dispute['status'], string> = {
  collecting: 'Collecting evidence',
  ai_review: 'AI reviewing',
  proposed: 'AI decided, appeal window open',
  human_review: 'Needs a referee',
  decided: 'Decided',
  void: 'Settled by players',
};

export default function RefereeDashboard() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [tab, setTab] = useState<Tab>('mine');
  const [rows, setRows] = useState<Dispute[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Dispute | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase.from('disputes').select('*').order('created_at', { ascending: false }).limit(100);
    if (tab === 'mine') q = q.eq('referee_id', user.id).eq('status', 'human_review');
    if (tab === 'open') q = q.eq('status', 'human_review');
    if (tab === 'ai') q = q.in('status', ['collecting', 'ai_review', 'proposed']);
    if (tab === 'done') q = q.in('status', ['decided', 'void']);
    const { data } = await q;
    const list = (data || []) as Dispute[];
    setRows(list);
    const ids = [...new Set(list.flatMap((d) => [d.player1_id, d.player2_id, d.referee_id]).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: people } = await supabase.from('profiles').select('id, gamertag').in('id', ids);
      setNames(Object.fromEntries(((people || []) as { id: string; gamertag: string | null }[]).map((p) => [p.id, p.gamertag || 'Player'])));
    }
    setLoading(false);
  }, [user, tab]);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const tabs: { id: Tab; label: string }[] = isAdmin
    ? [
        { id: 'mine', label: 'Assigned to me' },
        { id: 'open', label: 'Needs a referee' },
        { id: 'ai', label: 'With the AI' },
        { id: 'done', label: 'Decided' },
      ]
    : [{ id: 'mine', label: 'Assigned to me' }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl">Referee center</h1>
        <p className="max-w-2xl text-muted-foreground">
          The AI referee settles clear disputes. You get a match only when the AI isn’t sure or a player appeals, and you lose access once you decide it.
        </p>
      </div>

      {tabs.length > 1 && (
        <div role="tablist" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide md:mx-0 md:px-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn('h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold', tab === t.id ? 'border-primary bg-primary/15' : 'border-border text-muted-foreground')}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5" />}
          title={tab === 'mine' ? 'Nothing assigned to you' : 'Nothing here'}
          description={tab === 'mine' ? 'You’ll get a notification when a dispute needs you.' : 'Disputes show up here as they move through review.'}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((d) => {
            const game = d.game ? GAME_INFO[d.game as GameType] : null;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setOpen(d)}
                  className={cn('flex w-full flex-col gap-3 rounded-2xl border bg-card p-4 text-left hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', d.status === 'human_review' ? 'border-live/40' : 'border-border')}
                >
                  <div className="flex items-center gap-2.5">
                    {game && <img src={game.icon} alt="" className="h-8 w-8 rounded-lg object-cover" loading="lazy" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-score text-lg font-bold">
                        {names[d.player1_id] || 'Player'} <span className="text-xs text-muted-foreground">VS</span> {names[d.player2_id] || 'Player'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d.match_kind === 'quick' ? 'Quick match' : 'Tournament match'}, {STATUS_TEXT[d.status]}
                        {d.status === 'collecting' ? `, ${timeLeft(d.evidence_deadline)} left` : ''}
                      </p>
                    </div>
                  </div>
                  {d.appeal_reason && <p className="line-clamp-2 rounded-xl bg-secondary p-2.5 text-xs">Appeal: “{d.appeal_reason}”</p>}
                  {!d.appeal_reason && d.ai_verdict?.reasoning && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      <Bot className="mr-1 inline h-3.5 w-3.5" />
                      {d.ai_verdict.reasoning}
                    </p>
                  )}
                  {isAdmin && d.status === 'human_review' && !d.referee_id && <span className="text-xs font-semibold text-live">No referee available, decide it yourself</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && <DisputeReview dispute={open} names={names} currentUserId={user!.id} isAdmin={isAdmin} onClose={() => setOpen(null)} onDecided={() => { setOpen(null); load(); }} />}
    </div>
  );
}

function DisputeReview({ dispute: d, names, currentUserId, isAdmin, onClose, onDecided }: { dispute: Dispute; names: Record<string, string>; currentUserId: string; isAdmin: boolean; onClose: () => void; onDecided: () => void }) {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [reports, setReports] = useState<{ p1: string | null; p2: string | null }>({ p1: null, p2: null });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const playing = currentUserId === d.player1_id || currentUserId === d.player2_id;
  const canDecide = !playing && (isAdmin || d.referee_id === currentUserId) && !['decided', 'void'].includes(d.status);

  useEffect(() => {
    supabase.from('dispute_evidence').select('*').eq('dispute_id', d.id).order('created_at').then(({ data }) => setEvidence((data || []) as Evidence[]));
    if (d.match_kind === 'tournament' && d.match_result_id) {
      supabase.from('match_results').select('player1_reported_winner, player2_reported_winner').eq('id', d.match_result_id).single().then(({ data }) => data && setReports({ p1: data.player1_reported_winner, p2: data.player2_reported_winner }));
    } else if (d.challenge_id) {
      supabase.from('challenges').select('challenger_reported_winner, opponent_reported_winner').eq('id', d.challenge_id).single().then(({ data }) => data && setReports({ p1: data.challenger_reported_winner, p2: data.opponent_reported_winner }));
    }
  }, [d]);

  const n1 = names[d.player1_id] || 'Player 1';
  const n2 = names[d.player2_id] || 'Player 2';
  const said = (id: string | null) => (id === d.player1_id ? n1 : id === d.player2_id ? n2 : 'no report');

  const decide = async (winner: string | null, key: string) => {
    setBusy(key);
    const { error } = await supabase.rpc('referee_decide', { p_dispute: d.id, p_winner: winner, p_note: note });
    setBusy(null);
    if (error) return void toast.error(error.message);
    toast.success('Decision applied. Both players have been notified.');
    onDecided();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {n1} vs {n2}
          </DialogTitle>
          <DialogDescription>
            {d.match_kind === 'quick' ? 'Quick match for money' : 'Tournament match'}, {STATUS_TEXT[d.status]}.{' '}
            {d.tournament_id && (
              <Link to={`/tournaments/${d.tournament_id}`} className="font-semibold text-primary-soft hover:underline">
                Open tournament
              </Link>
            )}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-secondary/60 p-3">
            <dt className="text-muted-foreground">{n1} says</dt>
            <dd className="font-semibold">{said(reports.p1)} won</dd>
          </div>
          <div className="rounded-xl bg-secondary/60 p-3">
            <dt className="text-muted-foreground">{n2} says</dt>
            <dd className="font-semibold">{said(reports.p2)} won</dd>
          </div>
        </dl>

        {d.ai_verdict && (
          <section className="space-y-1.5 rounded-xl border border-border p-3 text-sm">
            <p className="flex items-center gap-1.5 font-semibold">
              <Bot className="h-4 w-4" /> AI referee: {d.ai_winner ? `${said(d.ai_winner)} won` : 'not sure'}
              {d.ai_confidence != null && <span className="font-normal text-muted-foreground">({Math.round(Number(d.ai_confidence) * 100)}% confident)</span>}
            </p>
            {d.ai_verdict.reasoning && <p className="text-muted-foreground">{d.ai_verdict.reasoning}</p>}
            {!!d.ai_verdict.red_flags?.length && (
              <ul className="flex flex-wrap gap-1.5">
                {d.ai_verdict.red_flags.map((f) => (
                  <li key={f} className="rounded-full bg-live/15 px-2 py-0.5 text-xs text-live">
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {d.appeal_reason && (
          <section className="rounded-xl bg-gold/10 p-3 text-sm">
            <p className="font-semibold">{said(d.appealed_by)} appealed</p>
            <p className="text-muted-foreground">“{d.appeal_reason}”</p>
          </section>
        )}

        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-lg">
            <Scale className="h-4 w-4" /> Evidence
          </h3>
          {evidence.length ? <EvidenceGallery evidence={evidence} names={names} /> : <p className="text-sm text-muted-foreground">Neither player uploaded anything.</p>}
        </section>

        {d.status === 'decided' && (
          <p className="rounded-xl bg-success/10 p-3 text-sm">
            <span className="font-semibold">{d.decided_winner ? `${said(d.decided_winner)} won` : 'Cancelled and refunded'}</span>
            {d.decision_note ? `: ${d.decision_note}` : ''}
          </p>
        )}

        {playing && <p className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">You’re playing in this match, so someone else decides it.</p>}

        {canDecide && (
          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="flex items-center gap-1.5 text-lg">
              <Gavel className="h-4 w-4" /> Your decision
            </h3>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why? Players see this. e.g. The final score screen in the video shows 3-1 to NairobiNinja." rows={3} maxLength={1000} />
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => decide(d.player1_id, 'p1')} disabled={!!busy || note.trim().length < 5}>
                {busy === 'p1' && <Loader2 className="h-4 w-4 animate-spin" />} {n1} won
              </Button>
              <Button onClick={() => decide(d.player2_id, 'p2')} disabled={!!busy || note.trim().length < 5}>
                {busy === 'p2' && <Loader2 className="h-4 w-4 animate-spin" />} {n2} won
              </Button>
              {d.match_kind === 'quick' && (
                <Button variant="ghost" className="col-span-2 text-muted-foreground hover:text-destructive" onClick={() => decide(null, 'void')} disabled={!!busy || note.trim().length < 5}>
                  Can’t tell: cancel and refund both
                </Button>
              )}
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
