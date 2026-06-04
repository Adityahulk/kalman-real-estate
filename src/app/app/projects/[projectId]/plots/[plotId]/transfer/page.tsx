import { notFound } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { ActionHint, ActionPageShell } from "../../../../action-page-shell";
import { PlotTransferForm } from "../../../../../ownership/ownership-actions";

export const dynamic = "force-dynamic";

export default async function TransferPlotPage({ params }: { params: { projectId: string; plotId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  const plot = await prisma.plot.findFirst({
    where: { id: params.plotId, tenantId: session.tenantId, projectId: params.projectId },
    include: { project: true, currentOwner: true },
  });
  if (!plot) notFound();
  const owners = await prisma.owner.findMany({ where: { tenantId: session.tenantId }, orderBy: { name: "asc" } });

  return (
    <ActionPageShell
      eyebrow={`${plot.project.name} / ${plot.code}`}
      title="Change owner"
      description="Record a transfer or resale. The ownership timeline, current owner, plot status, and audit history will update after saving."
      backHref={`/app/projects/${plot.projectId}/plots/${plot.id}`}
      backLabel="Back to plot"
      aside={<ActionHint title="Current owner">{plot.currentOwner?.name ?? "Company inventory"}</ActionHint>}
    >
      <PlotTransferForm plotId={plot.id} owners={owners} />
    </ActionPageShell>
  );
}
