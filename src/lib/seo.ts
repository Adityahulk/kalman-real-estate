const DEFAULT_SITE_URL = "https://widestateos.com";

export const seoConfig = {
  name: "WIDESTATE OS",
  alternateName: "WideState OS",
  companyName: "Kalman Labs",
  siteUrl: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  title: "Real Estate Builder Software & CRM | WIDESTATE OS",
  description:
    "Real estate builder software for CRM, plot inventory, ownership, allotment letters, construction, documents and costs, serving teams in Punjab and Hyderabad.",
  email: process.env.NEXT_PUBLIC_SALES_EMAIL ?? "company@kalman-labs.com",
  phone: process.env.NEXT_PUBLIC_SALES_WHATSAPP ?? "918292098293",
  regions: ["Punjab", "Bathinda", "Barnala", "Hyderabad"],
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, `${seoConfig.siteUrl}/`).toString();
}

function normalizeSiteUrl(value: string | undefined) {
  if (!value) return DEFAULT_SITE_URL;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return DEFAULT_SITE_URL;
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
}
