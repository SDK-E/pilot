import "server-only";

import { del, get } from "@vercel/blob";

export interface PrivateFile {
  pathname: string;
  contentType: string;
  filename: string;
}

/**
 * Streams a private Blob to its verified owner. The caller has already
 * checked the session and the file's ownership.
 */
export async function privateFileResponse(file: PrivateFile) {
  const blob = await get(file.pathname, { access: "private" });
  if (!blob) return new Response("Not found", { status: 404 });
  return new Response(blob.stream, {
    headers: {
      "content-type": file.contentType,
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

/**
 * Deletes the Blob bytes first, then the metadata row via `forget`, so a
 * failed Blob delete never leaves a row pointing at a live file the user
 * believes is gone.
 */
export async function deletePrivateFile(
  file: PrivateFile,
  forget: () => Promise<unknown>,
  failureMessage: string,
) {
  try {
    await del(file.pathname);
    await forget();
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: failureMessage }, { status: 500 });
  }
}
