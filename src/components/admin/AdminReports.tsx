import { Ban, Check, Flag, Globe, Lock, MessageSquare, User, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { REPORT_CATEGORIES } from '@/components/chat/ReportDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { DirectMessage } from '@/types/database';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  category: string;
  description: string | null;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  source: 'dm' | 'world' | 'profile';
  message_excerpt: string | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const FILTERS = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Handled' },
] as const;

const SOURCE: Record<Report['source'], { label: string; icon: React.ReactNode }> = {
  dm: { label: 'Private chat', icon: <MessageSquare className="h-3.5 w-3.5" /> },
  world: { label: 'World Chat', icon: <Globe className="h-3.5 w-3.5" /> },
  profile: { label: 'Profile', icon: <User className="h-3.5 w-3.5" /> },
};

const categoryLabel = (id: string) => REPORT_CATEGORIES.find((c) => c.id === id)?.label || id;

/** Player reports. Private chats can only be opened from a report made in that chat, and each opening is logged. */
export function AdminReports() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('open');
  const [rows, setRows] = useState<Report[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Report | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('user_reports')
      .select('id, reporter_id, reported_user_id, category, description, status, source, message_excerpt, admin_note, created_at, reviewed_at')
      .order('created_at', { ascending: false })
      .limit(100);
    q = filter === 'open' ? q.eq('status', 'pending') : q.neq('status', 'pending');
    const { data, error } = await q;
    if (error) toast.error('Could not load reports');
    const list = (data || []) as Report[];
    setRows(list);
    const ids = [...new Set(list.flatMap((r) => [r.reporter_id, r.reported_user_id]))];
    if (ids.length) {
      const { data: people } = await supabase.from('profiles').select('id, gamertag').in('id', ids);
      setNames(Object.fromEntries((people || []).map((p) => [p.id, p.gamertag || 'Player'])));
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (r: Report, status: Report['status']) => {
    const note = status === 'actioned' ? window.prompt('What did you do? (e.g. warned, suspended 7 days)') : null;
    if (status === 'actioned' && note === null) return;
    const { error } = await supabase
      .from('user_reports')
      .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString(), admin_note: note || null })
      .eq('id', r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === 'dismissed' ? 'Report dismissed' : 'Report closed');
    setRows((prev) => prev.filter((x) => x.id !== r.id));
  };

  const name = (id: string) => names[id] || 'Player';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn('h-9 rounded-full border px-3.5 text-sm font-semibold', filter === f.id ? 'border-primary bg-primary/15' : 'border-border text-muted-foreground')}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> Opening a private chat is logged.
        </p>
      </div>

      {loading && rows.length === 0 ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border p-10 text-center glass">
          <Flag className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 font-semibold">{filter === 'open' ? 'No open reports' : 'No handled reports yet'}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border p-4 glass">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[15px]">
                    <Link to={`/profile/${r.reporter_id}`} className="font-semibold hover:underline">
                      {name(r.reporter_id)}
                    </Link>{' '}
                    <span className="text-muted-foreground">reported</span>{' '}
                    <Link to={`/profile/${r.reported_user_id}`} className="font-semibold text-destructive hover:underline">
                      {name(r.reported_user_id)}
                    </Link>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-destructive/15 px-2 py-0.5 font-semibold text-destructive">{categoryLabel(r.category)}</span>
                    <span className="inline-flex items-center gap-1">
                      {SOURCE[r.source].icon} {SOURCE[r.source].label}
                    </span>
                    <span>{formatRelativeTime(r.created_at)}</span>
                  </p>
                </div>
                {r.status !== 'pending' && (
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold capitalize text-muted-foreground">{r.status}</span>
                )}
              </div>
              {r.message_excerpt && <p className="mt-3 rounded-lg border-l-4 border-destructive/60 bg-secondary px-3 py-2 text-sm">“{r.message_excerpt}”</p>}
              {r.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{r.description}</p>}
              {r.admin_note && <p className="mt-2 text-sm">Action: {r.admin_note}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {r.source === 'dm' && (
                  <Button size="sm" variant="outline" onClick={() => setViewing(r)}>
                    <MessageSquare /> Open chat
                  </Button>
                )}
                {r.status === 'pending' && (
                  <>
                    <Button size="sm" onClick={() => decide(r, 'actioned')}>
                      <Check /> Action taken
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => decide(r, 'dismissed')}>
                      <X /> Dismiss
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {viewing && <ReportedChat report={viewing} names={names} onClose={() => setViewing(null)} />}
    </div>
  );
}

function ReportedChat({ report, names, onClose }: { report: Report; names: Record<string, string>; onClose: () => void }) {
  const [msgs, setMsgs] = useState<DirectMessage[] | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Once per report: each call is logged as an access
  useEffect(() => {
    supabase.rpc('admin_dm_thread', { p_report: report.id }).then(({ data, error }) => {
      if (error) {
        toast.error(error.message);
        closeRef.current();
        return;
      }
      setMsgs((data || []) as DirectMessage[]);
    });
  }, [report.id]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {names[report.reporter_id] || 'Reporter'} and {names[report.reported_user_id] || 'reported player'}
          </DialogTitle>
          <DialogDescription>Opened because of this report. Your access has been logged.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {msgs === null ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : msgs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No messages.</p>
          ) : (
            msgs.map((m) => {
              const reported = m.sender_id === report.reported_user_id;
              return (
                <div key={m.id} className={cn('flex', reported ? 'justify-start' : 'justify-end')}>
                  <div className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-sm', reported ? 'bg-destructive/15' : 'bg-secondary')}>
                    <p className="mb-0.5 text-[11px] font-semibold text-muted-foreground">
                      {names[m.sender_id] || 'Player'} · {new Date(m.created_at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {m.edited_at ? ' · edited' : ''}
                    </p>
                    {m.deleted_at ? (
                      <span className="inline-flex items-center gap-1 italic text-muted-foreground">
                        <Ban className="h-3.5 w-3.5" /> Deleted by the sender
                      </span>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{m.message || (m.image_url ? '[Photo]' : '')}</p>
                    )}
                    {m.reply_message && <p className="mt-1 border-l-2 border-border pl-2 text-xs text-muted-foreground">Reply to: {m.reply_message}</p>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
