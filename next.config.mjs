/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  // Keep server-only runtimes out of the Next bundle. In particular, BullMQ contains an optional
  // Valkey transport that Webpack otherwise tries to resolve even though this app uses ioredis.
  serverExternalPackages: ["@napi-rs/canvas", "sharp", "pdfjs-dist", "puppeteer", "bullmq", "ioredis"],
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/**/*",
      "./node_modules/@napi-rs/canvas/**/*",
    ],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" }
    ]
  }
};
export default nextConfig;
