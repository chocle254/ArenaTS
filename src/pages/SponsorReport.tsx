import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatKES } from '@/lib/arena-currency';
import { livePrizePool } from '@/lib/prize';
import { GAME_INFO, type GameType, type Tournament } from '@/types/database';

interface Deal {
  sponsor_name: string;
  contact: string | null;
  amount: number;
  hosting_fee: number;
  paid_via: string | null;
  invoice_ref: string | null;
  created_at: string;
}
interface Entry {
  gamertag: string | null;
  prize_won: number | null;
  final_position: number | null;
  is_standby: boolean | null;
}
interface Report {
  t: Tournament;
  entries: Entry[];
  matches: number;
  confirmed: number;
  disputes: number;
  streamers: number;
  deals: Deal[];
}

const place = (n: number | null) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : '');

/** One-page summary of a sponsored tournament, to send the sponsor. Admin only. */
export default function SponsorReport() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || profile?.role !== 'admin') return;
    (async () => {
      const { data: t, error: te } = await supabase.from('tournaments').select('*').eq('id', id).maybeSingle();
      if (te || !t) return setError('Tournament not found');
      const [{ data: entries }, { data: matches }, { data: deals }] = await Promise.all([
        supabase.from('tournament_participants').select('gamertag, prize_won, final_position, is_standby').eq('tournament_id', id),
        supabase.from('match_results').select('id, status').eq('tournament_id', id),
        supabase.from('sponsor_deals').select('sponsor_name, contact, amount, hosting_fee, paid_via, invoice_ref, created_at').eq('tournament_id', id),
      ]);
      const ids = (matches || []).map((m) => m.id as string);
      const [{ data: streams }, { count: disputes }] = await Promise.all([
        ids.length ? supabase.from('match_streams').select('user_id').in('match_result_id', ids) : Promise.resolve({ data: [] as { user_id: string }[] }),
        ids.length ? supabase.from('match_disputes').select('id', { count: 'exact', head: true }).in('match_result_id', ids) : Promise.resolve({ count: 0 }),
      ]);
      setData({
        t: t as Tournament,
        entries: (entries || []) as Entry[],
        matches: ids.length,
        confirmed: (matches || []).filter((m) => m.status === 'confirmed').length,
        disputes: disputes || 0,
        streamers: new Set((streams || []).map((s) => s.user_id)).size,
        deals: (deals || []) as Deal[],
      });
    })();
  }, [id, profile?.role]);

  if (profile && profile.role !== 'admin') return <p className="p-8 text-center text-muted-foreground">Admins only.</p>;
  if (error) return <p className="p-8 text-center text-muted-foreground">{error}</p>;
  if (!data) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { t, entries, deals } = data;
  const players = entries.filter((e) => !e.is_standby).length;
  const winners = entries.filter((e) => Number(e.prize_won) > 0).sort((a, b) => (a.final_position || 9) - (b.final_position || 9));
  const paidOut = winners.reduce((s, w) => s + Number(w.prize_won || 0), 0);
  const game = GAME_INFO[t.game as GameType];
  const sponsor = t.sponsor_name || deals[0]?.sponsor_name || 'Sponsor';
  const stats = [
    { label: 'Players registered', value: String(players) },
    { label: 'Matches played', value: `${data.confirmed} of ${data.matches}` },
    { label: 'Players who streamed', value: String(data.streamers) },
    { label: 'Prize pool', value: formatKES(livePrizePool(t)) },
  ];

  return (
    <div className="report mx-auto max-w-3xl space-y-8">
      <style>{`@media print {
        body, .report { background: #fff !important; color: #111 !important; }
        .report * { color: #111 !important; border-color: #ccc !important; background: transparent !important; box-shadow: none !important; }
        .no-print, header, nav, aside, [data-bottom-nav] { display: none !important; }
      }`}</style>

      <div className="no-print flex items-center justify-between gap-3">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Admin
        </Link>
        <Button onClick={() => window.print()} variant="outline">
          <Printer className="h-4 w-4" /> Print or save as PDF
        </Button>
      </div>

      <header className="space-y-1 border-b border-border pb-6">
        <p className="text-sm text-muted-foreground">Tournament report for {sponsor}</p>
        <h1 className="text-4xl leading-tight">{t.name}</h1>
        <p className="text-muted-foreground">
          {game?.name ?? t.game}, {new Date(t.start_time).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}. Hosted on Arena.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="font-score text-3xl font-bold leading-none">{s.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Winners</h2>
        {winners.length === 0 ? (
          <p className="text-muted-foreground">{t.status === 'completed' ? 'No prizes were paid.' : 'The tournament hasn’t finished yet.'}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 font-normal">Place</th>
                <th className="py-2 font-normal">Player</th>
                <th className="py-2 text-right font-normal">Prize</th>
              </tr>
            </thead>
            <tbody>
              {winners.map((w, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2">{place(w.final_position)}</td>
                  <td className="py-2 font-semibold">{w.gamertag || 'Player'}</td>
                  <td className="py-2 text-right font-score">{formatKES(Number(w.prize_won))}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2" colSpan={2}>
                  Total paid to players by M-Pesa
                </td>
                <td className="py-2 text-right font-score font-bold">{formatKES(paidOut)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl">Fair play</h2>
        <p className="text-muted-foreground">
          {data.disputes === 0
            ? 'Every result was agreed by both players.'
            : `${data.disputes} result${data.disputes === 1 ? ' was' : 's were'} disputed and settled from the players’ evidence by Arena’s referee process.`}
        </p>
      </section>

      {deals.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-border p-4">
          <h2 className="text-lg">Payment</h2>
          {deals.map((d, i) => (
            <dl key={i} className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <dt className="text-muted-foreground">Prize funded</dt>
              <dd className="font-score">{formatKES(Number(d.amount))}</dd>
              <dt className="text-muted-foreground">Hosting fee</dt>
              <dd className="font-score">{formatKES(Number(d.hosting_fee))}</dd>
              <dt className="text-muted-foreground">Paid via</dt>
              <dd>{d.paid_via || '—'}</dd>
              <dt className="text-muted-foreground">Reference</dt>
              <dd>{d.invoice_ref || '—'}</dd>
            </dl>
          ))}
        </section>
      )}

      <p className="border-t border-border pt-4 text-xs text-muted-foreground">Generated by Arena on {new Date().toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
    </div>
  );
}
