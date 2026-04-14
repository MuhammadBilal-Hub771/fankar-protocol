import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Allow <img> tags to load images from Pinata IPFS gateway ──
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
        pathname: "/ipfs/**",
      },
    ],
  },

  // ── No rewrites — all /api/v1/* calls go directly to Render backend ──
  // If you later want to proxy through Next.js (to hide the Render URL),
  // uncomment the block below and remove NEXT_PUBLIC_API_URL from the frontend:
  //
  // async rewrites() {
  //   return [
  //     {
  //       source: "/api/v1/:path*",
  //       destination: `${process.env.INTERNAL_API_URL}/api/v1/:path*`,
  //     },
  //   ];
  // },
};

export default nextConfig;
