import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { BRAND_COLORS, BRAND_NAME, SITE_URL } from "@/lib/config";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

const description =
  "What's happening right now in Nigeria — live crowd levels and photos from venues, the December in Nigeria calendar, honest prices and city guides.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${BRAND_NAME} — What's happening right now`, template: `%s · ${BRAND_NAME}` },
  description,
  applicationName: BRAND_NAME,
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    title: BRAND_NAME,
    description,
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image", title: BRAND_NAME, description },
  appleWebApp: { capable: true, title: BRAND_NAME, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: BRAND_COLORS.background,
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en-NG"
      className={`dark ${inter.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh font-sans">
        <Providers>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
