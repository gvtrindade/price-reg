import { cn } from "@/lib/utils";
import { Toaster } from "@/components/toast";
import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Geist,
  Inter,
  Inter_Tight,
  JetBrains_Mono,
  Roboto_Mono,
} from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: "700",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  const appName = t("appName");
  const appDescription = t("appDescription");
  const appTitle = {
    default: appName,
    template: `%s - ${appName}`,
  };

  return {
    applicationName: appName,
    title: appTitle,
    description: appDescription,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: appName,
    },
    formatDetection: {
      telephone: false,
    },
    openGraph: {
      type: "website",
      siteName: appName,
      title: appTitle,
      description: appDescription,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={cn(
        "h-full",
        inter.variable,
        robotoMono.variable,
        jetbrainsMono.variable,
        interTight.variable,
        "font-sans",
        geist.variable,
      )}
    >
      <body className="min-h-full flex flex-col scanlines">
        <SerwistProvider swUrl="/serwist/sw.js">
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </SerwistProvider>
        <Toaster />
      </body>
    </html>
  );
}
