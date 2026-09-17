import type { Metadata } from "next";
import { EngagementsPage } from "../portfolio-ui";

export const metadata: Metadata = {
  title: "Selected Real Estate Engagements | Kalman Labs",
  description: "Selected named, confidential and configurable real estate technology engagements from Kalman Labs.",
  alternates: { canonical: "/portfolio/engagements" },
  openGraph: {
    url: "/portfolio/engagements",
    title: "Selected Real Estate Engagements | Kalman Labs",
    description: "Real estate software implementation work across ownership, documents, inventory and management workflows.",
  },
};

export default function Page() {
  return <EngagementsPage />;
}
