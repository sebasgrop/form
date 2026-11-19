import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Personal local app: every page reads live data from the local SQLite file.
  serverExternalPackages: ["node:sqlite"],
  experimental: {
    // progress photos are uploaded through a server action (max 10 MB enforced there)
    serverActions: { bodySizeLimit: "12mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
