import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kalman Estate — The Operating System for Modern Builders",
  description:
    "End-to-end software for real estate developers: ownership, site & plot development tracking, marketing, CRM and AI cost intelligence.",
  metadataBase: new URL("https://kalman.estate")
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
