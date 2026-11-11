import { supabase } from '@/db/supabase';

/**
 * Stores one ID-check photo and returns its storage path.
 * Every ID-check upload goes through here, so moving the files to the
 * private B2 bucket only needs this function to change.
 */
export async function uploadKycPhoto(userId: string, photo: Blob, name: 'id-front.jpg' | 'selfie.jpg'): Promise<string> {
  const path = `${userId}/${name}`;
  const { error } = await supabase.storage
    .from('kyc-documents')
    .upload(path, photo, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}
