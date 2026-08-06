import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium ships its Chromium binary as non-JS assets
  // (bin/chromium.br, bin/al2023.tar.br...) under node_modules. Vercel's
  // file tracer (@vercel/nft) only follows JS imports, so it silently drops
  // these binary files unless explicitly told to include them — causing
  // "The input directory .../@sparticuz/chromium/bin does not exist" at
  // runtime even though the build succeeds locally.
  outputFileTracingIncludes: {
    "/api/analyze": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
};

export default nextConfig;
