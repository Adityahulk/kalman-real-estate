import type { Metadata } from "next";
import { absoluteUrl, seoConfig } from "@/lib/seo";
import { LandingPage } from "./public/landing-page";

export const metadata: Metadata = {
  title: { absolute: seoConfig.title },
  description: seoConfig.description,
  alternates: { canonical: "/" },
  keywords: [
    "real estate builder software",
    "real estate software Punjab",
    "real estate CRM Hyderabad",
    "plot management software Bathinda",
    "builder software Barnala",
    "real estate CRM",
    "plot management software",
    "construction progress software",
    "real estate ownership management",
    "builder ERP",
    "real estate document management",
    "real estate project management software",
  ],
  openGraph: {
    url: seoConfig.siteUrl,
    title: seoConfig.title,
    description: seoConfig.description,
  },
};

export default function Home() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${seoConfig.siteUrl}/#organization`,
      name: seoConfig.companyName,
      url: seoConfig.siteUrl,
      logo: absoluteUrl("/icon.svg"),
      email: seoConfig.email,
      telephone: `+${seoConfig.phone.replace(/\D/g, "")}`,
      areaServed: seoConfig.regions.map((name) => ({ "@type": "AdministrativeArea", name })),
      brand: { "@type": "Brand", name: seoConfig.name },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${seoConfig.siteUrl}/#website`,
      url: seoConfig.siteUrl,
      name: seoConfig.name,
      alternateName: seoConfig.alternateName,
      publisher: { "@id": `${seoConfig.siteUrl}/#organization` },
      inLanguage: "en-IN",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": `${seoConfig.siteUrl}/#software`,
      name: seoConfig.name,
      alternateName: seoConfig.alternateName,
      url: seoConfig.siteUrl,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Real estate builder software",
      operatingSystem: "Web, Android, iOS",
      description: seoConfig.description,
      provider: { "@id": `${seoConfig.siteUrl}/#organization` },
      areaServed: seoConfig.regions.map((name) => ({ "@type": "AdministrativeArea", name })),
      featureList: [
        "Real estate CRM and lead management",
        "Plot inventory and interactive project maps",
        "Allotment, transfer and ownership workflows",
        "Legal document and letter management",
        "Construction progress and contractor tracking",
        "BOQ, cost and management reporting",
        "Owner portal and role-based access",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${seoConfig.siteUrl}/#implementation-service`,
      name: "Real estate software implementation",
      serviceType: "Real estate CRM, builder ERP and plot management software implementation",
      provider: { "@id": `${seoConfig.siteUrl}/#organization` },
      areaServed: seoConfig.regions.map((name) => ({ "@type": "AdministrativeArea", name })),
      url: seoConfig.siteUrl,
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }}
      />
      <LandingPage
        whatsappNumber={process.env.NEXT_PUBLIC_SALES_WHATSAPP ?? "918292098293"}
        salesEmail={process.env.NEXT_PUBLIC_SALES_EMAIL ?? "company@kalman-labs.com"}
        currentYear={new Date().getUTCFullYear()}
      />
    </>
  );
}
