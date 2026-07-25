import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { ActionHint, ActionPageShell } from "../../../../action-page-shell";
import { PlotTransferForm } from "../../../../../ownership/ownership-actions";
import { ensureProjectLetterTemplates, extractTemplateFieldsFromBody, templateFields } from "@/server/services/document-templates";
import { listLetterFieldSettings } from "@/server/services/letter-field-settings";

export const dynamic = "force-dynamic";

export default async function TransferPlotPage({ params }: { params: { projectId: string; plotId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  await ensureProjectLetterTemplates(session.tenantId, params.projectId);
  const [plot, firm, letterTemplate, letterCategories, originalAllotment] = await Promise.all([
    prisma.plot.findFirst({
      where: { id: params.plotId, tenantId: session.tenantId, projectId: params.projectId, archivedAt: null },
      include: { project: true, currentOwner: true },
    }),
    prisma.tenant.findUniqueOrThrow({ where: { id: session.tenantId }, select: { maxTransfersPerPlot: true } }),
    prisma.documentTemplate.findFirst({ where: { tenantId: session.tenantId, projectId: params.projectId, type: "transfer_letter", active: true }, orderBy: { createdAt: "desc" } }),
    listLetterFieldSettings(session.tenantId),
    prisma.generatedDocument.findFirst({
      where: {
        tenantId: session.tenantId,
        recordId: params.plotId,
        type: "allotment_letter",
        number: { not: null },
        status: { not: "REJECTED" },
      },
      orderBy: { createdAt: "desc" },
      select: { number: true, finalizedAt: true, createdAt: true },
    }),
  ]);
  if (!plot) notFound();
  const [owners, acceptedTransfers] = await Promise.all([
    prisma.owner.findMany({ where: { tenantId: session.tenantId }, orderBy: { name: "asc" } }),
    acceptedTransferCount(session.tenantId, plot.id),
  ]);
  const availableLetterFields = letterCategories.flatMap((category) => category.fields.map((field) => ({
    id: field.id,
    label: field.label,
    mapping: field.mapping,
  })));
  const resolvedTemplateFields = templateFields(letterTemplate?.variables).length
    ? templateFields(letterTemplate?.variables)
    : extractTemplateFieldsFromBody(letterTemplate?.body, availableLetterFields);

  return (
    <ActionPageShell
      eyebrow={`${plot.project.name} / ${plot.code}`}
      title="New transfer"
      description="Enter the transferee details, record the transfer, and continue directly to the transfer letter draft."
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
      ) : <PlotTransferForm
        plotId={plot.id}
        projectId={plot.projectId}
        owners={owners}
        currentOwner={plot.currentOwner ?? undefined}
        originalAllotment={{
          number: originalAllotment?.number ?? "",
          date: dateInput(originalAllotment?.finalizedAt ?? originalAllotment?.createdAt),
        }}
        manualLetterFields={resolvedTemplateFields
          .filter((field) => !field.mapping || field.mapping.startsWith("manual."))
          .map((field) => ({ key: field.key, label: field.label, inputType: field.inputType }))}
      />}
    </ActionPageShell>
  );
}

function dateInput(value: Date | null | undefined) {
  if (!value) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function acceptedTransferCount(tenantId: string, plotId: string) {
  const records = await prisma.ownershipRecord.findMany({ where: { tenantId, plotId, kind: "TRANSFER", documentId: { not: null } }, select: { documentId: true } });
  const ids = records.map((record) => record.documentId).filter(Boolean) as string[];
  if (!ids.length) return 0;
  return prisma.generatedDocument.count({ where: { tenantId, id: { in: ids }, status: { in: ["APPROVED", "ISSUED"] } } });
}
