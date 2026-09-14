import { authkitProxy } from "@workos-inc/authkit-nextjs";

export default authkitProxy({
  middlewareAuth: { enabled: true, unauthenticatedPaths: ["/"] },
});

/**
 * Every authenticated page and API route. A new route group segment must be
 * added here or it renders without a session check.
 */
export const config = {
  matcher: [
    "/",
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
