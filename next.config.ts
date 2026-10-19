import type { NextConfig } from "next";

const config: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["ffmpeg-static", "@ffprobe-installer/ffprobe"],
  outputFileTracingIncludes: {
    "/api/chat": ["./.media-bin/yt-dlp", "./node_modules/ffmpeg-static/ffmpeg", "./node_modules/@ffprobe-installer/**/*", "./node_modules/.pnpm/@ffprobe-installer*/node_modules/@ffprobe-installer/**/*"],
  },
};

export default config;
