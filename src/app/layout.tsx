import "../styles/globals.css";
import "ol/ol.css";
import type { Metadata, Viewport } from "next";
import { ClientErrorLogger } from "@/components/client-error-logger";
import { AppErrorToast } from "@/components/app-error-toast";
import { PwaNativeBoot } from "@/components/pwa-native-boot";
import { absoluteUrl, seoConfig } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    default: seoConfig.title,
    template: "%s | WIDESTATE OS",
  },
  description: seoConfig.description,
  metadataBase: new URL(seoConfig.siteUrl),
  applicationName: seoConfig.name,
  authors: [{ name: seoConfig.companyName, url: seoConfig.siteUrl }],
  creator: seoConfig.companyName,
  publisher: seoConfig.companyName,
  category: "Business Software",
  referrer: "origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "WIDESTATE OS" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: seoConfig.siteUrl,
    siteName: seoConfig.name,
    title: seoConfig.title,
    description: seoConfig.description,
    images: [{ url: absoluteUrl("/opengraph-image"), width: 1200, height: 630, alt: "WIDESTATE OS real estate builder software" }],
  },
  twitter: {
    card: "summary_large_image",
    title: seoConfig.title,
    description: seoConfig.description,
    images: [absoluteUrl("/opengraph-image")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
};

// viewport-fit=cover lets the app draw under the notch/home-indicator; env(safe-area-inset-*)
// utilities in globals.css reclaim that space. maximumScale keeps form inputs from triggering
// iOS auto-zoom in the native shell.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1220",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ClientErrorLogger />
        <AppErrorToast />
        <PwaNativeBoot />
        {children}
      </body>
    </html>
  );
}
