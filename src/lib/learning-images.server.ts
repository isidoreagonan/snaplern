import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "learning-images";

export function extractStoragePath(stored: string): string {
  if (!stored) return stored;
  const publicMarker = `/object/public/${BUCKET}/`;
  const signedMarker = `/object/sign/${BUCKET}/`;
  for (const marker of [publicMarker, signedMarker]) {
    const idx = stored.indexOf(marker);
    if (idx >= 0) return stored.slice(idx + marker.length).split("?")[0];
  }
  return stored;
}

/** Sign with the authenticated user's supabase client (RLS ensures only owners can sign). */
export async function signForAI(
  supabase: SupabaseClient,
  stored: string,
  expiresIn = 1800,
): Promise<string> {
  if (!stored) return stored;
  const path = extractStoragePath(stored);
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) throw new Error("Impossible de signer l'image");
  return data.signedUrl;
}