import { notFound } from "next/navigation";
import { PlotStatus } from "@prisma/client";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { ActionHint, ActionPageShell } from "../../../action-page-shell";
import { ProjectAllotmentFlow } from "../../../workflow-action-forms";
import { templateFields } from "@/server/services/document-templates";

export const dynamic = "force-dynamic";

export default async function NewAllotmentPage({
  params,
  searchParams,
}: {
  params: { projectId: string };
  searchParams: { plotId?: string };
}) {
  const session = await getSessionUser();
  if (!session) return null;
  const project = await prisma.project.findFirst({ where: { id: params.projectId, tenantId: session.tenantId } });
  if (!project) notFound();
  const [plots, firm, letterTemplate] = await Promise.all([
    prisma.plot.findMany({
      where: {
        tenantId: session.tenantId,
        projectId: project.id,
        archivedAt: null,
        OR: [
          { status: PlotStatus.COMPANY_OWNED },
          ...(searchParams.plotId ? [{ id: searchParams.plotId }] : []),
        ],
      },
      orderBy: { code: "asc" },
      select: { id: true, code: true, areaSqYards: true, areaSqft: true, priceInr: true, dimensions: true, boundaries: true, currentOwnerId: true },
    }),
    prisma.tenant.findUniqueOrThrow({
      where: { id: session.tenantId },
      select: { name: true, address: true, pan: true, contactEmail: true, contactPhone: true, authorizedPersons: true },
    }),
    prisma.documentTemplate.findFirst({ where: { tenantId: session.tenantId, projectId: project.id, type: "allotment_letter", active: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const authorizedPersons = Array.isArray(firm.authorizedPersons)
    ? firm.authorizedPersons.map((person) => {
        if (typeof person === "string") return person;
        if (person && typeof person === "object" && "name" in person && typeof person.name === "string") return person.name;
        return JSON.stringify(person);
      })
    : [];

  return (
    <ActionPageShell
      eyebrow={project.name}
      title="New allotment"
      description="Select a plot and record the allottee, firm, payment, and supporting details."
      backHref={`/app/projects/${project.id}/ownership`}
      backLabel="Back to ownership ledger"
      aside={<ActionHint title="After saving">The plot moves out of company inventory and its ownership history is updated.</ActionHint>}
    >
      <ProjectAllotmentFlow
        projectId={project.id}
        defaultPlotId={searchParams.plotId}
        plots={plots.map((plot) => {
          const boundaries = plot.boundaries && typeof plot.boundaries === "object" && !Array.isArray(plot.boundaries)
            ? plot.boundaries as Record<string, unknown>
            : null;
          return {
            id: plot.id,
            code: plot.code,
            areaSqYards: plot.areaSqYards?.toString() ?? (plot.areaSqft ? String(Number(plot.areaSqft) / 9) : null),
            areaSqft: plot.areaSqft?.toString() ?? null,
            priceInr: plot.priceInr?.toString() ?? null,
            dimensions: plot.dimensions,
            currentOwnerId: plot.currentOwnerId,
            boundaries: boundaries
              ? {
                  north: typeof boundaries.north === "string" ? boundaries.north : null,
                  northDimension: typeof boundaries.northDimension === "string" ? boundaries.northDimension : null,
                  south: typeof boundaries.south === "string" ? boundaries.south : null,
                  southDimension: typeof boundaries.southDimension === "string" ? boundaries.southDimension : null,
                  east: typeof boundaries.east === "string" ? boundaries.east : null,
                  eastDimension: typeof boundaries.eastDimension === "string" ? boundaries.eastDimension : null,
                  west: typeof boundaries.west === "string" ? boundaries.west : null,
                  westDimension: typeof boundaries.westDimension === "string" ? boundaries.westDimension : null,
                }
              : null,
          };
        })}
        firm={{ ...firm, authorizedPersons }}
        manualLetterFields={templateFields(letterTemplate?.variables).filter((field) => !field.mapping).map((field) => ({ key: field.key, label: field.label }))}
      />
    </ActionPageShell>
  );
}
