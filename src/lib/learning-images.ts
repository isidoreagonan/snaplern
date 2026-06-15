import { supabase } from "@/integrations/supabase/client";

const BUCKET = "learning-images";

/** Extract the storage object path from either a stored public URL or an already-stored path. */
export function extractStoragePath(stored: string): string {
  if (!stored) return stored;
  // Old style: https://<proj>.supabase.co/storage/v1/object/public/learning-images/<path>
  const publicMarker = `/object/public/${BUCKET}/`;
  const signedMarker = `/object/sign/${BUCKET}/`;
  for (const marker of [publicMarker, signedMarker]) {
    const idx = stored.indexOf(marker);
    if (idx >= 0) {
      const tail = stored.slice(idx + marker.length);
      // strip query string for signed urls
      return tail.split("?")[0];
    }
  }
  // Already a bare path
  return stored;
}

/** Return a short-lived signed URL for an image stored in the learning-images bucket. */
export async function signLearningImage(stored: string, expiresIn = 3600): Promise<string> {
  if (!stored) return stored;
  const path = extractStoragePath(stored);
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return stored;
  return data.signedUrl;
}