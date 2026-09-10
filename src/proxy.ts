import { authkitProxy } from "@workos-inc/authkit-nextjs";

export default authkitProxy({
  middlewareAuth: { enabled: true, unauthenticatedPaths: ["/"] },
});

export const config = {
  matcher: [
    "/",
    "/workspace/:path*",
    "/api/conversations/:path*",
    "/api/attachments/:path*",
  ],
};
