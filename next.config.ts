import { withSerwist } from "@serwist/turbopack";
import createNextIntlPlugin from "next-intl/plugin"; 
import { NextConfig } from "next";

const nextConfig: NextConfig = {
    allowedDevOrigins: ['192.168.1.10'] 
};

const withNextIntl = createNextIntlPlugin();

export default withSerwist(withNextIntl(nextConfig));
