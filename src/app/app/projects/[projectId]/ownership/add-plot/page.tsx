import { notFound } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { ActionHint, ActionPageShell } from "../../../action-page-shell";
import { ManualPlotForm } from "../../../manual-entry-actions";

export const dynamic = "force-dynamic";

export default async function AddPlotPage({ params }: { params: { projectId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  const project = await prisma.project.findFirst({ where: { id: params.projectId, tenantId: session.tenantId } });
  if (!project) notFound();

  return (
    <ActionPageShell
      eyebrow={project.name}
      title="Add plot"
      description="Create a company-owned plot manually. It will immediately use the same ownership, document, registry, letter, and history workflow as CAD-created plots."
      backHref={`/app/projects/${project.id}/ownership`}
      backLabel="Back to ownership ledger"
      aside={<ActionHint title="Manual plot entry">Use this when the builder has plot numbers and records but no CAD layout yet.</ActionHint>}
    >
      <ManualPlotForm projectId={project.id} />
    </ActionPageShell>
  );
}
