import type { APIResponse } from "@playwright/test";

/**
 * The Location header of a redirect response, as a string the test can
 * parse. A redirect without one is a test failure, not a type problem.
 */
export function redirectTarget(response: APIResponse): string {
  const location = response.headers().location;
  if (location === undefined) {
    throw new Error(`Expected a Location header on ${response.url()}.`);
  }
  return location;
}
