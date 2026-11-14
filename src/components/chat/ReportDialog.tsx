import { Flag, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { cn } from '@/lib/utils';

export const REPORT_CATEGORIES = [
  { id: 'harassment', label: 'Harassment or threats' },
  { id: 'fraud', label: 'Scam or fraud' },
  { id: 'cheating', label: 'Cheating or match fixing' },
  { id: 'offensive_language', label: 'Offensive language' },
  { id: 'impersonation', label: 'Pretending to be someone else' },
  { id: 'other', label: 'Something else' },
] as const;

export type ReportSource = 'dm' | 'world' | 'profile';

export function ReportDialog({
  open,
  onOpenChange,
  reportedId,
  reportedName,
  source,
  messageId,
  messagePreview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedId: string;
  reportedName: string;
  source: ReportSource;
  messageId?: string;
  messagePreview?: string;
}) {
  const { user } = useAuth();
  const [category, setCategory] = useState<string>('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory('');
      setDetails('');
    }
  }, [open]);

  const submit = async () => {
    if (!user || !category) return;
    setSending(true);
    const { error } = await supabase.from('user_reports').insert({
      reporter_id: user.id,
      reported_user_id: reportedId,
      category,
      description: details.trim(),
      source,
      message_id: messageId || null,
    });
    setSending(false);
    if (error) {
      toast.error(error.message || 'Report not sent. Try again.');
      return;
    }
    onOpenChange(false);
    toast.success(`Thanks. We'll review your report about ${reportedName}.`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !sending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" /> Report {reportedName}
          </DialogTitle>
          <DialogDescription>
            {source === 'dm'
              ? 'Our team will be able to read this chat to check what happened. They won’t tell the other player who reported them.'
              : 'Our team reviews every report. The other player isn’t told who reported them.'}
          </DialogDescription>
        </DialogHeader>

        {messagePreview && <p className="line-clamp-3 rounded-lg border-l-4 border-destructive/60 bg-secondary px-3 py-2 text-sm">{messagePreview}</p>}

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold">What’s wrong?</legend>
          <div className="grid gap-2">
            {REPORT_CATEGORIES.map((c) => (
              <label
                key={c.id}
                className={cn(
                  'flex h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 text-sm',
                  category === c.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-white/[0.03]',
                )}
              >
                <input type="radio" name="report-category" value={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} className="accent-[hsl(var(--primary))]" />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="report-details">Details (optional)</Label>
          <Textarea id="report-details" rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What happened? Include amounts or match IDs if it’s about money or a match." />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={!category || sending}>
            {sending ? <Loader2 className="animate-spin" /> : <Flag />}
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
