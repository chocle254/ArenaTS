import { CheckCircle2, Clock, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { formatKES } from '@/lib/arena-currency';
import { UNVERIFIED_WITHDRAW_MAX, UNVERIFIED_WITHDRAWALS, WITHDRAW_MAX, WITHDRAW_MIN, maskPhone, requestWithdrawal } from './mpesa';

export function WithdrawDialog({
  open,
  onOpenChange,
  usedWithoutKyc,
  onVerify,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Withdrawals already made without verified ID */
  usedWithoutKyc: number;
  onVerify: () => void;
  onDone?: () => void;
}) {
  const { profile, refreshProfile } = useAuth();
  const p = profile as (typeof profile & { mpesa_phone?: string | null }) | null;
  const winnings = Number(p?.available_balance || 0);
  const verified = p?.kyc_status === 'verified';
  const left = Math.max(0, UNVERIFIED_WITHDRAWALS - usedWithoutKyc);
  const cap = verified ? Math.min(WITHDRAW_MAX, winnings) : Math.min(UNVERIFIED_WITHDRAW_MAX, winnings);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ status: string; message?: string } | null>(null);

  useEffect(() => {
    if (open) {
      setAmount('');
      setResult(null);
    }
  }, [open]);

  const value = Math.round(Number(amount)) || 0;
  const blocked = !p?.mpesa_phone || (!verified && left === 0);
  const valid = !blocked && value >= WITHDRAW_MIN && value <= cap;

  const submit = async () => {
    setBusy(true);
    try {
      const r = await requestWithdrawal(value);
      setResult(r);
      await refreshProfile();
      onDone?.();
    } catch (e) {
      toast.error((e as Error).message || 'Could not withdraw');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw winnings</DialogTitle>
          <DialogDescription>
            {p?.mpesa_phone ? `Sent to your M-Pesa ${maskPhone(p.mpesa_phone)}.` : 'Make a deposit first to link your M-Pesa number.'}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            {result.status === 'processing' ? <CheckCircle2 className="h-14 w-14 text-success" /> : <Clock className="h-14 w-14 text-gold" />}
            <p className="text-lg font-semibold">
              {result.status === 'processing' ? 'On its way' : result.status === 'review' ? 'Being checked' : result.status === 'queued' ? 'Queued' : 'Didn’t go through'}
            </p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {result.status === 'processing'
                ? `${formatKES(value)} is being sent to your M-Pesa. It usually arrives within a minute.`
                : result.message || 'We’ll notify you when it’s sent.'}
            </p>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-secondary/60 p-3">
                <dt className="text-muted-foreground">Winnings</dt>
                <dd className="font-score text-xl font-bold text-gold">{formatKES(winnings)}</dd>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3">
                <dt className="text-muted-foreground">You can withdraw</dt>
                <dd className="font-score text-xl font-bold">{formatKES(blocked ? 0 : cap)}</dd>
              </div>
            </dl>

            {!verified && (
              <div className="flex gap-3 rounded-xl border border-border p-3 text-sm">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary-soft" />
                <div className="space-y-2">
                  <p>
                    {left > 0
                      ? `${left} of ${UNVERIFIED_WITHDRAWALS} withdrawals left before ID verification, up to ${formatKES(UNVERIFIED_WITHDRAW_MAX)} each.`
                      : 'Verify your ID to keep withdrawing.'}
                  </p>
                  <Button size="sm" variant="outline" onClick={onVerify}>
                    Verify ID
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Amount (KES)</Label>
              <div className="flex gap-2">
                <Input id="withdraw-amount" inputMode="numeric" placeholder={`${WITHDRAW_MIN} or more`} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} disabled={blocked} />
                <Button variant="ghost" onClick={() => setAmount(String(Math.floor(cap)))} disabled={blocked || cap < WITHDRAW_MIN}>
                  Max
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">M-Pesa charges a small transfer fee. Large or unusual withdrawals are checked first.</p>
            </div>

            <Button className="h-12 w-full text-base" onClick={submit} disabled={!valid || busy}>
              {busy && <Loader2 className="h-5 w-5 animate-spin" />}
              Withdraw {value ? formatKES(value) : ''}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
