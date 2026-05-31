import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function LegacyPlotDetailPage({ params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  const plot = await prisma.plot.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: { id: true, projectId: true },
  });
  if (!plot) notFound();
  redirect(`/app/projects/${plot.projectId}/plots/${plot.id}`);
}
