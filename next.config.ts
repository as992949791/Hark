import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: false,
  // Keep startup from rewriting the project's reviewed agent instructions.
  agentRules: false,
};

export default nextConfig;
