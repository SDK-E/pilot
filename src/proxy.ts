import { authkitProxy } from "@workos-inc/authkit-nextjs";

// TEMPORARY: diagnosing a production 500 that originates in this middleware
// before requests reach any route handler (2026-09-14). Revert once
// root-caused — see src/app/api/conversations/[conversationId]/stream/route.ts.
export default authkitProxy({
  middlewareAuth: { enabled: true, unauthenticatedPaths: ["/"] },
  debug: true,
});

/**
 * Every authenticated page and API route. A new route group segment must be
 * added here or it renders without a session check.
 */
export const config = {
  matcher: [
    "/",
    "/onboarding/:path*",
    "/chat/:path*",
    "/work/:path*",
    "/code/:path*",
    "/projects/:path*",
    "/agents/:path*",
    "/settings/:path*",
    "/workspace/:path*",
    "/api/conversations/:path*",
    "/api/attachments/:path*",
    "/api/projects/:path*",
    "/api/project-files/:path*",
  ],
};
