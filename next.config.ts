import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // Exclude test files from production build
  pageExtensions: ["js", "jsx", "ts", "tsx"]
    .map((ext) => [ext, `page.${ext}`, `api.${ext}`])
    .flat(),
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
