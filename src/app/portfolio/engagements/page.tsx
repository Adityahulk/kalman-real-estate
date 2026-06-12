import type { Metadata } from "next";
import { EngagementsPage } from "../portfolio-ui";

export const metadata: Metadata = {
  title: "Selected Real Estate Engagements | Kalman Labs",
  description: "Selected named, confidential and configurable real estate technology engagements from Kalman Labs.",
};

export default function Page() {
  return <EngagementsPage />;
}

