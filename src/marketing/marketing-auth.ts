import "server-only";

import { withAuth } from "@workos-inc/authkit-nextjs";

/**
 * The marketing pages are public and only use the session to toggle a CTA
 * ("sign in" vs "open workspace"). AuthKit throws if its env vars (redirect
 * URI, cookie password, API key) aren't correctly scoped for the current
 * deployment — a Preview-only misconfiguration must never 500 the landing
 * page, so this fails open to the safe "signed out" default instead of
 * propagating the error like `withAuth()` itself does.
 */
export async function marketingSession(): Promise<{ isSignedIn: boolean }> {
  try {
    const { user } = await withAuth();
    return { isSignedIn: Boolean(user) };
  } catch {
    return { isSignedIn: false };
  }
}
