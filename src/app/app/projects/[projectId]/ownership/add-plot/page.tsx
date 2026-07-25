import { notFound } from "next/navigation";
import { requirePagePermission } from "@/server/page-auth";
import { prisma } from "@/server/db";
import { ActionPageShell } from "../../../action-page-shell";
import { ManualPlotForm } from "../../../manual-entry-actions";

export const dynamic = "force-dynamic";

export default async function AddPlotPage(props: { params: Promise<{ projectId: string }> }) {
  const params = await props.params;
  const session = await requirePagePermission("ownership.manage");
  const project = await prisma.project.findFirst({ where: { id: params.projectId, tenantId: session.tenantId } });
  if (!project) notFound();
  const [latestCad, latestPlot] = await Promise.all([
    prisma.cadFile.findFirst({
      where: { tenantId: session.tenantId, projectId: project.id, analysis: { previewArtifactKey: { not: null } } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),
    prisma.plot.findFirst({
      where: { tenantId: session.tenantId, projectId: project.id, archivedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        code: true,
        areaSqYards: true,
        primeLocation: true,
        allottedBy: true,
        dimensions: true,
        boundaries: true,
      },
    }),
  ]);

  return (
    <ActionPageShell
      eyebrow={project.name}
      title="Add plot"
      description="Add a company-owned plot and record its location within the project."
      backHref={`/app/projects/${project.id}/ownership`}
      backLabel="Back to ownership ledger"
    >
      <ManualPlotForm
        projectId={project.id}
        cadFileId={latestCad?.id}
        lastPlot={latestPlot ? {
          code: latestPlot.code,
          areaSqYards: latestPlot.areaSqYards?.toString() ?? null,
          primeLocation: latestPlot.primeLocation,
          allottedBy: latestPlot.allottedBy,
          dimensions: latestPlot.dimensions,
          boundaries: latestPlot.boundaries as Record<string, unknown> | null,
        } : undefined}
      />
    </ActionPageShell>
  );
}
