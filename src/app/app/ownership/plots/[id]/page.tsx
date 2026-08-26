import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";

export const dynamic = "force-dynamic";

export default async function LegacyPlotDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requirePagePermission("ownership.view");
  const plot = await prisma.plot.findFirst({
    where: { id: params.id, tenantId: session.tenantId, archivedAt: null, ...(Array.isArray(session.projectIds) ? { projectId: { in: session.projectIds } } : {}) },
    select: { id: true, projectId: true },
  });
  if (!plot) notFound();
  redirect(`/app/projects/${plot.projectId}/plots/${plot.id}`);
}
