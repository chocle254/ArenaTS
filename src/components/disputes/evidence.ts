import { supabase } from '@/db/supabase';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 120;
const FRAME_COUNT = 6;

export interface Dispute {
  id: string;
  match_kind: 'tournament' | 'quick';
  match_result_id: string | null;
  challenge_id: string | null;
  tournament_id: string | null;
  game: string | null;
  player1_id: string;
  player2_id: string;
  status: 'collecting' | 'ai_review' | 'proposed' | 'human_review' | 'decided' | 'void';
  evidence_deadline: string;
  ai_verdict: { reasoning?: string; red_flags?: string[] } | null;
  ai_winner: string | null;
  ai_confidence: number | null;
  appeal_deadline: string | null;
  appealed_by: string | null;
  appeal_reason: string | null;
  referee_id: string | null;
  decided_winner: string | null;
  decided_by: string | null;
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface Evidence {
  id: string;
  dispute_id: string;
  user_id: string;
  kind: 'image' | 'video';
  path: string;
  frames: string[];
  note: string | null;
  created_at: string;
}

function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.preload = 'auto';
    v.muted = true;
    v.playsInline = true;
    v.src = URL.createObjectURL(file);
    v.onloadedmetadata = () => resolve(v);
    v.onerror = () => reject(new Error('This video format can’t be read. Try MP4.'));
  });
}

function seek(v: HTMLVideoElement, t: number) {
  return new Promise<void>((resolve) => {
    const done = () => {
      v.removeEventListener('seeked', done);
      resolve();
    };
    v.addEventListener('seeked', done);
    v.currentTime = t;
  });
}

/**
 * Pulls evenly spaced frames from a screen recording, weighted to the end
 * where the final score usually is. The AI referee looks at these.
 */
export async function extractFrames(file: File): Promise<Blob[]> {
  const v = await loadVideo(file);
  try {
    if (!Number.isFinite(v.duration) || v.duration <= 0) throw new Error('This video has no length');
    if (v.duration > MAX_VIDEO_SECONDS) throw new Error('Keep videos under 2 minutes. Show the end of the match and the final score.');
    const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    const ctx = canvas.getContext('2d')!;
    // 0%, 40%, 70%, 85%, 95%, last frame
    const marks = [0.02, 0.4, 0.7, 0.85, 0.95, 0.995].slice(0, FRAME_COUNT);
    const frames: Blob[] = [];
    for (const m of marks) {
      await seek(v, Math.max(0, Math.min(v.duration - 0.05, v.duration * m)));
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
      if (blob) frames.push(blob);
    }
    return frames;
  } finally {
    URL.revokeObjectURL(v.src);
  }
}

const ext = (f: File) => (f.name.split('.').pop() || (f.type.split('/')[1] ?? 'bin')).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);

/** Uploads one photo or video (plus frames) and records it on the dispute. */
export async function uploadEvidence(dispute: Dispute, userId: string, file: File, note: string, onProgress?: (msg: string) => void) {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  if (!isVideo && !isImage) throw new Error('Upload a photo or a video');
  if (isImage && file.size > MAX_IMAGE_BYTES) throw new Error('Photos must be under 10 MB');
  if (isVideo && file.size > MAX_VIDEO_BYTES) throw new Error('Videos must be under 50 MB. Trim it to the end of the match.');

  const base = `${dispute.id}/${userId}/${Date.now()}`;
  const bucket = supabase.storage.from('match-evidence');
  let frames: string[] = [];

  if (isVideo) {
    onProgress?.('Reading the video…');
    const blobs = await extractFrames(file);
    onProgress?.('Uploading frames…');
    frames = await Promise.all(
      blobs.map(async (b, i) => {
        const path = `${base}-f${i + 1}.jpg`;
        const { error } = await bucket.upload(path, b, { contentType: 'image/jpeg' });
        if (error) throw error;
        return path;
      }),
    );
  }

  onProgress?.(isVideo ? 'Uploading the video…' : 'Uploading…');
  const path = `${base}.${ext(file)}`;
  const { error } = await bucket.upload(path, file, { contentType: file.type });
  if (error) throw error;

  const { error: rpcErr } = await supabase.rpc('submit_dispute_evidence', { p_dispute: dispute.id, p_kind: isVideo ? 'video' : 'image', p_path: path, p_frames: frames, p_note: note || null });
  if (rpcErr) throw rpcErr;
}

const urlCache = new Map<string, { url: string; at: number }>();
export async function signedUrl(path: string) {
  const hit = urlCache.get(path);
  if (hit && Date.now() - hit.at < 8 * 60_000) return hit.url;
  const { data } = await supabase.storage.from('match-evidence').createSignedUrl(path, 600);
  if (data?.signedUrl) urlCache.set(path, { url: data.signedUrl, at: Date.now() });
  return data?.signedUrl || '';
}

export function timeLeft(iso: string | null) {
  if (!iso) return '';
  const s = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
