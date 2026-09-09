import { notFound } from "next/navigation";
import { requirePagePermission } from "@/server/page-auth";
import { prisma } from "@/server/db";
import { ActionHint, ActionPageShell } from "../../../../../action-page-shell";
import { HistoricalOwnershipDocumentUpload, OwnershipDocumentUpload } from "../../../../../../ownership/ownership-actions";
import { SignedLetterUpload } from "@/components/signed-letter-upload";

export const dynamic = "force-dynamic";

export default async function UploadPlotDocumentPage(props: { params: Promise<{ projectId: string; plotId: string }> }) {
  const params = await props.params;
  const session = await requirePagePermission("files.upload");
  const [plot, latestOwnershipLetter, transferCount] = await Promise.all([
    prisma.plot.findFirst({
      where: { id: params.plotId, tenantId: session.tenantId, projectId: params.projectId, archivedAt: null },
      include: { project: true, currentOwner: true },
    }),
    prisma.generatedDocument.findFirst({
      where: {
        tenantId: session.tenantId,
        recordType: "Plot",
        recordId: params.plotId,
        archivedAt: null,
        OR: [
          { type: { contains: "allotment", mode: "insensitive" } },
          { type: { contains: "transfer", mode: "insensitive" } },
        ],
        status: { in: ["APPROVED", "SENT_FOR_SIGNATURE", "SIGNED"] },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ownershipRecord.count({
      where: { tenantId: session.tenantId, plotId: params.plotId, kind: "TRANSFER", cancelledAt: null },
    }),
  ]);
  if (!plot) notFound();

  return (
    <ActionPageShell
      eyebrow={`${plot.project.name} / ${plot.code}`}
      title="Upload document"
      description="Upload plot legal documents or owner KYC documents with reference number, date, visibility, and notes."
      backHref={`/app/projects/${plot.projectId}/plots/${plot.id}?tab=documents`}
      backLabel="Back to documents"
      aside={<ActionHint title="Visibility defaults">PAN, Aadhaar, and KYC should stay team-visible. Allotment, transfer, registry receipt, and registry deed can be owner-visible after review.</ActionHint>}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <OwnershipDocumentUpload
          ownerType="Plot"
          ownerId={plot.id}
          defaultVisibility="OWNER_VISIBLE"
          defaultDocumentType="OTHER"
          excludeOwnershipLetters
          title="Upload plot document"
        />
        {latestOwnershipLetter ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
            <h3 className="text-sm font-semibold">Signed copy for {latestOwnershipLetter.number ?? "latest ownership letter"}</h3>
            <p className="mb-3 mt-1 text-xs leading-5 text-slate-600">
              This links the signed scan to the approved letter and makes it the authoritative copy everywhere.
            </p>
            <SignedLetterUpload
              documentId={latestOwnershipLetter.id}
              plotId={plot.id}
              documentType={latestOwnershipLetter.type}
              documentNo={latestOwnershipLetter.number}
              documentDate={latestOwnershipLetter.createdAt.toISOString()}
              replacing={latestOwnershipLetter.status === "SIGNED"}
              compact={false}
            />
          </div>
        ) : null}
        <HistoricalOwnershipDocumentUpload
          projectId={plot.projectId}
          plotId={plot.id}
          hasCurrentOwner={Boolean(plot.currentOwnerId)}
          transferCount={transferCount}
        />
        {plot.currentOwnerId ? (
          <OwnershipDocumentUpload ownerType="Owner" ownerId={plot.currentOwnerId} defaultVisibility="TEAM" defaultDocumentType="PAN_CARD" title="Upload owner PAN / Aadhaar / KYC" />
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-600">
            Add an owner before uploading owner-specific KYC documents.
          </div>
        )}
      </div>
    </ActionPageShell>
  );
}
