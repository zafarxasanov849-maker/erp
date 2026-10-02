import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    // forbidden() → src/app/forbidden.tsx (403)
    authInterrupts: true,
    serverActions: { bodySizeLimit: "3mb" }, // logo yuklash (2 MB) uchun
  },
};

export default withNextIntl(nextConfig);
