import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
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
};

export default withNextIntl(nextConfig);
