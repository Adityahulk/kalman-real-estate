import { notFound } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { ActionHint, ActionPageShell } from "../../../../../action-page-shell";
import { LetterDraftStartForm } from "../../../../../workflow-action-forms";

export const dynamic = "force-dynamic";

export default async function NewLetterPage({
  params,
  searchParams,
}: {
  params: { projectId: string; plotId: string };
  searchParams: { type?: "allotment_letter" | "transfer_letter" | "registry_status_letter" };
}) {
  const session = await getSessionUser();
  if (!session) return null;
  const plot = await prisma.plot.findFirst({
    where: { id: params.plotId, tenantId: session.tenantId, projectId: params.projectId },
    include: { project: true, currentOwner: true },
  });
  if (!plot) notFound();

  return (
    <ActionPageShell
      eyebrow={`${plot.project.name} / ${plot.code}`}
      title="Create letter draft"
      description="Choose the letter type. The system will fill project, plot, owner, ownership, and registry values into an editable draft."
      backHref={`/app/projects/${plot.projectId}/plots/${plot.id}?tab=documents`}
      backLabel="Back to documents"
      aside={<ActionHint title="Current owner">{plot.currentOwner?.name ?? "Company inventory"}</ActionHint>}
    >
      <div className="card p-5">
        <LetterDraftStartForm plotId={plot.id} projectId={plot.projectId} defaultType={searchParams.type ?? "allotment_letter"} />
      </div>
    </ActionPageShell>
  );
}
