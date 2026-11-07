import { Check, Gavel, MessageCircle, ShieldOff, Trophy, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { RefereeApplicationChat } from '@/components/RefereeApplicationChat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { cn } from '@/lib/utils';
import { GAME_INFO, type GameType } from '@/types/database';

type AppStatus = 'pending' | 'approved' | 'rejected' | 'closed' | 'terminated';

interface Application {
  id: string;
  user_id: string;
  status: AppStatus;
  created_at: string;
  tournament_id: string | null;
  profiles: { gamertag: string; avatar_url: string | null } | null;
  tournaments: { name: string; game: GameType; status: string } | null;
}

interface Assignment {
  id: string;
  user_id: string;
  game: GameType;
  tournament_id: string | null;
  profiles: { gamertag: string; avatar_url: string | null } | null;
  tournaments: { name: string; status: string } | null;
}

const GAMES = Object.keys(GAME_INFO) as GameType[];

const STATUS_STYLE: Record<AppStatus, string> = {
  pending: 'bg-gold/15 text-gold',
  approved: 'bg-success/15 text-success',
  rejected: 'bg-destructive/15 text-destructive',
  closed: 'bg-white/[0.06] text-muted-foreground',
  terminated: 'bg-destructive/15 text-destructive',
};

/** Admins only; everyone else goes back to the dashboard. */
export default function AdminReferees() {
  const { user, profile, loading } = useAuth();
  if (!loading && (!user || (profile && profile.role !== 'admin'))) return <Navigate to="/dashboard" replace />;
  if (!profile) return null;
  return <AdminRefereesPanel />;
}

function Person({ name, avatar, size = 'h-10 w-10' }: { name?: string; avatar?: string | null; size?: string }) {
  return (
    <Avatar className={cn(size, 'shrink-0 border border-white/10 bg-white/5')}>
      <AvatarImage src={avatar || undefined} />
      <AvatarFallback className="bg-white/5 text-sm">{(name || '?')[0]?.toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

function AdminRefereesPanel() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<Application | null>(null);
  const [standing, setStanding] = useState(false);
  const [games, setGames] = useState<GameType[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [terminating, setTerminating] = useState<{ user_id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    const [a, r] = await Promise.all([
      supabase
        .from('referee_applications')
        .select('id, user_id, status, created_at, tournament_id, profiles(gamertag, avatar_url), tournaments(name, game, status)')
        .order('created_at', { ascending: false }),
      supabase
        .from('referee_assignments')
        .select('id, user_id, game, tournament_id, profiles(gamertag, avatar_url), tournaments(name, status)')
        .order('created_at', { ascending: false }),
    ]);
    if (a.error) toast.error('Could not load applications');
    if (r.error) toast.error('Could not load referees');
    setApps((a.data || []) as unknown as Application[]);
    setAssignments((r.data || []) as unknown as Assignment[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = apps.filter((a) => a.status === 'pending');
  const listed = showAll ? apps : pending;

  // One row per referee, with every game/tournament they cover
  const referees = useMemo(() => {
    const byUser = new Map<string, { user_id: string; name: string; avatar: string | null; scopes: Assignment[] }>();
    for (const a of assignments) {
      const row = byUser.get(a.user_id) || { user_id: a.user_id, name: a.profiles?.gamertag || 'Player', avatar: a.profiles?.avatar_url || null, scopes: [] };
      row.scopes.push(a);
      byUser.set(a.user_id, row);
    }
    return [...byUser.values()];
  }, [assignments]);

  const openApp = (app: Application) => {
    setSelected(app);
    setStanding(!app.tournament_id);
    setGames(app.tournaments?.game ? [app.tournaments.game] : []);
  };

  const approve = async () => {
    if (!selected) return;
    if (standing && games.length === 0) return void toast.error('Pick at least one game');
    setBusy(true);
    const { error } = await supabase.rpc('admin_approve_referee', { p_app: selected.id, p_standing: standing, p_games: standing ? games : null });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success(standing ? 'Approved for all upcoming tournaments in those games' : 'Approved for this tournament only');
    setSelected(null);
    void load();
  };

  const reject = async () => {
    if (!selected) return;
    setBusy(true);
    const { error } = await supabase.rpc('admin_reject_referee', { p_app: selected.id });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success('Application rejected');
    setSelected(null);
    void load();
  };

  const closeAll = async () => {
    const { data, error } = await supabase.rpc('admin_close_referee_applications');
    setConfirmClose(false);
    if (error) return void toast.error(error.message);
    toast.success(`Closed ${data ?? 0} pending application${data === 1 ? '' : 's'}`);
    void load();
  };

  const terminate = async () => {
    if (!terminating) return;
    const { data, error } = await supabase.rpc('admin_terminate_referee', { p_user: terminating.user_id });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${terminating.name} is no longer a referee`, { description: data ? `${data} open dispute${data === 1 ? '' : 's'} handed to another referee.` : undefined });
    }
    setTerminating(null);
    void load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Referees</h1>
          <p className="text-muted-foreground">
            Approve someone for one tournament (their role ends with it) or for every upcoming tournament in a game.
          </p>
        </div>
        <Button variant="outline" disabled={pending.length === 0} onClick={() => setConfirmClose(true)}>
          <X /> Close all pending{pending.length ? ` (${pending.length})` : ''}
        </Button>
      </div>

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">Applications{pending.length ? ` · ${pending.length}` : ''}</TabsTrigger>
          <TabsTrigger value="referees">Referees · {referees.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{showAll ? 'All applications' : 'Waiting for a decision'}</p>
            <button type="button" className="text-sm font-medium text-primary-soft hover:underline" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show pending only' : 'Show all'}
            </button>
          </div>

          <div className="glass overflow-hidden rounded-2xl">
            {loading ? (
              <p className="p-8 text-center text-muted-foreground">Loading…</p>
            ) : listed.length === 0 ? (
              <div className="p-10 text-center">
                <Gavel className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 font-medium">{showAll ? 'No applications yet' : 'No pending applications'}</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {listed.map((app) => (
                  <li key={app.id}>
                    <button
                      type="button"
                      onClick={() => openApp(app)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03] sm:px-5"
                    >
                      <Person name={app.profiles?.gamertag} avatar={app.profiles?.avatar_url} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{app.profiles?.gamertag || 'Player'}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {app.tournaments ? (
                            <>
                              <Trophy className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
                              {app.tournaments.name} · {GAME_INFO[app.tournaments.game]?.name ?? app.tournaments.game}
                            </>
                          ) : (
                            'General application (no tournament)'
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', STATUS_STYLE[app.status])}>{app.status}</span>
                        <span className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="referees" className="mt-4">
          <div className="glass overflow-hidden rounded-2xl">
            {referees.length === 0 ? (
              <div className="p-10 text-center">
                <Gavel className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 font-medium">No active referees</p>
                <p className="text-sm text-muted-foreground">Approve an application to add one.</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {referees.map((r) => (
                  <li key={r.user_id} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
                    <Person name={r.name} avatar={r.avatar} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {r.scopes.map((s) => (
                          <span
                            key={s.id}
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-xs font-medium',
                              s.tournament_id ? 'bg-white/[0.06] text-foreground' : 'bg-primary/15 text-primary-soft',
                            )}
                          >
                            {s.tournament_id ? `${s.tournaments?.name ?? 'Tournament'} (ends with it)` : `All ${GAME_INFO[s.game]?.name ?? s.game} tournaments`}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => setTerminating({ user_id: r.user_id, name: r.name })}>
                      <ShieldOff /> Terminate
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Application detail: decision + chat */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-center gap-3">
                  <Person name={selected.profiles?.gamertag} avatar={selected.profiles?.avatar_url} size="h-12 w-12" />
                  <div className="min-w-0">
                    <SheetTitle className="truncate">{selected.profiles?.gamertag || 'Player'}</SheetTitle>
                    <SheetDescription className="truncate">
                      {selected.tournaments ? `Wants to referee ${selected.tournaments.name}` : 'General referee application'}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {selected.status === 'pending' ? (
                <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-semibold">Approve for</p>
                  <div className="grid gap-2">
                    {selected.tournament_id && (
                      <label className={cn('flex cursor-pointer gap-3 rounded-xl border p-3', !standing ? 'border-primary/50 bg-primary/10' : 'border-white/10')}>
                        <input type="radio" name="scope" className="mt-1 accent-[hsl(var(--primary))]" checked={!standing} onChange={() => setStanding(false)} />
                        <span>
                          <span className="block text-sm font-medium">This tournament only</span>
                          <span className="block text-xs text-muted-foreground">Referee role ends when {selected.tournaments?.name} ends.</span>
                        </span>
                      </label>
                    )}
                    <label className={cn('flex cursor-pointer gap-3 rounded-xl border p-3', standing ? 'border-primary/50 bg-primary/10' : 'border-white/10')}>
                      <input type="radio" name="scope" className="mt-1 accent-[hsl(var(--primary))]" checked={standing} onChange={() => setStanding(true)} />
                      <span>
                        <span className="block text-sm font-medium">All upcoming tournaments in these games</span>
                        <span className="block text-xs text-muted-foreground">Stays a referee until you terminate them.</span>
                      </span>
                    </label>
                  </div>
                  {standing && (
                    <div className="grid grid-cols-2 gap-2">
                      {GAMES.map((g) => (
                        <div key={g} className="flex items-center gap-2">
                          <Checkbox
                            id={`game-${g}`}
                            checked={games.includes(g)}
                            onCheckedChange={(c) => setGames((prev) => (c ? [...prev, g] : prev.filter((x) => x !== g)))}
                          />
                          <Label htmlFor={`game-${g}`} className="text-sm font-normal">{GAME_INFO[g].name}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button className="flex-1" onClick={approve} disabled={busy}>
                      <Check /> Approve
                    </Button>
                    <Button variant="outline" className="flex-1 text-destructive" onClick={reject} disabled={busy}>
                      <X /> Reject
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-6 rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
                  This application is <span className="font-semibold capitalize text-foreground">{selected.status}</span>.
                </p>
              )}

              <div className="mt-6">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <MessageCircle className="h-4 w-4" /> Chat with the applicant
                </p>
                {user && <RefereeApplicationChat applicationId={selected.id} userId={user.id} isAdmin />}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close all {pending.length} pending applications?</AlertDialogTitle>
            <AlertDialogDescription>Applicants see their application as closed. Approved referees are not affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={closeAll}>Close all</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!terminating} onOpenChange={(o) => !o && setTerminating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End {terminating?.name}’s referee role?</AlertDialogTitle>
            <AlertDialogDescription>
              They lose every game and tournament they referee, and any dispute they’re deciding goes to another referee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={terminate}>
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
