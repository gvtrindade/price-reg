import { withSerwist } from "@serwist/turbopack";
import createNextIntlPlugin from "next-intl/plugin"; 
import { NextConfig } from "next";

const nextConfig: NextConfig = {
  i18n: {
    locales: ["en", "pt-br"],
    defaultLocale: "pt-br",
  },
};

const withNextIntl = createNextIntlPlugin();

export default withSerwist(withNextIntl(nextConfig));
