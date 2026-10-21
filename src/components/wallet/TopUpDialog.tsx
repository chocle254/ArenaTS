import { CheckCircle2, Loader2, Smartphone, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { formatKES } from '@/lib/arena-currency';
import { cn } from '@/lib/utils';
import { DEPOSIT_FEE_RATE, DEPOSIT_MAX, DEPOSIT_MIN, depositFee, depositStatus, isKenyanMobile, maskPhone, startDeposit } from './mpesa';

const AMOUNTS = [100, 500, 1000, 2000];

type Stage = 'form' | 'waiting' | 'done' | 'failed';

/**
 * M-Pesa top-up: STK prompt on the player's phone, then we wait for the
 * payment to confirm. Money lands in the play balance (not withdrawable).
 */
export function TopUpDialog({
  open,
  onOpenChange,
  suggested,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Pre-fill, e.g. the shortfall for a tournament entry */
  suggested?: number;
  onPaid?: () => void;
}) {
  const { profile, refreshProfile } = useAuth();
  const linked = (profile as { mpesa_phone?: string | null } | null)?.mpesa_phone || null;
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number>(500);
  const [custom, setCustom] = useState('');
  const [stage, setStage] = useState<Stage>('form');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setStage('form');
    setMessage('');
    setBusy(false);
    setPhone(linked ? `0${linked.slice(3)}` : (profile?.phone as string | undefined) || '');
    if (suggested && suggested > 0) {
      const s = Math.max(DEPOSIT_MIN, Math.ceil(suggested / (1 - DEPOSIT_FEE_RATE)));
      setCustom(String(s));
    } else setCustom('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
  }, []);

  const value = custom ? Math.round(Number(custom)) || 0 : amount;
  const fee = depositFee(value);
  const valid = value >= DEPOSIT_MIN && value <= DEPOSIT_MAX && isKenyanMobile(phone);

  const stopPolling = () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = null;
  };

  const pay = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      const dep = await startDeposit(phone, value);
      setStage('waiting');
      const started = Date.now();
      pollRef.current = window.setInterval(async () => {
        try {
          const s = await depositStatus(dep.id);
          if (s.status === 'completed') {
            stopPolling();
            setStage('done');
            setMessage(`${formatKES(dep.credit)} added to your play balance.`);
            await refreshProfile();
            onPaid?.();
          } else if (s.status !== 'pending') {
            stopPolling();
            setStage('failed');
            setMessage(s.status === 'cancelled' ? 'You cancelled the M-Pesa prompt.' : s.status === 'timeout' ? 'The M-Pesa prompt timed out.' : 'The payment didn’t go through.');
          } else if (Date.now() - started > 150_000) {
            stopPolling();
            setStage('failed');
            setMessage('We haven’t heard back from M-Pesa yet. If you paid, your balance updates automatically within a few minutes.');
          }
        } catch {
          /* keep polling */
        }
      }, 3000);
    } catch (e) {
      toast.error((e as Error).message || 'Could not start the payment');
    } finally {
      setBusy(false);
    }
  };

  const close = (o: boolean) => {
    if (!o) stopPolling();
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Top up with M-Pesa</DialogTitle>
          <DialogDescription>Adds to your play balance for entry fees and stakes. Play balance can’t be withdrawn; winnings can.</DialogDescription>
        </DialogHeader>

        {stage === 'form' && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="mpesa-phone">M-Pesa number</Label>
              <Input
                id="mpesa-phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!!linked}
              />
              <p className="text-xs text-muted-foreground">
                {linked ? `Linked to your account (${maskPhone(linked)}). Winnings are paid to this number.` : 'This number gets linked to your account. Winnings are only paid to it.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="grid grid-cols-4 gap-2">
                {AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setAmount(a);
                      setCustom('');
                    }}
                    aria-pressed={!custom && amount === a}
                    className={cn('h-11 rounded-xl border font-score text-lg font-bold', !custom && amount === a ? 'border-primary bg-primary/15' : 'border-border')}
                  >
                    {a.toLocaleString()}
                  </button>
                ))}
              </div>
              <Input inputMode="numeric" placeholder="Other amount" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))} aria-label="Other amount in KES" />
            </div>

            <dl className="space-y-1.5 rounded-xl bg-secondary/60 p-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">You pay</dt>
                <dd className="font-semibold">{formatKES(value)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">M-Pesa top-up fee (5%)</dt>
                <dd>-{formatKES(fee)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5">
                <dt className="font-semibold">Added to play balance</dt>
                <dd className="font-score text-lg font-bold text-gold">{formatKES(Math.max(0, value - fee))}</dd>
              </div>
            </dl>

            <Button className="h-12 w-full text-base" onClick={pay} disabled={!valid || busy}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Smartphone className="h-5 w-5" />}
              Send M-Pesa prompt
            </Button>
            {value > 0 && (value < DEPOSIT_MIN || value > DEPOSIT_MAX) && <p className="text-center text-xs text-destructive">Between KES {DEPOSIT_MIN} and KES 70,000.</p>}
          </div>
        )}

        {stage === 'waiting' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
              <Smartphone className="h-7 w-7 text-success" />
              <span className="absolute inset-0 animate-ping rounded-full bg-success/20" />
            </span>
            <div>
              <p className="text-lg font-semibold">Check your phone</p>
              <p className="text-sm text-muted-foreground">Enter your M-Pesa PIN to pay {formatKES(value)}.</p>
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {(stage === 'done' || stage === 'failed') && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            {stage === 'done' ? <CheckCircle2 className="h-14 w-14 text-success" /> : <XCircle className="h-14 w-14 text-destructive" />}
            <p className="max-w-xs text-sm">{message}</p>
            <div className="flex gap-2">
              {stage === 'failed' && (
                <Button variant="outline" onClick={() => setStage('form')}>
                  Try again
                </Button>
              )}
              <Button onClick={() => close(false)}>{stage === 'done' ? 'Done' : 'Close'}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
