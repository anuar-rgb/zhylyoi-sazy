import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Photos uploaded through the admin panel are served from Supabase Storage, so that
 * host has to be allowed explicitly. Taken from the environment rather than written
 * out: the same code then works against any project holding these variables.
 */
const supabaseImagePattern = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    return [
      {
        protocol: "https" as const,
        hostname: new URL(url).hostname,
        // Only the public object endpoint — signed and authenticated URLs are not images.
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [];
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      ...supabaseImagePattern,
    ],
    qualities: [75, 90, 100],
  },
};

export default withNextIntl(nextConfig);
