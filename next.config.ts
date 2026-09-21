import type { NextConfig } from "next";

type RemotePatterns = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>;

/** Supabase Storage'daki herkese açık görseller (product-images, store-assets, avatars) için görsel optimizasyonuna izin ver. */
function supabaseImagePatterns(): RemotePatterns {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return [];
  try {
    const url = new URL(raw);
    return [{ protocol: url.protocol === "http:" ? "http" : "https", hostname: url.hostname, port: url.port, pathname: "/storage/v1/object/public/**" }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: supabaseImagePatterns() },
};

export default nextConfig;
