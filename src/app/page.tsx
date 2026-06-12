import type { Metadata } from "next";
import { LandingPage } from "./public/landing-page";

export const metadata: Metadata = {
  title: "WIDESTATE OS | Real Estate Builder Software, CRM and Project Management",
  description:
    "Manage real estate projects, interactive site maps, plot ownership, documents, construction, CRM, costs, contractors and owner services with WIDESTATE OS by Kalman Labs.",
  keywords: [
    "real estate builder software",
    "real estate CRM",
    "plot management software",
    "construction progress software",
    "real estate ownership management",
    "builder ERP",
    "real estate document management",
    "real estate project management software",
  ],
};

export default function Home() {
  return (
    <LandingPage
      whatsappNumber={process.env.NEXT_PUBLIC_SALES_WHATSAPP ?? "918292098293"}
      salesEmail={process.env.NEXT_PUBLIC_SALES_EMAIL ?? "company@kalman-labs.com"}
    />
  );
}
