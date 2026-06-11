import { notFound } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { ActionPageShell } from "../../../action-page-shell";
import { ManualPlotForm } from "../../../manual-entry-actions";

export const dynamic = "force-dynamic";

export default async function AddPlotPage({ params }: { params: { projectId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  const project = await prisma.project.findFirst({ where: { id: params.projectId, tenantId: session.tenantId } });
  if (!project) notFound();
  const latestCad = await prisma.cadFile.findFirst({
    where: { tenantId: session.tenantId, projectId: project.id, analysis: { previewArtifactKey: { not: null } } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return (
    <ActionPageShell
      eyebrow={project.name}
      title="Add plot"
      description="Add a company-owned plot and record its location within the project."
      backHref={`/app/projects/${project.id}/ownership`}
      backLabel="Back to ownership ledger"
    >
      <ManualPlotForm projectId={project.id} cadFileId={latestCad?.id} />
    </ActionPageShell>
  );
}
