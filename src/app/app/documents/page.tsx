import Link from "next/link";
import { FileCheck2, FileText, Search } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { DeleteDocumentButton, DocumentApprovalButtons } from "./document-actions";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const documents = await prisma.generatedDocument.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const plotIds = documents.filter((document) => document.recordType === "Plot").map((document) => document.recordId);
  const plots = plotIds.length
    ? await prisma.plot.findMany({
        where: { tenantId: session.tenantId, id: { in: plotIds }, archivedAt: null },
        select: { id: true, code: true, projectId: true, project: { select: { name: true } } },
      })
    : [];
  const plotById = new Map(plots.map((plot) => [plot.id, plot]));

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Archive of generated letters and approvals. Create, upload, and edit plot documents from the plot workspace so each file stays attached to the correct plot history.
        </p>
      </div>
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Search size={16} />
          Use the plot workspace for new letters, KYC files, registry receipts, and uploads. This page is for review, approval, download, and audit follow-up.
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <FileText size={18} />
          <h2 className="font-semibold">Generated document archive</h2>
          <span className="chip bg-slate-100 text-slate-700">{documents.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Document</th>
                <th className="px-5 py-3">Plot / record</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((document) => {
                const plot = plotById.get(document.recordId);
                return (
                  <tr key={document.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-navy-900">{document.number ?? document.type.replaceAll("_", " ")}</div>
                      <div className="mt-1 text-xs text-slate-500">{document.type.replaceAll("_", " ")}</div>
                    </td>
                    <td className="px-5 py-3">
                      {plot ? (
                        <Link className="font-medium text-navy-900 hover:underline" href={`/app/projects/${plot.projectId}/plots/${plot.id}`}>
                          {plot.project.name} · Plot {plot.code}
                        </Link>
                      ) : (
                        <span className="text-slate-500">{document.recordType} · {document.recordId}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="chip bg-slate-100 text-slate-700">{document.status.replaceAll("_", " ")}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{document.createdAt.toLocaleDateString("en-IN")}</td>
                    <td className="px-5 py-3">
                      <div className="flex min-w-[320px] flex-wrap gap-2">
                        {plot ? (
                          <Link className="btn-outline h-8 px-3 text-xs" href={`/app/projects/${plot.projectId}/plots/${plot.id}/letters/${document.id}`}>Open Studio</Link>
                        ) : null}
                        {document.fileAssetId ? (
                          <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/files/${document.fileAssetId}/download`}>Download</a>
                        ) : null}
                        <DeleteDocumentButton documentId={document.id} documentName={document.number ?? document.type} />
                        <DocumentApprovalButtons documentId={document.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!documents.length ? (
          <div className="p-8 text-center text-sm text-slate-500">
            <FileCheck2 className="mx-auto mb-3" />
            No generated documents yet.
          </div>
        ) : null}
      </section>
    </main>
  );
}
