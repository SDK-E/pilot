import { authkitProxy } from "@workos-inc/authkit-nextjs";

// Public marketing pages call `withAuth()` too (to branch the nav/hero CTA
// between "sign in" and "open workspace"), which requires the route to be
// covered by this middleware even though no session is required. Kept in
// sync with the `matcher` list below by hand — Next.js requires `matcher`
// to be a literal array, so it can't be built by spreading this constant.
const PUBLIC_MARKETING_PATHS = [
  "/",
  "/about",
  "/pricing",
  "/contact",
  "/docs",
  "/docs/:path*",
  "/blog",
  "/blog/:path*",
  "/legal/:path*",
];

export default authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: PUBLIC_MARKETING_PATHS,
  },
});

/**
 * Every authenticated page and API route, plus the public marketing pages
 * above (so `withAuth()` works on them). A new route group segment must be
 * added here or it renders without a session check.
 */
export const config = {
  matcher: [
    "/",
    "/about",
    "/pricing",
    "/contact",
    "/docs",
    "/docs/:path*",
    "/blog",
    "/blog/:path*",
    "/legal/:path*",
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
