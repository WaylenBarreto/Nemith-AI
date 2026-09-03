import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to silence the webpack warning
  turbopack: {},
  reactStrictMode: false,
};

export default nextConfig;
