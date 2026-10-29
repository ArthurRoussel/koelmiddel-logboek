import type { NextConfig } from "next";

// Statische export: de app is een PWA die rechtstreeks met Supabase praat, er is geen eigen server nodig.
// NEXT_PUBLIC_BASE_PATH is nodig wanneer de app in een submap draait, zoals op GitHub Pages (/koelmiddel-logboek).
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
