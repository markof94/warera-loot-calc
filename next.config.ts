import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "export",
  basePath: isGitHubPages ? "/warera-loot-calc" : "",
  assetPrefix: isGitHubPages ? "/warera-loot-calc/" : "",
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: "https",
        hostname: "app.warera.io",
      },
    ],
  },
  trailingSlash: true,
};

export default nextConfig;
