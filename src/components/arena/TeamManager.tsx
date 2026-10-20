import { Crown, Loader2, LogOut, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { cn } from '@/lib/utils';

const TEAM_SIZE = 5;

interface Member {
  id: string;
  user_id: string;
  role: string;
  profile: { gamertag: string | null; avatar_url: string | null } | null;
}

interface Team {
  id: string;
  name: string;
  captain_id: string;
  members: Member[];
}

/** Create and run a permanent 5-player squad for 5v5 quick matches. */
export function TeamManager({ onChange }: { onChange?: () => void }) {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [invite, setInvite] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    // The team you captain, else the team you play for
    const { data: own } = await supabase.from('teams').select('id, name, captain_id').eq('captain_id', user.id).limit(1).maybeSingle();
    let base = own as Omit<Team, 'members'> | null;
    if (!base) {
      const { data: membership } = await supabase.from('team_members').select('team_id, teams(id, name, captain_id)').eq('user_id', user.id).limit(1).maybeSingle();
      const t = membership ? (Array.isArray(membership.teams) ? membership.teams[0] : membership.teams) : null;
      base = (t as Omit<Team, 'members'> | null) ?? null;
    }
    if (!base) {
      setTeam(null);
      return;
    }
    const { data: rows } = await supabase.from('team_members').select('id, user_id, role').eq('team_id', base.id);
    const ids = (rows || []).map((r) => r.user_id);
    const { data: people } = ids.length ? await supabase.from('profiles').select('id, gamertag, avatar_url').in('id', ids) : { data: [] };
    setTeam({
      ...base,
      members: ((rows || []) as Omit<Member, 'profile'>[])
        .map((r) => ({ ...r, profile: (people || []).find((p) => p.id === r.user_id) || null }))
        .sort((a, b) => Number(b.user_id === base!.captain_id) - Number(a.user_id === base!.captain_id)),
    });
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const done = async () => {
    await load();
    onChange?.();
  };

  const create = async () => {
    if (!user) return;
    const teamName = name.trim();
    if (teamName.length < 3 || teamName.length > 24) return toast.error('Team names are 3 to 24 characters');
    setBusy(true);
    try {
      const { data, error } = await supabase.from('teams').insert({ name: teamName, captain_id: user.id }).select('id').single();
      if (error) throw error;
      const { error: mErr } = await supabase.from('team_members').insert({ team_id: data.id, user_id: user.id, role: 'captain' });
      if (mErr) throw mErr;
      toast.success(`${teamName} is ready. Add four teammates to start 5v5 matches.`);
      setName('');
      await done();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      toast.error(err.code === '23505' ? 'That team name is taken. Try another.' : err.message || 'Could not create the team');
    } finally {
      setBusy(false);
    }
  };

  const addMember = async () => {
    if (!team || !user) return;
    const tag = invite.trim().replace(/^@/, '');
    if (!tag) return;
    if (team.members.length >= TEAM_SIZE) return toast.error(`Teams have ${TEAM_SIZE} players`);
    setBusy(true);
    try {
      const { data: p } = await supabase.from('profiles').select('id, gamertag').eq('gamertag', tag).maybeSingle();
      if (!p) throw new Error(`No player called ${tag}. Check the spelling, gamertags are case-sensitive.`);
      if (team.members.some((m) => m.user_id === p.id)) throw new Error(`${p.gamertag} is already on the team`);
      const { data: elsewhere } = await supabase.from('team_members').select('id').eq('user_id', p.id).limit(1);
      if (elsewhere?.length) throw new Error(`${p.gamertag} already plays for another team`);
      const { error } = await supabase.from('team_members').insert({ team_id: team.id, user_id: p.id, role: 'member' });
      if (error) throw error;
      void supabase
        .from('notifications')
        .insert({ user_id: p.id, type: 'team', title: 'Added to a team', message: `You were added to ${team.name}. You can leave from Quick Match at any time.`, link: '/quick-match' })
        .then(
          () => undefined,
          () => undefined,
        );
      toast.success(`${p.gamertag} joined ${team.name}`);
      setInvite('');
      await done();
    } catch (e) {
      toast.error((e as Error).message || 'Could not add that player');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m: Member) => {
    setBusy(true);
    const { error } = await supabase.from('team_members').delete().eq('id', m.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(m.user_id === user?.id ? 'You left the team' : `${m.profile?.gamertag || 'Player'} removed`);
    await done();
  };

  const disband = async () => {
    if (!team || !window.confirm(`Disband ${team.name}? Every member is removed.`)) return;
    setBusy(true);
    const { error } = await supabase.from('teams').delete().eq('id', team.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${team.name} disbanded`);
    await done();
  };

  if (!user || team === undefined) return <div className="h-28 animate-pulse rounded-2xl bg-card" aria-busy="true" />;

  if (team === null) {
    return (
      <section className="surface p-5" aria-labelledby="team-title">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
            <Users className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="team-title" className="text-2xl">
              Start a squad
            </h2>
            <p className="text-sm text-muted-foreground">Create a team, add four teammates by gamertag, and challenge other squads to 5v5 matches.</p>
          </div>
        </div>
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name" maxLength={24} className="h-11 flex-1" aria-label="Team name" />
          <Button type="submit" disabled={busy || name.trim().length < 3} className="h-11">
            {busy ? <Loader2 className="animate-spin" /> : <Plus />} Create team
          </Button>
        </form>
      </section>
    );
  }

  const isCaptain = team.captain_id === user.id;
  const ready = team.members.length >= TEAM_SIZE;

  return (
    <section className="surface p-5" aria-labelledby="team-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="team-title" className="text-2xl">
            {team.name}
          </h2>
          <p className={cn('text-sm', ready ? 'text-success' : 'text-muted-foreground')}>
            {ready ? 'Full squad. You can send and accept 5v5 challenges.' : `${team.members.length} of ${TEAM_SIZE} players. Add ${TEAM_SIZE - team.members.length} more to play 5v5.`}
          </p>
        </div>
        {isCaptain ? (
          <Button variant="ghost" size="sm" onClick={disband} disabled={busy} className="text-muted-foreground">
            <Trash2 /> Disband
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => remove(team.members.find((m) => m.user_id === user.id)!)} disabled={busy}>
            <LogOut /> Leave team
          </Button>
        )}
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: TEAM_SIZE }, (_, i) => team.members[i]).map((m, i) =>
          m ? (
            <li key={m.id} className="flex items-center gap-2.5 rounded-xl border border-border bg-background/40 p-2.5">
              <Avatar className="h-9 w-9">
                <AvatarImage src={m.profile?.avatar_url || undefined} alt="" />
                <AvatarFallback className="text-xs">{m.profile?.gamertag?.[0]?.toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{m.profile?.gamertag || 'Player'}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {m.user_id === team.captain_id ? (
                    <>
                      <Crown className="h-3 w-3 text-gold" /> Captain
                    </>
                  ) : (
                    'Member'
                  )}
                </span>
              </span>
              {isCaptain && m.user_id !== team.captain_id && (
                <button type="button" onClick={() => remove(m)} disabled={busy} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive" aria-label={`Remove ${m.profile?.gamertag}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ) : (
            <li key={`empty-${i}`} className="flex items-center justify-center rounded-xl border border-dashed border-border p-2.5 text-sm text-muted-foreground">
              Open slot
            </li>
          ),
        )}
      </ul>

      {isCaptain && !ready && (
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            addMember();
          }}
        >
          <Input value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="Teammate's gamertag" className="h-11 flex-1" aria-label="Teammate's gamertag" />
          <Button type="submit" disabled={busy || !invite.trim()} className="h-11">
            {busy ? <Loader2 className="animate-spin" /> : <UserPlus />} Add player
          </Button>
        </form>
      )}
    </section>
  );
}
