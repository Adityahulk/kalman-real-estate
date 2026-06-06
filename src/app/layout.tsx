import "../styles/globals.css";
import "ol/ol.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kalman Estate OS — Real Estate Builder Operating System",
  description:
    "Real estate builder software for CAD visualization, ownership ledgers, site progress, documents, cost control, and AI insights.",
  metadataBase: new URL("https://kalman.estate")
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
