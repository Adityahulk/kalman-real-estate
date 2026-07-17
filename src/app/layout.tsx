import "../styles/globals.css";
import "ol/ol.css";
import type { Metadata, Viewport } from "next";
import { ClientErrorLogger } from "@/components/client-error-logger";
import { AppErrorToast } from "@/components/app-error-toast";
import { PwaNativeBoot } from "@/components/pwa-native-boot";

export const metadata: Metadata = {
  title: {
    default: "WIDESTATE OS — Real Estate Builder Operating System",
    template: "%s | WIDESTATE OS",
  },
  description:
    "Real estate builder software for Map visualization, ownership ledgers, site progress, documents, cost control, and AI insights.",
  metadataBase: new URL("https://kalman.estate"),
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "WIDESTATE OS" },
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
    <html lang="en">
      <body>
        <ClientErrorLogger />
        <AppErrorToast />
        <PwaNativeBoot />
        {children}
      </body>
    </html>
  );
}
