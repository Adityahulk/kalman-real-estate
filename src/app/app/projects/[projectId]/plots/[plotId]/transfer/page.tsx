import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/server/page-auth";
import { prisma } from "@/server/db";
import { ActionHint, ActionPageShell } from "../../../../action-page-shell";
import { PlotTransferForm } from "../../../../../ownership/ownership-actions";
import { ensureProjectLetterTemplates, extractTemplateFieldsFromBody, templateFields } from "@/server/services/document-templates";
import { listLetterFieldSettings } from "@/server/services/letter-field-settings";

export const dynamic = "force-dynamic";

export default async function TransferPlotPage(props: {
  params: Promise<{ projectId: string; plotId: string }>;
  searchParams: Promise<{ historical?: string; historicalFileId?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const session = await requirePagePermission("ownership.manage");
  await ensureProjectLetterTemplates(session.tenantId, params.projectId);
  const [plot, firm, letterTemplate, letterCategories, originalAllotment, historicalFile] = await Promise.all([
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
        type: { in: ["allotment_letter", "allotment_letter_joint"] },
        archivedAt: null,
        number: { not: null },
        status: { notIn: ["REJECTED", "CHANGES_REQUESTED"] },
      },
      orderBy: { createdAt: "desc" },
      select: { number: true, finalizedAt: true, createdAt: true },
    }),
    searchParams.historical === "1" && searchParams.historicalFileId
      ? prisma.fileAsset.findFirst({
          where: {
            id: searchParams.historicalFileId,
            tenantId: session.tenantId,
            ownerType: "Plot",
            ownerId: params.plotId,
            categoryKey: { in: ["old-documents", "signed-transfer-letter"] },
            documentType: "TRANSFER_LETTER",
            deletedAt: null,
          },
        })
      : null,
  ]);
  if (!plot) notFound();
  if (searchParams.historical === "1" && !historicalFile) notFound();
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
        historicalImport={historicalFile ? {
          fileAssetId: historicalFile.id,
          documentNumber: historicalFile.documentNo ?? "",
          documentDate: dateInput(historicalFile.documentDate),
        } : undefined}
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
  const records = await prisma.ownershipRecord.findMany({ where: { tenantId, plotId, kind: "TRANSFER", cancelledAt: null, documentId: { not: null } }, select: { documentId: true } });
  const ids = records.map((record) => record.documentId).filter(Boolean) as string[];
  if (!ids.length) return 0;
  return prisma.generatedDocument.count({
    where: { tenantId, id: { in: ids }, archivedAt: null, status: { in: ["APPROVED", "ISSUED", "SENT_FOR_SIGNATURE", "SIGNED"] } },
  });
}
