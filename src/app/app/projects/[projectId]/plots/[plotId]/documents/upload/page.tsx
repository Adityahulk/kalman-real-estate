import { notFound } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { ActionHint, ActionPageShell } from "../../../../../action-page-shell";
import { OwnershipDocumentUpload } from "../../../../../../ownership/ownership-actions";

export const dynamic = "force-dynamic";

export default async function UploadPlotDocumentPage({ params }: { params: { projectId: string; plotId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  const [plot, generatedOwnershipLetterCount] = await Promise.all([
    prisma.plot.findFirst({
      where: { id: params.plotId, tenantId: session.tenantId, projectId: params.projectId, archivedAt: null },
      include: { project: true, currentOwner: true },
    }),
    prisma.generatedDocument.count({
      where: {
        tenantId: session.tenantId,
        recordType: "Plot",
        recordId: params.plotId,
        OR: [
          { type: { contains: "allotment", mode: "insensitive" } },
          { type: { contains: "transfer", mode: "insensitive" } },
        ],
      },
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
        <OwnershipDocumentUpload ownerType="Plot" ownerId={plot.id} defaultVisibility="OWNER_VISIBLE" defaultDocumentType="ALLOTMENT_LETTER" title="Upload plot document" />
        {generatedOwnershipLetterCount > 0 ? (
          <OwnershipDocumentUpload
            ownerType="Plot"
            ownerId={plot.id}
            defaultVisibility="OWNER_VISIBLE"
            defaultDocumentType="ALLOTMENT_LETTER"
            fixedCategoryKey="signed-allotment-letter"
            defaultNotes="Signed copy of a generated ownership letter"
            hideDocumentType
            title="Upload signed copy of generated letter"
          />
        ) : null}
        <OwnershipDocumentUpload
          ownerType="Plot"
          ownerId={plot.id}
          defaultVisibility="OWNER_VISIBLE"
          defaultDocumentType="ALLOTMENT_LETTER"
          fixedCategoryKey="old-documents"
          defaultNotes="Old signed allotment / transfer letter"
          title="Upload old signed allotment / transfer letter"
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
