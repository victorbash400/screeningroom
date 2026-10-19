import type { NextConfig } from "next";

const config: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
    ] }];
  },
  serverExternalPackages: ["ffmpeg-static", "@ffprobe-installer/ffprobe"],
  outputFileTracingIncludes: {
    "/api/chat": ["./.media-bin/yt-dlp", "./node_modules/ffmpeg-static/ffmpeg", "./node_modules/@ffprobe-installer/**/*", "./node_modules/.pnpm/@ffprobe-installer*/node_modules/@ffprobe-installer/**/*"],
  },
};

export default config;
