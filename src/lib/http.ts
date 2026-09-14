/**
 * Small helpers shared by the route handlers under `src/app/api`.
 */

export function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/**
 * Reads a JSON body. A missing or malformed body becomes `null` so the
 * caller's schema rejects it with its own message.
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Reads a multipart form. A malformed body becomes `null`.
 */
export async function readFormData(request: Request): Promise<FormData | null> {
  try {
    return await request.formData();
  } catch {
    return null;
  }
}
