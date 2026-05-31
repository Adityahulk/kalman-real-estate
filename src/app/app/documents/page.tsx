import { FileCheck2, FileText } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { DocumentApprovalButtons, GenerateDocumentForm } from "./document-actions";
import { DeleteFileButton } from "@/components/delete-file-button";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const [documents, plots] = await Promise.all([
    prisma.generatedDocument.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.plot.findMany({
      where: { tenantId: session.tenantId },
      include: { currentOwner: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Allotment letters, transfer letters, registry documents, contractor work orders, approval states, and download permissions.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <GenerateDocumentForm plots={plots.map((plot) => ({ id: plot.id, code: plot.code, ownerName: plot.currentOwner?.name ?? "Company" }))} />

        <section className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <FileText size={18} />
            <h2 className="font-semibold">Generated documents</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <div className="font-medium">{document.number ?? document.type}</div>
                  <div className="mt-1 text-sm text-slate-500">{document.recordType} · {document.recordId}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="chip bg-slate-100 text-slate-700">{document.status.replaceAll("_", " ")}</span>
                  {document.fileAssetId ? (
                    <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/files/${document.fileAssetId}/download`}>Download</a>
                  ) : null}
                  {document.fileAssetId ? (
                    <DeleteFileButton fileId={document.fileAssetId} fileName={document.number ?? document.type} />
                  ) : null}
                  <DocumentApprovalButtons documentId={document.id} />
                </div>
              </div>
            ))}
            {!documents.length ? (
              <div className="p-8 text-center text-sm text-slate-500">
                <FileCheck2 className="mx-auto mb-3" />
                No generated documents yet.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
