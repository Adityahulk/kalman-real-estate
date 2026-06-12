/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@napi-rs/canvas", "sharp", "pdfjs-dist"],
    outputFileTracingIncludes: {
      "/api/**/*": [
        "./node_modules/sharp/**/*",
        "./node_modules/@img/**/*",
        "./node_modules/@napi-rs/canvas/**/*",
      ],
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" }
    ]
  }
};
export default nextConfig;
