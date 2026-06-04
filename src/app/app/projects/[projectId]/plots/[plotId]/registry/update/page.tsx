import { notFound } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { ActionHint, ActionPageShell } from "../../../../../action-page-shell";
import { OwnershipDocumentUpload, PlotRegistryForm } from "../../../../../../ownership/ownership-actions";

export const dynamic = "force-dynamic";

export default async function UpdateRegistryPage({ params }: { params: { projectId: string; plotId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  const plot = await prisma.plot.findFirst({
    where: { id: params.plotId, tenantId: session.tenantId, projectId: params.projectId },
    include: { project: true, registryRecords: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!plot) notFound();
  const latest = plot.registryRecords[0];

  return (
    <ActionPageShell
      eyebrow={`${plot.project.name} / ${plot.code}`}
      title="Update registry"
      description="Save registry status, number, date, office notes, and attach registry receipt or deed."
      backHref={`/app/projects/${plot.projectId}/plots/${plot.id}`}
      backLabel="Back to plot"
      aside={<ActionHint title="Latest status">{latest?.status ?? "Not started"}</ActionHint>}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <PlotRegistryForm plotId={plot.id} />
        <OwnershipDocumentUpload ownerType="Plot" ownerId={plot.id} defaultVisibility="OWNER_VISIBLE" defaultDocumentType="REGISTRY_RECEIPT" title="Upload registry receipt / deed" />
      </div>
    </ActionPageShell>
  );
}
