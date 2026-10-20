import { AlertTriangle, BadgeCheck, CheckCircle2, ChevronRight, Gavel, Loader2, Radio, ShieldCheck, ShieldAlert, Timer, Trophy, Users, Wallet } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AdminDisputes } from '@/components/admin/AdminDisputes';
import type { Dispute } from '@/components/disputes/evidence';
import { AdminMoney, type TournamentRevenue } from '@/components/admin/AdminMoney';
import { AdminPlayers } from '@/components/admin/AdminPlayers';
import { AdminTournaments } from '@/components/admin/AdminTournaments';
import FinanceAnalytics from '@/components/admin/FinanceAnalytics';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatArenaCurrency, formatCompactNumber } from '@/lib/arena-currency';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'disputes' | 'players' | 'tournaments' | 'money' | 'analytics';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'disputes', label: 'Disputes' },
  { id: 'players', label: 'Players' },
  { id: 'tournaments', label: 'Tournaments' },
  { id: 'money', label: 'Money' },
  { id: 'analytics', label: 'Analytics' },
];

interface Snapshot {
  players: number;
  online: number;
  newThisWeek: number;
  liveMatches: number;
  openTournaments: number;
  kycPending: number;
  refereeApps: number;
  payoutReviews: number;
  amlFlags: number;
  revenueMonth: number;
  revenueTotal: number;
  revenueBalance: number;
}

const EMPTY: Snapshot = { players: 0, online: 0, newThisWeek: 0, liveMatches: 0, openTournaments: 0, kycPending: 0, refereeApps: 0, payoutReviews: 0, amlFlags: 0, revenueMonth: 0, revenueTotal: 0, revenueBalance: 0 };

function TaskTile({ icon, count, label, action, onClick, to, urgent = true }: { icon: ReactNode; count: number; label: string; action: string; onClick?: () => void; to?: string; urgent?: boolean }) {
  const body = (
    <>
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', urgent && count > 0 ? 'bg-live/15 text-live' : urgent ? 'bg-secondary text-muted-foreground' : 'bg-primary/15 text-primary-soft')}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="font-score text-2xl font-bold leading-none">{count}</span>
          <span className="truncate text-sm font-semibold">{label}</span>
        </span>
        <span className="block text-xs text-muted-foreground">{action}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </>
  );
  const cls = 'flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'gold' | 'live' }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-score text-3xl font-bold leading-none', tone === 'gold' && 'text-gold', tone === 'live' && 'text-live')}>{value}</p>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [snap, setSnap] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [revenueRows, setRevenueRows] = useState<TournamentRevenue[]>([]);
  const [processing, setProcessing] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!user) navigate('/dashboard');
    else if (profile && !isAdmin) {
      toast.error('Admins only');
      navigate('/dashboard');
    }
  }, [user, profile, isAdmin, navigate]);

  const loadDisputes = useCallback(async () => {
    const { data } = await supabase.from('disputes').select('*').not('status', 'in', '(decided,void)').order('created_at', { ascending: true }).limit(200);
    const list = (data || []) as Dispute[];
    setDisputes(list);
    const ids = [...new Set(list.flatMap((d) => [d.player1_id, d.player2_id, d.referee_id]).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: people } = await supabase.from('profiles').select('id, gamertag').in('id', ids);
      setNames(Object.fromEntries(((people || []) as { id: string; gamertag: string | null }[]).map((p) => [p.id, p.gamertag || 'Player'])));
    }
  }, []);

  const loadSnapshot = useCallback(async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const head = { count: 'exact' as const, head: true };
    const [players, online, fresh, liveQ, liveT, openT, kyc, apps, finishedT, doneQ, settings, reviews, aml] = await Promise.all([
      supabase.from('profiles').select('id', head),
      supabase.from('profiles').select('id', head).gte('last_seen_at', new Date(Date.now() - 5 * 60_000).toISOString()),
      supabase.from('profiles').select('id', head).gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString()),
      supabase.from('challenges').select('id', head).eq('status', 'accepted').not('match_started_at', 'is', null),
      supabase.from('match_results').select('id', head).eq('both_players_ready', true).neq('status', 'confirmed'),
      supabase.from('tournaments').select('id', head).eq('status', 'open'),
      supabase.from('profiles').select('id', head).eq('kyc_status', 'pending'),
      supabase.from('referee_applications').select('id', head).eq('status', 'pending'),
      supabase.from('tournaments').select('id, name, game, prize_pool, platform_fee_percentage, start_time, current_players').eq('status', 'completed').order('start_time', { ascending: false }).limit(500),
      supabase.from('challenges').select('platform_fee, completed_at').eq('status', 'completed').limit(5000),
      supabase.from('platform_settings').select('maintenance_balance').maybeSingle(),
      supabase.from('mpesa_withdrawals').select('id', head).eq('status', 'review'),
      supabase.from('aml_flags').select('id', head).is('resolved_at', null).neq('severity', 'info'),
    ]);

    const rows: TournamentRevenue[] = ((finishedT.data || []) as any[]).map((t) => ({
      id: t.id,
      name: t.name,
      game: t.game,
      prize_pool: Number(t.prize_pool) || 0,
      platform_fee: (Number(t.prize_pool) || 0) * ((Number(t.platform_fee_percentage) || 0) / 100),
      start_time: t.start_time,
      current_players: t.current_players || 0,
    }));
    setRevenueRows(rows);
    const qFees = (doneQ.data || []) as { platform_fee: number | null; completed_at: string | null }[];
    const total = rows.reduce((s, t) => s + t.platform_fee, 0) + qFees.reduce((s, c) => s + Number(c.platform_fee || 0), 0);
    const month = rows.filter((t) => t.start_time >= monthStart).reduce((s, t) => s + t.platform_fee, 0) + qFees.filter((c) => (c.completed_at || '') >= monthStart).reduce((s, c) => s + Number(c.platform_fee || 0), 0);

    setSnap({
      players: players.count || 0,
      online: online.count || 0,
      newThisWeek: fresh.count || 0,
      liveMatches: (liveQ.count || 0) + (liveT.count || 0),
      openTournaments: openT.count || 0,
      kycPending: kyc.count || 0,
      refereeApps: apps.count || 0,
      payoutReviews: reviews.count || 0,
      amlFlags: aml.count || 0,
      revenueMonth: month,
      revenueTotal: total,
      revenueBalance: Number((settings.data as { maintenance_balance?: number } | null)?.maintenance_balance || 0),
    });
  }, []);

  const loadAll = useCallback(async () => {
    try {
      await Promise.all([loadSnapshot(), loadDisputes()]);
    } catch (e) {
      console.error('Admin load failed:', e);
      toast.error('Some admin data failed to load');
    } finally {
      setLoading(false);
    }
  }, [loadSnapshot, loadDisputes]);

  useEffect(() => {
    if (!isAdmin) return;
    loadAll();
    const t = setInterval(() => document.visibilityState === 'visible' && loadAll(), 60_000);
    return () => clearInterval(t);
  }, [isAdmin, loadAll]);

  const processDeadlines = async () => {
    setProcessing(true);
    const { error } = await supabase.rpc('expire_old_challenges');
    setProcessing(false);
    if (error) return void toast.error('Could not process deadlines');
    toast.success('Expired challenges and missed check-ins processed');
    loadAll();
  };

  if (!isAdmin || !user) return null;

  const disputeCount = disputes.filter((d) => d.status === 'human_review').length;
  const allClear = disputeCount + snap.kycPending + snap.refereeApps + snap.payoutReviews + snap.amlFlags === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Admin</h1>
          <p className="text-muted-foreground">
            {loading ? 'Loading the latest numbers…' : `${formatCompactNumber(snap.online)} online now, ${formatCompactNumber(snap.liveMatches)} matches live.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={processDeadlines} disabled={processing}>
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Timer className="h-4 w-4" />}
            Process deadlines
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/referees">
              <Gavel className="h-4 w-4" /> Referees
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/kyc">
              <ShieldCheck className="h-4 w-4" /> KYC
            </Link>
          </Button>
        </div>
      </div>

      <div role="tablist" aria-label="Admin sections" className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 scrollbar-hide md:mx-0 md:px-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors',
              tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {t.id === 'disputes' && disputeCount > 0 && <span className="rounded-full bg-live px-1.5 font-score text-xs text-white">{disputeCount}</span>}
            {t.id === 'money' && snap.payoutReviews + snap.amlFlags > 0 && <span className="rounded-full bg-gold px-1.5 font-score text-xs text-black">{snap.payoutReviews + snap.amlFlags}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-xl">Needs you</h2>
            {allClear && !loading ? (
              <p className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-success" /> All clear. No disputes, payouts, flags, KYC reviews or referee applications waiting.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <TaskTile icon={<AlertTriangle className="h-5 w-5" />} count={disputeCount} label="disputes need a person" action="AI wasn’t sure or a player appealed" onClick={() => setTab('disputes')} />
                <TaskTile icon={<BadgeCheck className="h-5 w-5" />} count={snap.kycPending} label="KYC reviews" action="Check ID documents" to="/admin/kyc" />
                <TaskTile icon={<Gavel className="h-5 w-5" />} count={snap.refereeApps} label="referee applications" action="Approve or decline" to="/admin/referees" />
                <TaskTile icon={<Wallet className="h-5 w-5" />} count={snap.payoutReviews} label="withdrawals to review" action="Approve or decline" onClick={() => setTab('money')} />
                <TaskTile icon={<ShieldAlert className="h-5 w-5" />} count={snap.amlFlags} label="laundering flags" action="Review frozen winnings" onClick={() => setTab('money')} />
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl">Today</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Players" value={formatCompactNumber(snap.players)} note={`${formatCompactNumber(snap.newThisWeek)} joined this week`} />
              <Stat label="Online now" value={formatCompactNumber(snap.online)} note="Active in the last 5 minutes" />
              <Stat label="Live matches" value={formatCompactNumber(snap.liveMatches)} note="Quick and tournament" tone={snap.liveMatches > 0 ? 'live' : undefined} />
              <Stat label="Open tournaments" value={formatCompactNumber(snap.openTournaments)} note="Taking registrations" />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl">Revenue</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="This month" value={formatArenaCurrency(snap.revenueMonth)} tone="gold" />
              <Stat label="All time" value={formatArenaCurrency(snap.revenueTotal)} />
              <Stat label="Ready to withdraw" value={formatArenaCurrency(snap.revenueBalance)} note="Platform wallet" />
            </div>
          </section>

          <section className="grid gap-2 sm:grid-cols-3">
            <TaskTile icon={<Users className="h-5 w-5" />} count={snap.players} label="players" urgent={false} action="Search and review accounts" onClick={() => setTab('players')} />
            <TaskTile icon={<Trophy className="h-5 w-5" />} count={snap.openTournaments} label="open tournaments" urgent={false} action="Feature on the home page" onClick={() => setTab('tournaments')} />
            <TaskTile icon={<Radio className="h-5 w-5" />} count={snap.liveMatches} label="live now" urgent={false} action="Watch streams" to="/streams" />
          </section>
        </div>
      )}

      {tab === 'disputes' && <AdminDisputes disputes={disputes} names={names} />}
      {tab === 'players' && <AdminPlayers />}
      {tab === 'tournaments' && <AdminTournaments />}
      {tab === 'money' && <AdminMoney revenueBalance={snap.revenueBalance} tournaments={revenueRows} currentUserId={user.id} onChanged={loadSnapshot} />}
      {tab === 'analytics' && <FinanceAnalytics />}
    </div>
  );
}
