import type { Metadata } from "next";
import { PortfolioHome } from "./portfolio-ui";

export const metadata: Metadata = {
  title: "Kalman Labs Real Estate Technology Portfolio",
  description: "Explore WIDESTATE OS, real estate CRM and CLM, ownership, documents, construction, cost control and selected Kalman Labs engagements.",
  alternates: { canonical: "/portfolio" },
  openGraph: {
    type: "website",
    url: "/portfolio",
    title: "Kalman Labs Real Estate Technology Portfolio",
    description: "Real estate software, CRM, ownership, document and construction solutions delivered by Kalman Labs.",
  },
};

export default function PortfolioPage() {
  return <PortfolioHome />;
}
