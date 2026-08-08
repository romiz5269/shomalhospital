import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const blogBase = (
  process.env.NEXT_PUBLIC_BLOG_URL || "http://127.0.0.1:5005"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Separate build dirs so public/CMS/admin can run next to each other
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.example.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "assets.mixkit.co" },
      { protocol: "http", hostname: "127.0.0.1", port: "5005" },
      { protocol: "http", hostname: "localhost", port: "5005" },
    ],
  },
  // Fallback rewrite (route handler is primary) — keeps /cms-media same-origin
  async rewrites() {
    return [
      {
        source: "/cms-media-direct/:path*",
        destination: `${blogBase}/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
