import { Download, Gamepad2, Loader2, Lock, Save, Trash2, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { useInstallPrompt } from '@/hooks/use-install-prompt';
import { invalidatePlayerProgress } from '@/hooks/use-player-progress';
import { GAME_INFO, type GameType } from '@/types/database';

interface GameAccountRow {
  id: string;
  game: GameType;
  in_game_name: string;
}

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="surface p-5 md:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">{icon}</span>
        <div>
          <h2 className="text-xl leading-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

const sanitizeTwitch = (value: string) => {
  let v = value.trim();
  if (v.includes('twitch.tv/')) v = v.split('twitch.tv/').pop()?.split('/')[0] || v;
  return v.replace(/^@/, '');
};

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const { canInstall, install } = useInstallPrompt();

  const [gamertag, setGamertag] = useState('');
  const [twitchHandle, setTwitchHandle] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [accounts, setAccounts] = useState<GameAccountRow[]>([]);
  const [newGame, setNewGame] = useState<GameType | ''>('');
  const [newName, setNewName] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Fill the form once the profile has loaded (it may arrive after first render)
  useEffect(() => {
    if (!profile) return;
    setGamertag(profile.gamertag || '');
    setTwitchHandle(profile.twitch_handle || '');
  }, [profile?.id, profile?.gamertag, profile?.twitch_handle]);

  const loadAccounts = React.useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('game_accounts').select('id, game, in_game_name').eq('user_id', user.id).order('created_at');
    if (error) console.error('Error loading game accounts:', error);
    setAccounts((data as GameAccountRow[]) || []);
  }, [user]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const tag = gamertag.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(tag)) {
      toast.error('Gamertags are 3–20 letters, numbers or underscores');
      return;
    }
    setLoadingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ gamertag: tag, twitch_handle: sanitizeTwitch(twitchHandle) || null })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Profile saved');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error?.code === '23505' ? 'That gamertag is taken. Try another.' : error.message || 'Could not save your profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const saveAccount = async (game: GameType, name: string) => {
    if (!user || !name.trim()) return;
    setSavingAccount(true);
    try {
      const { error } = await supabase
        .from('game_accounts')
        .upsert({ user_id: user.id, game, in_game_name: name.trim() }, { onConflict: 'user_id,game' });
      if (error) throw error;
      invalidatePlayerProgress(user.id);
      toast.success(`${GAME_INFO[game].name} ID saved`);
      setNewGame('');
      setNewName('');
      await loadAccounts();
    } catch (error: any) {
      toast.error(error.message || 'Could not save that ID');
    } finally {
      setSavingAccount(false);
    }
  };

  const removeAccount = async (row: GameAccountRow) => {
    const { error } = await supabase.from('game_accounts').delete().eq('id', row.id);
    if (error) {
      toast.error(error.message || 'Could not remove that ID');
      return;
    }
    if (user) invalidatePlayerProgress(user.id);
    toast.success(`${GAME_INFO[row.game]?.name ?? row.game} ID removed`);
    loadAccounts();
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    if (!currentPassword || !newPassword || !confirmPassword) return toast.error('Fill in all three password fields');
    if (newPassword !== confirmPassword) return toast.error('The new passwords don’t match');
    if (newPassword.length < 6) return toast.error('Use at least 6 characters');
    if (newPassword === currentPassword) return toast.error('Choose a password you haven’t used here');

    setLoadingPassword(true);
    try {
      // Confirm the current password first. Previously it was collected but
      // never checked, so anyone with an unlocked session could change it.
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verifyError) {
        toast.error('Your current password is incorrect');
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Could not update your password');
    } finally {
      setLoadingPassword(false);
    }
  };

  const usedGames = new Set(accounts.map((a) => a.game));
  const availableGames = (Object.keys(GAME_INFO) as GameType[]).filter((g) => !usedGames.has(g));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-4xl">Settings</h1>
        <p className="text-muted-foreground">Your gamer profile, in-game IDs and security.</p>
      </div>

      <Section icon={<User className="h-5 w-5" />} title="Profile" description="How other players see you.">
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gamertag">Gamertag</Label>
              <Input id="gamertag" value={gamertag} onChange={(e) => setGamertag(e.target.value)} disabled={loadingProfile} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitch">Twitch channel</Label>
              <Input id="twitch" placeholder="your_channel" value={twitchHandle} onChange={(e) => setTwitchHandle(e.target.value)} disabled={loadingProfile} className="h-11" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Streaming is required for some matches. Your channel is shown to opponents and spectators.</p>
          <Button type="submit" disabled={loadingProfile}>
            {loadingProfile ? <Loader2 className="animate-spin" /> : <Save />}
            Save profile
          </Button>
        </form>
      </Section>

      <Section icon={<Gamepad2 className="h-5 w-5" />} title="In-game IDs" description="Opponents and referees use these to find you in the match lobby.">
        <div className="space-y-2">
          {accounts.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No IDs yet. Add one for each game you compete in.</p>}
          {accounts.map((row) => (
            <GameAccountItem key={row.id} row={row} onSave={saveAccount} onRemove={removeAccount} saving={savingAccount} />
          ))}
        </div>
        {availableGames.length > 0 && (
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (newGame) saveAccount(newGame, newName);
            }}
          >
            <select
              aria-label="Game"
              value={newGame}
              onChange={(e) => setNewGame(e.target.value as GameType)}
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm sm:w-48"
            >
              <option value="">Choose a game</option>
              {availableGames.map((g) => (
                <option key={g} value={g}>
                  {GAME_INFO[g].name}
                </option>
              ))}
            </select>
            <Input aria-label="In-game name" placeholder="Name or player ID" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-11 flex-1" />
            <Button type="submit" disabled={!newGame || !newName.trim() || savingAccount} className="h-11">
              Add ID
            </Button>
          </form>
        )}
      </Section>

      <Section icon={<Lock className="h-5 w-5" />} title="Password" description="Confirm your current password to set a new one.">
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input id="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={loadingPassword} className="h-11 sm:max-w-sm" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loadingPassword} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input id="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loadingPassword} className="h-11" />
            </div>
          </div>
          <Button type="submit" disabled={loadingPassword}>
            {loadingPassword ? <Loader2 className="animate-spin" /> : <Lock />}
            Update password
          </Button>
        </form>
      </Section>

      {canInstall && (
        <Section icon={<Download className="h-5 w-5" />} title="Arena app" description="Add Arena to your home screen for one-tap access and full-screen play.">
          <Button
            variant="outline"
            onClick={async () => {
              if (await install()) toast.success('Arena is on your home screen');
            }}
          >
            <Download />
            Install app
          </Button>
        </Section>
      )}
    </div>
  );
}

function GameAccountItem({
  row,
  onSave,
  onRemove,
  saving,
}: {
  row: GameAccountRow;
  onSave: (game: GameType, name: string) => void;
  onRemove: (row: GameAccountRow) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(row.in_game_name);
  const info = GAME_INFO[row.game];
  const changed = value.trim() !== row.in_game_name;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-2 pl-3">
      <img src={info?.icon} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" loading="lazy" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{info?.name ?? row.game}</p>
        <input
          aria-label={`${info?.name ?? row.game} ID`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-transparent text-sm font-semibold outline-none"
        />
      </div>
      {changed && (
        <Button size="sm" onClick={() => onSave(row.game, value)} disabled={saving || !value.trim()}>
          Save
        </Button>
      )}
      <Button size="icon" variant="ghost" onClick={() => onRemove(row)} aria-label={`Remove ${info?.name ?? row.game} ID`}>
        <Trash2 className="text-muted-foreground" />
      </Button>
    </div>
  );
}
