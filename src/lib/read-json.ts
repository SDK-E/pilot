/**
 * Parses a JSON response from one of Pilot's own API routes. The route owns
 * the shape, so the caller names the type it expects instead of validating
 * the body a second time.
 */
export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
