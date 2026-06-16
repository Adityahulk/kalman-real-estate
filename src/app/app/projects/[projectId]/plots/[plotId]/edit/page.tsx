import { notFound } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { ActionPageShell } from "../../../../action-page-shell";
import { ManualPlotForm } from "../../../../manual-entry-actions";

export const dynamic = "force-dynamic";

export default async function EditPlotPage({ params }: { params: { projectId: string; plotId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  const plot = await prisma.plot.findFirst({
    where: { id: params.plotId, projectId: params.projectId, tenantId: session.tenantId, archivedAt: null },
    include: { project: true },
  });
  if (!plot) notFound();
  const latestCad = await prisma.cadFile.findFirst({
    where: { tenantId: session.tenantId, projectId: plot.projectId, analysis: { previewArtifactKey: { not: null } } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return (
    <ActionPageShell
      eyebrow={`${plot.project.name} / ${plot.code}`}
      title="Edit plot details"
      description="Update plot code, area, allotting details, map reference, and boundary notes."
      backHref={`/app/projects/${plot.projectId}/plots/${plot.id}`}
      backLabel="Back to plot"
    >
      <ManualPlotForm
        projectId={plot.projectId}
        cadFileId={latestCad?.id}
        plot={{
          id: plot.id,
          code: plot.code,
          areaSqYards: plot.areaSqYards?.toString() ?? null,
          primeLocation: plot.primeLocation,
          allottedBy: plot.allottedBy,
          dimensions: plot.dimensions,
          boundaries: plot.boundaries as Record<string, unknown> | null,
        }}
      />
    </ActionPageShell>
  );
}
