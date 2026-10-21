import { Check, Copy, Gift, Loader2, Share2, Ticket, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { formatKES } from '@/lib/arena-currency';
import { applyRefCode, getMyReferrals, inviteLink, type ReferralFriend, type ReferralSummary } from '@/lib/referral';
import { shareLink, whatsappShareUrl } from '@/lib/share';
import { cn } from '@/lib/utils';

const STATUS: Record<ReferralFriend['status'], { label: string; className: string }> = {
  pending: { label: 'Waiting for first deposit', className: 'text-muted-foreground' },
  rewarded: { label: 'Reward paid', className: 'text-success' },
  blocked: { label: 'No reward', className: 'text-destructive' },
};

export default function Invite() {
  const { refreshProfile } = useAuth();
  const [data, setData] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getMyReferrals());
    } catch {
      toast.error('Could not load your invites. Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!data) return null;

  const link = inviteLink(data.code);
  const reward = formatKES(data.reward);
  const shareText = `Join me on Arena, tournaments for gamers in Kenya with M-Pesa prizes. Sign up with my code ${data.code} and we both get ${reward} of tournament tickets after your first deposit.`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Press and hold the link to copy it.');
    }
  };

  const addCode = async () => {
    setSaving(true);
    try {
      await applyRefCode(code);
      toast.success(`Code added. You both get ${reward} of tickets after your first deposit.`);
      setCode('');
      await Promise.all([load(), refreshProfile?.()]);
    } catch (e) {
      toast.error((e as Error).message || 'Could not add that code');
    } finally {
      setSaving(false);
    }
  };

  const rewarded = data.friends.filter((f) => f.status === 'rewarded').length;

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div>
        <h1 className="text-4xl">Invite friends</h1>
        <p className="text-muted-foreground">
          When a friend joins with your code and makes their first M-Pesa deposit of {formatKES(data.min_deposit)} or more, you both get {reward} of tournament tickets.
        </p>
      </div>

      {!data.enabled && (
        <p className="rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">Invite rewards are paused right now. Friends can still join with your link.</p>
      )}

      <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.10] via-card to-card p-5 sm:p-7">
        <Gift className="absolute -right-5 -top-5 h-32 w-32 text-primary/[0.07]" aria-hidden />
        <p className="text-sm font-semibold text-primary-soft">Your invite code</p>
        <p className="mt-1 font-score text-5xl font-bold tracking-[0.2em]">{data.code}</p>
        <div className="mt-4 flex min-w-0 items-center gap-2 rounded-xl border border-border bg-background/60 p-1.5 pl-3">
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{link}</span>
          <Button size="sm" variant="outline" onClick={copy} className="shrink-0">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
          <Button asChild className="h-11">
            <a href={whatsappShareUrl(shareText, link)} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </Button>
          <Button variant="outline" className="h-11" onClick={() => shareLink({ title: 'Join me on Arena', text: shareText, url: link })}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Stat label="Friends joined" value={String(data.friends.length)} />
        <Stat label="Rewards paid" value={String(rewarded)} />
        <Stat label="Tickets earned" value={formatKES(data.earned)} />
      </section>

      <ol className="grid gap-2 sm:grid-cols-3">
        {[
          { title: 'Share your code', text: 'Send your link on WhatsApp or anywhere your friends are.' },
          { title: 'They deposit', text: `Your friend signs up and tops up ${formatKES(data.min_deposit)} or more with M-Pesa.` },
          { title: 'You both get tickets', text: `${reward} each, for tournaments hosted by Arena or our sponsors.` },
        ].map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-2xl border border-border bg-card/70 p-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-score text-base font-bold text-primary-soft">{i + 1}</span>
            <span>
              <span className="block text-sm font-semibold">{s.title}</span>
              <span className="block text-xs text-muted-foreground">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <section className="space-y-3">
        <h2 className="text-2xl">Your friends</h2>
        {data.friends.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center">
            <UserPlus className="h-8 w-8 text-muted-foreground" />
            <p className="font-semibold">No one yet</p>
            <p className="text-sm text-muted-foreground">Friends who join with your code show up here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card/60">
            {data.friends.map((f) => (
              <li key={`${f.gamertag}-${f.joined_at}`} className="flex items-center gap-3 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold">
                  {f.avatar_url ? <img src={f.avatar_url} alt="" className="h-full w-full object-cover" /> : f.gamertag.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{f.gamertag}</p>
                  <p className={cn('text-xs', STATUS[f.status].className)}>
                    {f.status === 'rewarded' ? `${STATUS.rewarded.label}: ${formatKES(f.reward)} each` : f.status === 'blocked' ? f.reason || STATUS.blocked.label : STATUS.pending.label}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(f.joined_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.invited_by ? (
        <p className="text-sm text-muted-foreground">You joined with an invite from {data.invited_by}.</p>
      ) : (
        data.can_add_code && (
          <section className="space-y-2 rounded-2xl border border-border bg-card/60 p-4">
            <p className="font-semibold">Got a code from a friend?</p>
            <p className="text-sm text-muted-foreground">Add it before your first deposit, within 7 days of joining.</p>
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CODE"
                maxLength={12}
                className="h-11 uppercase tracking-widest"
                aria-label="Friend's invite code"
              />
              <Button className="h-11" onClick={addCode} disabled={saving || code.trim().length < 4}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
          </section>
        )
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Ticket className="mt-0.5 h-4 w-4 shrink-0" />
        Tickets pay entry fees on tournaments hosted by Arena or our sponsors. They can't be withdrawn. No reward for accounts that share a payment network, and up to {data.monthly_cap} rewards a month.{' '}
        <Link to="/wallet" className="font-semibold text-primary-soft hover:underline">
          See your tickets
        </Link>
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-3 text-center">
      <p className="font-score text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
