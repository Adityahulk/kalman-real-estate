import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { ActionHint, ActionPageShell } from "../../../../action-page-shell";
import { PlotTransferForm } from "../../../../../ownership/ownership-actions";

export const dynamic = "force-dynamic";

export default async function TransferPlotPage({ params }: { params: { projectId: string; plotId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  const [plot, firm] = await Promise.all([
    prisma.plot.findFirst({
      where: { id: params.plotId, tenantId: session.tenantId, projectId: params.projectId, archivedAt: null },
      include: { project: true, currentOwner: true },
    }),
    prisma.tenant.findUniqueOrThrow({ where: { id: session.tenantId }, select: { maxTransfersPerPlot: true } }),
  ]);
  if (!plot) notFound();
  const [owners, acceptedTransfers] = await Promise.all([
    prisma.owner.findMany({ where: { tenantId: session.tenantId }, orderBy: { name: "asc" } }),
    acceptedTransferCount(session.tenantId, plot.id),
  ]);

  return (
    <ActionPageShell
      eyebrow={`${plot.project.name} / ${plot.code}`}
      title="New transfer"
      description="Record a transfer or resale. The ownership timeline, current owner, plot status, and audit history will update after saving."
      backHref={`/app/projects/${plot.projectId}/plots/${plot.id}`}
      backLabel="Back to plot"
      aside={<ActionHint title="Current owner">{plot.currentOwner?.name ?? "Company inventory"}</ActionHint>}
    >
      {acceptedTransfers >= firm.maxTransfersPerPlot ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="font-semibold">Transfer limit reached</div>
          <p className="mt-2">This plot already has {acceptedTransfers} accepted transfer(s). The configured cap is {firm.maxTransfersPerPlot}. Continue with registry only.</p>
          <Link className="btn-primary mt-4 w-fit" href={`/app/projects/${plot.projectId}/plots/${plot.id}/registry/update`}>Update registry</Link>
        </div>
      ) : <PlotTransferForm plotId={plot.id} owners={owners} />}
    </ActionPageShell>
  );
}

async function acceptedTransferCount(tenantId: string, plotId: string) {
  const records = await prisma.ownershipRecord.findMany({ where: { tenantId, plotId, kind: "TRANSFER", documentId: { not: null } }, select: { documentId: true } });
  const ids = records.map((record) => record.documentId).filter(Boolean) as string[];
  if (!ids.length) return 0;
  return prisma.generatedDocument.count({ where: { tenantId, id: { in: ids }, status: { in: ["APPROVED", "ISSUED"] } } });
}
