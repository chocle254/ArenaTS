import { Database, Download, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';
import { formatRelativeTime } from '@/lib/utils';

interface Backup {
  id: string;
  file_key: string;
  size_bytes: number;
  table_count: number;
  row_count: number;
  created_at: string;
}

const size = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function AdminBackups() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('db_backups')
      .select('id, file_key, size_bytes, table_count, row_count, created_at')
      .order('created_at', { ascending: false })
      .limit(30);
    setBackups((data as Backup[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setCreating(true);
    const { data, error } = await supabase.functions.invoke<{ backup?: Backup; error?: string }>('db-backup', { body: { action: 'create' } });
    setCreating(false);
    if (error || !data?.backup) {
      toast.error(data?.error || 'Backup failed. Please try again.');
      return;
    }
    toast.success(`Backup saved (${size(data.backup.size_bytes)})`);
    load();
  };

  const download = async (b: Backup) => {
    setDownloading(b.id);
    const { data, error } = await supabase.functions.invoke<{ url?: string }>('db-backup', { body: { action: 'download', id: b.id } });
    setDownloading(null);
    if (error || !data?.url) {
      toast.error('Could not get the download link');
      return;
    }
    window.location.href = data.url;
  };

  const latest = backups[0];
  const stale = !latest || Date.now() - new Date(latest.created_at).getTime() > 24 * 3600 * 1000;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <Database className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">Database backups</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Saves every table (players, wallets, transactions, tournaments, chats, accounts) to private storage. Back up daily, before tournaments and
              before updates. The newest 30 are kept.
            </p>
            <p className={stale ? 'mt-2 text-sm font-medium text-amber-500' : 'mt-2 text-sm text-muted-foreground'}>
              {latest ? `Last backup ${formatRelativeTime(latest.created_at)}` : 'No backups yet'}
            </p>
          </div>
        </div>
        <Button className="mt-4 w-full sm:w-auto" onClick={create} disabled={creating}>
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
          {creating ? 'Backing up...' : 'Back up now'}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        backups.length > 0 && (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {backups.map((b) => (
              <li key={b.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{new Date(b.created_at).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {size(b.size_bytes)} · {b.row_count.toLocaleString()} rows · {b.table_count} tables
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => download(b)} disabled={downloading === b.id} aria-label="Download backup">
                  {downloading === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                </Button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
