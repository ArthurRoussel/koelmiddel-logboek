import type { NextConfig } from "next";

// Statische export: de app is een PWA die rechtstreeks met Supabase praat, er is geen eigen server nodig.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
