import { Bot, CheckCircle2, Gavel, ImagePlus, Loader2, Scale, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/db/supabase';
import { cn } from '@/lib/utils';
import { EvidenceGallery } from './EvidenceGallery';
import { type Dispute, type Evidence, timeLeft, uploadEvidence } from './evidence';

/**
 * Shown to the two players in the match room once their reports clash.
 * Collect evidence -> AI verdict (appealable) -> referee if needed -> result.
 */
export function DisputePanel({
  matchResultId,
  challengeId,
  currentUserId,
  names,
  onDecided,
}: {
  matchResultId?: string | null;
  challengeId?: string | null;
  currentUserId: string;
  names: Record<string, string>;
  onDecided?: () => void;
}) {
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [appeal, setAppeal] = useState('');
  const [appealing, setAppealing] = useState(false);
  const [, tick] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const decidedRef = useRef(false);

  const load = useCallback(async () => {
    let q = supabase.from('match_disputes').select('*');
    q = matchResultId ? q.eq('match_result_id', matchResultId) : q.eq('challenge_id', challengeId!);
    const { data } = await q.maybeSingle();
    const d = data as Dispute | null;
    setDispute(d);
    if (d) {
      const { data: ev } = await supabase.from('dispute_evidence').select('*').eq('dispute_id', d.id).order('created_at');
      setEvidence((ev || []) as Evidence[]);
      if ((d.status === 'decided' || d.status === 'void') && !decidedRef.current) {
        decidedRef.current = true;
        onDecided?.();
      }
    }
  }, [matchResultId, challengeId, onDecided]);

  useEffect(() => {
    if (!matchResultId && !challengeId) return;
    load();
    const poll = setInterval(() => document.visibilityState === 'visible' && load(), 15_000);
    const clock = setInterval(() => tick((n) => n + 1), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load, matchResultId, challengeId]);

  if (!dispute) return null;

  const mine = evidence.filter((e) => e.user_id === currentUserId);
  const isPlayer = currentUserId === dispute.player1_id || currentUserId === dispute.player2_id;
  const name = (id: string | null) => (id ? (id === currentUserId ? 'You' : names[id] || 'Your opponent') : '');

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await uploadEvidence(dispute, currentUserId, file, note, setUploading);
      setNote('');
      toast.success('Evidence added');
      load();
    } catch (e) {
      toast.error((e as Error).message || 'Upload failed');
    } finally {
      setUploading(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const sendAppeal = async () => {
    setAppealing(true);
    const { error } = await supabase.rpc('appeal_dispute', { p_dispute: dispute.id, p_reason: appeal });
    setAppealing(false);
    if (error) return void toast.error(error.message);
    toast.success('Appeal sent. A referee will review the evidence.');
    setAppeal('');
    load();
  };

  return (
    <section className="space-y-4 rounded-2xl border border-gold/30 bg-gold/[0.05] p-4" aria-live="polite">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
          {dispute.status === 'decided' || dispute.status === 'void' ? <CheckCircle2 className="h-5 w-5" /> : dispute.status === 'human_review' ? <Gavel className="h-5 w-5" /> : dispute.status === 'collecting' ? <Scale className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className="font-semibold">
            {dispute.status === 'collecting' && 'Reports don’t match. Add your evidence'}
            {dispute.status === 'ai_review' && 'The AI referee is reviewing the evidence'}
            {dispute.status === 'proposed' && `AI referee: ${name(dispute.ai_winner)} won`}
            {dispute.status === 'human_review' && (dispute.referee_id ? 'A referee is reviewing this match' : 'Waiting for a referee')}
            {dispute.status === 'decided' && (dispute.decided_winner ? `${name(dispute.decided_winner)} won` : 'Match cancelled')}
            {dispute.status === 'void' && 'Settled'}
          </p>
          <p className="text-sm text-muted-foreground">
            {dispute.status === 'collecting' && `Upload a photo or short screen recording of the final score. ${timeLeft(dispute.evidence_deadline)} left.`}
            {dispute.status === 'ai_review' && 'This usually takes a couple of minutes.'}
            {dispute.status === 'proposed' && `Decided from the evidence. You can appeal for ${timeLeft(dispute.appeal_deadline)}.`}
            {dispute.status === 'human_review' && 'They only see this match and lose access once it’s decided.'}
            {dispute.status === 'decided' && (dispute.decided_by === 'ai' ? 'Decided by the AI referee.' : dispute.decided_by === 'referee' ? 'Decided by a match referee.' : dispute.decided_by === 'admin' ? 'Decided by an admin.' : dispute.decided_by === 'system' ? 'No evidence was uploaded.' : '')}
          </p>
        </div>
      </div>

      {(dispute.status === 'proposed' || dispute.status === 'decided') && dispute.ai_verdict?.reasoning && (
        <blockquote className="rounded-xl bg-background/60 p-3 text-sm">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Why</p>
          {dispute.decided_by && dispute.decided_by !== 'ai' && dispute.decision_note ? dispute.decision_note : dispute.ai_verdict.reasoning}
        </blockquote>
      )}

      {dispute.status === 'collecting' && isPlayer && (
        <div className="space-y-2">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional: what happened? (e.g. I won 3-1, opponent left in round 2)" rows={2} maxLength={500} />
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <Button className="w-full" onClick={() => fileRef.current?.click()} disabled={!!uploading || mine.length >= 6}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : mine.length ? <ImagePlus className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            {uploading || (mine.length ? 'Add more evidence' : 'Upload photo or video')}
          </Button>
          <p className="text-xs text-muted-foreground">Best evidence: the final score screen with both names visible, or a recording of the last minute. Videos up to 2 minutes and 50 MB.</p>
        </div>
      )}

      {dispute.status === 'proposed' && isPlayer && dispute.ai_winner !== currentUserId && (
        <div className="space-y-2">
          <Textarea value={appeal} onChange={(e) => setAppeal(e.target.value)} placeholder="What did the AI get wrong?" rows={2} maxLength={1000} />
          <Button variant="outline" className="w-full" onClick={sendAppeal} disabled={appealing || appeal.trim().length < 10}>
            {appealing && <Loader2 className="h-4 w-4 animate-spin" />} Appeal to a referee
          </Button>
        </div>
      )}

      {evidence.length > 0 && (
        <details className="group [&_summary::-webkit-details-marker]:hidden">
          <summary className={cn('cursor-pointer list-none text-sm font-semibold text-primary-soft')}>
            Evidence ({evidence.length})
          </summary>
          <EvidenceGallery evidence={evidence} names={{ ...names, [currentUserId]: 'you' }} className="mt-3" />
        </details>
      )}
    </section>
  );
}
