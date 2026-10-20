import { Film, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { type Evidence, signedUrl } from './evidence';

function Thumb({ path, onOpen, label }: { path: string; onOpen: (url: string) => void; label: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let alive = true;
    signedUrl(path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [path]);
  return (
    <button type="button" onClick={() => url && onOpen(url)} className="relative aspect-video overflow-hidden rounded-lg border border-border bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={label}>
      {url && <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />}
    </button>
  );
}

/** Evidence grouped by player. Videos show their extracted frames and a link to play the clip. */
export function EvidenceGallery({ evidence, names, className }: { evidence: Evidence[]; names: Record<string, string>; className?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const byUser = evidence.reduce<Record<string, Evidence[]>>((acc, e) => {
    (acc[e.user_id] ||= []).push(e);
    return acc;
  }, {});

  return (
    <div className={cn('space-y-4', className)}>
      {Object.entries(byUser).map(([uid, items]) => (
        <div key={uid} className="space-y-2">
          <p className="text-sm font-semibold">From {names[uid] || 'player'}</p>
          {items.map((e) => (
            <div key={e.id} className="space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                {(e.kind === 'image' ? [e.path] : e.frames).map((p, i) => (
                  <Thumb key={p} path={p} onOpen={setOpen} label={e.kind === 'image' ? 'Open photo' : `Open frame ${i + 1}`} />
                ))}
              </div>
              {e.kind === 'video' && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary-soft hover:text-foreground"
                  onClick={async () => setVideoUrl(await signedUrl(e.path))}
                >
                  <Film className="h-3.5 w-3.5" /> Play the recording
                </button>
              )}
              {e.note && <p className="text-xs text-muted-foreground">“{e.note}”</p>}
            </div>
          ))}
        </div>
      ))}

      {(open || videoUrl) && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" onClick={() => { setOpen(null); setVideoUrl(null); }}>
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          {videoUrl ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={videoUrl} controls autoPlay className="max-h-full max-w-full rounded-lg" onClick={(e) => e.stopPropagation()} />
          ) : (
            <img src={open!} alt="Evidence" className="max-h-full max-w-full rounded-lg object-contain" />
          )}
        </div>
      )}
    </div>
  );
}
