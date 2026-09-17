import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseStudyPage } from "../../portfolio-ui";
import { publicEngagements } from "../../portfolio-data";

export function generateStaticParams() {
  return publicEngagements
    .filter((engagement) => engagement.evidence !== "PRODUCT_CAPABILITY")
    .map((engagement) => ({ slug: engagement.slug }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const engagement = publicEngagements.find((item) => item.slug === slug && item.evidence !== "PRODUCT_CAPABILITY");
  if (!engagement) return { title: "Case Study" };

  const path = `/portfolio/case-studies/${engagement.slug}`;
  return {
    title: `${engagement.displayName} Real Estate Software Case Study`,
    description: engagement.summary,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title: `${engagement.displayName} Real Estate Software Case Study`,
      description: engagement.summary,
    },
  };
}

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const engagement = publicEngagements.find((item) => item.slug === params.slug && item.evidence !== "PRODUCT_CAPABILITY");
  if (!engagement) notFound();
  return <CaseStudyPage engagement={engagement} />;
}
