import { notFound } from "next/navigation";
import { PlotStatus } from "@prisma/client";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { ActionHint, ActionPageShell } from "../../../action-page-shell";
import { ProjectAllotmentFlow } from "../../../workflow-action-forms";

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
  const [plots, owners] = await Promise.all([
    prisma.plot.findMany({
      where: { tenantId: session.tenantId, projectId: project.id, status: PlotStatus.COMPANY_OWNED },
      orderBy: { code: "asc" },
      select: { id: true, code: true, areaSqft: true, priceInr: true },
    }),
    prisma.owner.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, phone: true },
    }),
  ]);

  return (
    <ActionPageShell
      eyebrow={project.name}
      title="New allotment"
      description="Select a company-owned plot, add or choose the owner, record allotment details, then open Letter Studio for the allotment letter."
      backHref={`/app/projects/${project.id}/ownership`}
      backLabel="Back to ownership ledger"
      aside={<ActionHint title="After saving">The plot owner, status, ownership record, and audit history are updated. Letter generation stays a separate editable step.</ActionHint>}
    >
      <div className="card p-5">
        <ProjectAllotmentFlow
          projectId={project.id}
          defaultPlotId={searchParams.plotId}
          plots={plots.map((plot) => ({
            id: plot.id,
            code: plot.code,
            areaSqft: plot.areaSqft?.toString() ?? null,
            priceInr: plot.priceInr?.toString() ?? null,
          }))}
          owners={owners}
        />
      </div>
    </ActionPageShell>
  );
}
