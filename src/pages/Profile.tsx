import { CalendarDays, Flame, MessageSquare, Share2, Swords, Trophy, UserPlus, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/arena/Rail';
import { LevelPanel, TierBadge } from '@/components/arena/LevelPanel';
import { LevelRing } from '@/components/arena/LevelRing';
import { SendChallengePanel } from '@/components/SendChallengePanel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessages } from '@/contexts/DirectMessageContext';
import { supabase } from '@/db/supabase';
import { usePlayerProgress } from '@/hooks/use-player-progress';
import { formatArenaCurrency, formatCompactNumber, formatEarnings } from '@/lib/arena-currency';
import { evaluateAchievements, getLevelInfo, RARITY_STYLES } from '@/lib/progression';
import { isOnline, PUBLIC_PROFILE_COLUMNS } from '@/lib/profile-columns';
import { shareLink } from '@/lib/share';
import { cn, formatRelativeTime } from '@/lib/utils';
import { GAME_INFO, type GameType, type Profile as ProfileType } from '@/types/database';

interface MatchRow {
  id: string;
  type: 'Quick match' | 'Tournament';
  game: string;
  tournamentName?: string;
  date: string;
  winnerId: string | null;
  stake: number;
  opponentId: string | null;
  status: string;
}

interface Payout {
  id: string;
  description: string | null;
  amount: number;
  created_at: string;
}

type Tab = 'matches' | 'payouts';

export default function Profile() {
  const { userId } = useParams<{ userId?: string }>();
  const { profile: me, user } = useAuth();
  const { friends, sendFriendRequest } = useDirectMessages();
  const navigate = useNavigate();
  const myProgress = usePlayerProgress();

  const isOwn = !userId || userId === user?.id;
  const [other, setOther] = useState<ProfileType | null>(null);
  const [loadingOther, setLoadingOther] = useState(!isOwn);
  const [matches, setMatches] = useState<MatchRow[] | null>(null);
  const [opponents, setOpponents] = useState<Record<string, { gamertag: string | null; avatar_url: string | null }>>({});
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [tab, setTab] = useState<Tab>('matches');
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [requested, setRequested] = useState(false);

  const player = isOwn ? me : other;
  const playerId = player?.id;

  useEffect(() => {
    if (isOwn || !userId) return;
    let cancelled = false;
    setLoadingOther(true);
    supabase
      .from('profiles')
      .select(PUBLIC_PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error('Error fetching profile:', error);
        setOther((data as ProfileType | null) ?? null);
        setLoadingOther(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOwn, userId]);

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    setMatches(null);
    (async () => {
      const [{ data: challenges }, { data: tMatches }] = await Promise.all([
        supabase
          .from('challenges')
          .select('id, game, status, winner_id, stake_amount, challenger_id, opponent_id, completed_at, created_at')
          .or(`challenger_id.eq.${playerId},opponent_id.eq.${playerId}`)
          .in('status', ['completed', 'cancelled'])
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('match_results')
          .select('id, status, winner_id, player1_id, player2_id, updated_at, tournaments(name, game)')
          .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
          .eq('status', 'confirmed')
          .order('updated_at', { ascending: false })
          .limit(15),
      ]);
      const rows: MatchRow[] = [
        ...(challenges || []).map((c) => ({
          id: `c-${c.id}`,
          type: 'Quick match' as const,
          game: c.game as string,
          date: (c.completed_at || c.created_at) as string,
          winnerId: c.winner_id as string | null,
          stake: Number(c.stake_amount) || 0,
          opponentId: (c.challenger_id === playerId ? c.opponent_id : c.challenger_id) as string | null,
          status: c.status as string,
        })),
        ...(tMatches || []).map((m) => {
          const t = (Array.isArray(m.tournaments) ? m.tournaments[0] : m.tournaments) as { name?: string; game?: string } | null;
          return {
            id: `t-${m.id}`,
            type: 'Tournament' as const,
            game: t?.game || '',
            tournamentName: t?.name,
            date: m.updated_at as string,
            winnerId: m.winner_id as string | null,
            stake: 0,
            opponentId: (m.player1_id === playerId ? m.player2_id : m.player1_id) as string | null,
            status: m.status as string,
          };
        }),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20);
      if (cancelled) return;
      setMatches(rows);

      const ids = [...new Set(rows.map((r) => r.opponentId).filter(Boolean))] as string[];
      if (ids.length) {
        const { data: opp } = await supabase.from('profiles').select('id, gamertag, avatar_url').in('id', ids);
        if (!cancelled) setOpponents(Object.fromEntries((opp || []).map((p) => [p.id, { gamertag: p.gamertag, avatar_url: p.avatar_url }])));
      }
    })().catch((e) => {
      console.error('Error fetching match history:', e);
      if (!cancelled) setMatches([]);
    });

    if (isOwn) {
      supabase
        .from('transactions')
        .select('id, description, amount, created_at')
        .eq('user_id', playerId)
        .in('type', ['payout', 'tournament_win', 'challenge_win'])
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => !cancelled && setPayouts((data as Payout[]) || []));
    }
    return () => {
      cancelled = true;
    };
  }, [playerId, isOwn]);

  const level = useMemo(() => getLevelInfo(player), [player]);

  // Own profile: full achievement state. Others: what their public stats prove.
  const badges = useMemo(() => {
    if (isOwn) return myProgress.achievements.filter((a) => a.unlocked);
    if (!player) return [];
    const quickMatches = (matches || []).filter((m) => m.type === 'Quick match' && m.status === 'completed').length;
    return evaluateAchievements({ profile: player, friendsCount: 0, gameAccountsCount: 0, challengesPlayed: quickMatches }).filter((a) => a.unlocked);
  }, [isOwn, myProgress.achievements, player, matches]);

  const recentForm = useMemo(
    () => (matches || []).filter((m) => m.winnerId).slice(0, 5).map((m) => m.winnerId === playerId),
    [matches, playerId],
  );

  if ((isOwn && !me) || loadingOther) return <ProfileSkeleton />;

  if (!player) {
    return (
      <EmptyState
        icon={<Trophy className="h-5 w-5" />}
        title="Player not found"
        description="This profile doesn’t exist or was removed."
        action={
          <Button asChild variant="outline">
            <Link to="/leaderboard">Browse the leaderboard</Link>
          </Button>
        }
      />
    );
  }

  const online = !isOwn && isOnline(player.last_seen_at);
  const isFriend = !isOwn && friends.some((f) => f.id === player.id);
  const total = (player.wins || 0) + (player.losses || 0);
  const winRate = total > 0 ? Math.round(((player.wins || 0) / total) * 100) : 0;
  const favGames = ((player.favorite_games as string[] | null) || []).filter((g) => GAME_INFO[g as GameType]) as GameType[];

  const share = () =>
    shareLink({
      title: `${player.gamertag} on Arena`,
      text: `${player.gamertag} is level ${level.level} on Arena with ${player.wins || 0} wins.`,
      url: `${window.location.origin}/profile/${player.id}`,
    });

  const addFriend = async () => {
    await sendFriendRequest(player.id);
    setRequested(true);
  };

  const stats = [
    { label: 'Wins', value: formatCompactNumber(player.wins || 0), tone: 'text-success' },
    { label: 'Losses', value: formatCompactNumber(player.losses || 0), tone: 'text-destructive' },
    { label: 'Win rate', value: `${winRate}%`, tone: '' },
    { label: 'Tournaments', value: formatCompactNumber(player.tournaments_played || 0), tone: '' },
    { label: 'Best streak', value: formatCompactNumber(player.longest_streak || 0), tone: '' },
    { label: 'Winnings', value: formatEarnings(player.total_earnings), tone: 'text-gold' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Player card */}
      <section className="surface relative overflow-hidden p-5 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-col items-center gap-6 md:flex-row md:items-start">
          <LevelRing level={level.level} progress={level.progress} size={132} stroke={7}>
            <Avatar className="h-[108px] w-[108px]">
              <AvatarImage src={player.avatar_url || undefined} alt="" />
              <AvatarFallback className="font-score text-4xl">{player.gamertag?.[0]?.toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
          </LevelRing>

          <div className="min-w-0 flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <h1 className="break-all text-4xl leading-none md:text-5xl">{player.gamertag || 'Player'}</h1>
              {player.role === 'admin' && <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary-soft">Staff</span>}
              {player.role === 'referee' && <span className="rounded-md bg-gold/10 px-2 py-0.5 text-xs font-semibold text-gold">Referee</span>}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground md:justify-start">
              <span className="flex items-center gap-1.5 font-score text-base text-foreground">
                Level {level.level} <TierBadge level={level.level} />
              </span>
              {online ? (
                <span className="flex items-center gap-1.5 text-success">
                  <span className="h-2 w-2 rounded-full bg-success" /> Online now
                </span>
              ) : (
                !isOwn &&
                player.last_seen_at && <span>Seen {formatRelativeTime(player.last_seen_at)}</span>
              )}
              {(player.current_streak || 0) >= 2 && (
                <span className="flex items-center gap-1 text-orange-400">
                  <Flame className="h-4 w-4" /> {player.current_streak} win streak
                </span>
              )}
              {player.created_at && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" /> Joined {new Date(player.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
            {player.bio && <p className="mx-auto mt-3 max-w-prose text-sm text-muted-foreground md:mx-0">{player.bio}</p>}

            {recentForm.length > 0 && (
              <div className="mt-4 flex items-center justify-center gap-1.5 md:justify-start" aria-label="Recent form">
                <span className="mr-1 text-xs text-muted-foreground">Form</span>
                {recentForm.map((won, i) => (
                  <span
                    key={i}
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-md font-score text-xs font-bold',
                      won ? 'bg-success/20 text-success' : 'bg-destructive/15 text-destructive',
                    )}
                  >
                    {won ? 'W' : 'L'}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
              {!isOwn && user && (
                <>
                  <Button onClick={() => setChallengeOpen(true)}>
                    <Swords /> Challenge
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/messages?user=${player.id}`)}>
                    <MessageSquare /> Message
                  </Button>
                  {!isFriend && (
                    <Button variant="outline" onClick={addFriend} disabled={requested}>
                      <UserPlus /> {requested ? 'Request sent' : 'Add friend'}
                    </Button>
                  )}
                </>
              )}
              {isOwn && (
                <>
                  <Button asChild variant="outline">
                    <Link to="/settings">Edit profile</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/wallet">
                      <Wallet /> {formatArenaCurrency(me?.arena_currency || 0)}
                    </Link>
                  </Button>
                </>
              )}
              <Button variant="ghost" onClick={share} aria-label="Share profile">
                <Share2 /> Share
              </Button>
            </div>
          </div>
        </div>

        <dl className="relative mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="bg-card px-3 py-3 text-center">
              <dd className={cn('font-score text-2xl font-bold leading-none md:text-3xl', s.tone)}>{s.value}</dd>
              <dt className="mt-1 text-xs text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>

      </section>

      {isOwn && <LevelPanel profile={player} />}

      {/* Trophy case */}
      <section className="surface p-5 md:p-6" aria-labelledby="trophy-title">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 id="trophy-title" className="text-2xl">
              Trophy case
            </h2>
            <p className="text-sm text-muted-foreground">
              {badges.length} achievement{badges.length === 1 ? '' : 's'} unlocked
            </p>
          </div>
          {isOwn && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/achievements">See all</Link>
            </Button>
          )}
        </div>
        {badges.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            {isOwn ? 'Play your first match to unlock your first achievement.' : 'No achievements yet.'}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {badges.map((a) => {
              const style = RARITY_STYLES[a.rarity];
              const Icon = a.icon;
              return (
                <li key={a.id} className={cn('flex items-center gap-3 rounded-xl p-3 ring-1', style.ring, style.bg)} title={a.description}>
                  <Icon className={cn('h-6 w-6 shrink-0', style.text)} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{a.title}</span>
                    <span className={cn('block text-xs', style.text)}>{style.label}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {favGames.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Plays</span>
            {favGames.map((g) => (
              <Link key={g} to={`/game/${g}`} className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-sm hover:border-primary/50">
                <img src={GAME_INFO[g].icon} alt="" className="h-6 w-6 rounded-full object-cover" loading="lazy" />
                {GAME_INFO[g].shortName}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section className="space-y-3">
        {isOwn && (
          <div className="flex gap-1 rounded-xl border border-border bg-card/60 p-1 sm:w-fit" role="tablist">
            {(
              [
                ['matches', 'Match history'],
                ['payouts', 'Winnings'],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none',
                  tab === key ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {!isOwn && <h2 className="text-2xl">Match history</h2>}

        {tab === 'matches' || !isOwn ? (
          matches === null ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <EmptyState
              icon={<Swords className="h-5 w-5" />}
              title="No matches yet"
              description={isOwn ? 'Your results appear here after your first quick match or tournament.' : 'Results appear here once they play.'}
              action={
                isOwn ? (
                  <Button asChild>
                    <Link to="/quick-match">Find a quick match</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-2">
              {matches.map((m) => {
                const won = m.winnerId === playerId;
                const decided = !!m.winnerId;
                const opp = m.opponentId ? opponents[m.opponentId] : undefined;
                const info = GAME_INFO[m.game as GameType];
                return (
                  <li key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/70 p-3">
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-score text-lg font-bold',
                        !decided ? 'bg-muted text-muted-foreground' : won ? 'bg-success/20 text-success' : 'bg-destructive/15 text-destructive',
                      )}
                    >
                      {!decided ? '–' : won ? 'W' : 'L'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {opp?.gamertag ? (
                          <>
                            vs{' '}
                            <Link to={`/profile/${m.opponentId}`} className="hover:text-primary-soft">
                              {opp.gamertag}
                            </Link>
                          </>
                        ) : (
                          m.tournamentName || m.type
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {info?.name || m.game || m.type}
                        {m.tournamentName && opp?.gamertag ? `, ${m.tournamentName}` : ''}
                        {m.status === 'cancelled' ? ', cancelled' : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {m.stake > 0 && <p className="font-score text-sm">{formatArenaCurrency(m.stake)}</p>}
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(m.date)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : payouts.length === 0 ? (
          <EmptyState icon={<Trophy className="h-5 w-5" />} title="No winnings yet" description="Prize money from tournaments and quick matches shows up here." />
        ) : (
          <ul className="space-y-2">
            {payouts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/70 p-3">
                <Trophy className="h-5 w-5 shrink-0 text-gold" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.description || 'Prize payout'}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(p.created_at)}</p>
                </div>
                <p className="shrink-0 font-score text-lg font-bold text-gold">+{formatEarnings(Math.abs(Number(p.amount)))}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isOwn && user && (
        <SendChallengePanel
          open={challengeOpen}
          onOpenChange={setChallengeOpen}
          opponent={{ user_id: player.id, gamertag: player.gamertag || 'Player', avatar_url: player.avatar_url, wins: player.wins || 0, losses: player.losses || 0 }}
        />
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="surface flex flex-col items-center gap-6 p-8 md:flex-row">
        <Skeleton className="h-32 w-32 rounded-full" />
        <div className="w-full flex-1 space-y-3">
          <Skeleton className="mx-auto h-10 w-56 md:mx-0" />
          <Skeleton className="mx-auto h-4 w-40 md:mx-0" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
