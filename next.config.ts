import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async redirects() {
    return [
      // The notes app moved from /notes to /workspace. Old links and bookmarks
      // keep working; the query (?id=5&tags=1,3) is passed through.
      { source: "/notes", destination: "/workspace", permanent: false },
    ];
  },
};

export default nextConfig;
