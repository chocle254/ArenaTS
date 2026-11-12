import { uploadMedia } from '@/lib/media';

/**
 * Stores one ID-check photo in the private B2 bucket and returns its path
 * (`<user>/<name>`, which the database checks belongs to the signed-in user).
 */
export async function uploadKycPhoto(_userId: string, photo: Blob, name: 'id-front.jpg' | 'selfie.jpg'): Promise<string> {
  const jpeg = photo.type ? photo : new Blob([photo], { type: 'image/jpeg' });
  const { path } = await uploadMedia<{ path: string }>('kyc', jpeg, { name });
  return path;
}
