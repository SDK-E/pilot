import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The workspace used to live under /workspace; old links land on Chat.
  redirects: () =>
    Promise.resolve([
      { source: "/workspace", destination: "/chat", permanent: true },
      { source: "/workspace/:path*", destination: "/chat", permanent: true },
    ]),
};

export default nextConfig;
