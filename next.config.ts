import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: false,
  // Keep startup from rewriting the project's reviewed agent instructions.
  agentRules: false,
  // PostHog is reached through /ingest (see src/instrumentation-client.ts). Its
  // API paths end in a slash, which Next would otherwise redirect away.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
};

export default nextConfig;
