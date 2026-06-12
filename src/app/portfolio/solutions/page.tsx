import type { Metadata } from "next";
import { SolutionsPage } from "../portfolio-ui";

export const metadata: Metadata = {
  title: "Real Estate Technology Solutions | Kalman Labs",
  description: "Builder operating systems, CRM and CLM, ownership, legal documents, construction intelligence and custom real estate technology.",
};

export default function Page() {
  return <SolutionsPage />;
}

