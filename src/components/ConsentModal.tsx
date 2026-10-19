import { Coins, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { formatArenaCurrency } from '@/lib/arena-currency';

interface ConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  amount: number;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

/** Confirms an Arena Currency charge and shows the balance before and after. */
export function ConsentModal({
  open,
  onOpenChange,
  title,
  description,
  amount,
  onConfirm,
  confirmText,
  cancelText = 'Cancel',
  loading = false,
}: ConsentModalProps) {
  const { profile } = useAuth();
  const balance = Number(profile?.arena_currency ?? 0);
  const after = balance - amount;
  const label = confirmText || `Pay ${formatArenaCurrency(amount)}`;

  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <div className="space-y-5 p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15">
              <Coins className="h-5 w-5 text-gold" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl leading-tight">{title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm">{description}</DialogDescription>
            </div>
          </div>

          <dl className="space-y-2 rounded-xl border border-border bg-background/40 p-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Your balance</dt>
              <dd className="font-score text-base">{formatArenaCurrency(balance)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Charge</dt>
              <dd className="font-score text-base text-gold">−{formatArenaCurrency(amount)}</dd>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <dt className="font-semibold">After</dt>
              <dd className={`font-score text-lg ${after < 0 ? 'text-destructive' : ''}`}>{formatArenaCurrency(after)}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-background/30 p-4 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelText}
          </Button>
          <Button onClick={onConfirm} disabled={loading || after < 0} className="sm:min-w-40">
            {loading && <Loader2 className="animate-spin" />}
            {loading ? 'Processing…' : label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
