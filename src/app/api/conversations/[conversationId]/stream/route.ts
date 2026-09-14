export const runtime = "nodejs";

// TEMPORARY canary: prove whether any response from this handler survives to
// the client before touching session/DB code. Restore the real body right
// after this confirms or rules out a platform/routing-level cause.
export function POST() {
  console.error("[stream-diag] POST entered");
  return Response.json({ canary: true });
}
