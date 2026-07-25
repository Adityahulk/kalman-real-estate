import { notFound } from "next/navigation";
import { requirePagePermission } from "@/server/page-auth";
import { prisma } from "@/server/db";
import { PdfComposer } from "../../../../../../pdf-composer";

export const dynamic = "force-dynamic";

export default async function LetterPdfComposerPage(
  props: { params: Promise<{ projectId: string; plotId: string; documentId: string }> }
) {
  const params = await props.params;
  const session = await requirePagePermission("documents.view");
  const [plot, document] = await Promise.all([
    prisma.plot.findFirst({
      where: { id: params.plotId, tenantId: session.tenantId, projectId: params.projectId, archivedAt: null },
      include: { project: true },
    }),
    prisma.generatedDocument.findFirst({
      where: { id: params.documentId, tenantId: session.tenantId, recordType: "Plot", recordId: params.plotId, archivedAt: null },
      include: { revisions: { orderBy: { revisionNo: "desc" } } },
    }),
  ]);
  if (!plot || !document) notFound();

  return (
    <PdfComposer
      document={{
        id: document.id,
        number: document.number,
        type: document.type,
        status: document.status,
        fileAssetId: document.fileAssetId,
      }}
      revisions={document.revisions.map((revision) => ({
        id: revision.id,
        revisionNo: revision.revisionNo,
        status: revision.status,
        baseFileId: revision.baseFileId,
        outputFileId: revision.outputFileId,
        operations: Array.isArray(revision.operations) ? revision.operations as never : [],
        pageCount: revision.pageCount,
      }))}
      backHref={`/app/projects/${plot.projectId}/plots/${plot.id}/letters/${document.id}`}
    />
  );
}
