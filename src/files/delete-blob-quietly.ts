import { del } from "@vercel/blob";

/**
 * Removes a blob whose metadata failed to save. The caller already reports
 * the save error, and an orphaned blob is harmless, so a failed cleanup
 * is not worth surfacing.
 */
export async function deleteBlobQuietly(url: string) {
  try {
    await del(url);
  } catch {
    // Best effort: see above.
  }
}
