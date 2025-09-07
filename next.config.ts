import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/report/:id',
        destination: '/api/reports/:id',
      },
    ];
  },
  /* config options here */
};

export default nextConfig;
