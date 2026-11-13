import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatKES } from '@/lib/arena-currency';

/** Settings > Delete account: blocked until winnings are withdrawn and nothing is in progress. */
export function DeleteAccount() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [blockers, setBlockers] = useState<string[] | null>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const play = Number(profile?.arena_currency || 0);
  const tickets = Number(profile?.entry_credit || 0);

  const check = async () => {
    const { data, error } = await supabase.rpc('account_deletion_blockers');
    if (error) {
      toast.error('Could not check your account. Try again.');
      return null;
    }
    const list = (data as string[] | null) || [];
    setBlockers(list);
    return list;
  };

  useEffect(() => {
    check();
  }, []);

  const start = async () => {
    const list = await check();
    if (list && list.length === 0) {
      setTyped('');
      setOpen(true);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', { body: { confirm: 'DELETE' } });
      if (error || data?.error) {
        let message = data?.error as string | undefined;
        if (!message && error && 'context' in error) {
          message = await (error as { context: Response }).context.json().then((b) => b?.error).catch(() => undefined);
        }
        throw new Error(message || error?.message || 'Could not delete your account');
      }
      setOpen(false);
      await signOut().catch(() => undefined);
      toast.success('Your account has been deleted.');
      navigate('/', { replace: true });
    } catch (e) {
      toast.error((e as Error).message);
      check();
    } finally {
      setDeleting(false);
    }
  };

  const blocked = !!blockers && blockers.length > 0;

  return (
    <section className="surface border-destructive/30 p-5 md:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
          <Trash2 className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl leading-tight">Delete account</h2>
          <p className="text-sm text-muted-foreground">Permanently remove your account and personal data. This can’t be undone.</p>
        </div>
      </div>

      {blocked && (
        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-2 text-sm font-semibold">Before you can delete your account:</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      <Button variant="destructive" onClick={start} disabled={blockers === null || blocked}>
        <Trash2 />
        Delete my account
      </Button>

      <Dialog open={open} onOpenChange={(o) => !deleting && setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete your account?
            </DialogTitle>
            <DialogDescription>This happens straight away and can’t be undone.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold">Deleted now</p>
              <p className="text-muted-foreground">
                Your gamertag, email, phone, M-Pesa number, profile, in-game IDs, ID photos, chats, messages, friends and notifications. You’ll be signed out and
                can’t sign in again.
              </p>
            </div>
            <div>
              <p className="font-semibold">Kept, with your name removed</p>
              <p className="text-muted-foreground">
                Payment and prize records and past match results, because the law requires us to keep financial records. They show as “Deleted player”.
              </p>
            </div>
            {(play > 0 || tickets > 0) && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive">
                You’ll lose {play > 0 ? `your ${formatKES(play)} play balance` : ''}
                {play > 0 && tickets > 0 ? ' and ' : ''}
                {tickets > 0 ? `${formatKES(tickets)} of welcome tickets` : ''}. Play balance can’t be withdrawn. Use it in a tournament first if you want to.
              </p>
            )}
            <div className="space-y-2 pt-1">
              <Label htmlFor="confirmDelete">
                Type <span className="font-mono font-semibold">DELETE</span> to confirm
              </Label>
              <Input id="confirmDelete" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={deleting} className="h-11" />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              Keep my account
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={typed.trim() !== 'DELETE' || deleting}>
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
