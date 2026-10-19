import { toast } from 'sonner';

export interface ShareInput {
  title: string;
  text: string;
  url: string;
}

/**
 * Share via the native share sheet when available (Android/iOS), otherwise copy
 * the link. Returns how it was shared so callers can tailor feedback.
 */
export async function shareLink({ title, text, url }: ShareInput): Promise<'native' | 'copied' | 'cancelled' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title, text, url });
      return 'native';
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    // Fall through to copy
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast.success('Link copied. Paste it in your group chat.');
    return 'copied';
  } catch {
    toast.error('Could not share this link from your browser.');
    return 'failed';
  }
}

/** Direct WhatsApp share link (opens the app on phones, web on desktop). */
export function whatsappShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}
