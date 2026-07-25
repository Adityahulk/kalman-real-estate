import { notFound } from "next/navigation";
import { CaseStudyPage } from "../../portfolio-ui";
import { publicEngagements } from "../../portfolio-data";

export function generateStaticParams() {
  return publicEngagements
    .filter((engagement) => engagement.evidence !== "PRODUCT_CAPABILITY")
    .map((engagement) => ({ slug: engagement.slug }));
}

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const engagement = publicEngagements.find((item) => item.slug === params.slug && item.evidence !== "PRODUCT_CAPABILITY");
  if (!engagement) notFound();
  return <CaseStudyPage engagement={engagement} />;
}

