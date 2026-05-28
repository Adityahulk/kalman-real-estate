import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeIndianRupee, FileText, GitBranch, History, Landmark, UserRound } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { fullInr } from "@/lib/format";
import { OwnershipDocumentUpload } from "../../ownership-actions";

export const dynamic = "force-dynamic";

export default async function AdminPlotDetailPage({ params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return null;

  const plot = await prisma.plot.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    include: {
      currentOwner: true,
      ownershipRecords: { include: { owner: true }, orderBy: { effectiveAt: "desc" } },
      registryRecords: { orderBy: { createdAt: "desc" } },
      checklistItems: { orderBy: { category: "asc" } },
    },
  });
  if (!plot) notFound();

  const [documents, plotFiles, ownerFiles, audit, spatialLinks] = await Promise.all([
    prisma.generatedDocument.findMany({ where: { tenantId: session.tenantId, recordType: "Plot", recordId: plot.id }, orderBy: { createdAt: "desc" } }),
    prisma.fileAsset.findMany({ where: { tenantId: session.tenantId, ownerType: "Plot", ownerId: plot.id }, orderBy: { createdAt: "desc" } }),
    plot.currentOwnerId
      ? prisma.fileAsset.findMany({ where: { tenantId: session.tenantId, ownerType: "Owner", ownerId: plot.currentOwnerId }, orderBy: { createdAt: "desc" } })
      : [],
    prisma.auditEvent.findMany({ where: { tenantId: session.tenantId, entityType: "Plot", entityId: plot.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.spatialLink.findMany({ where: { tenantId: session.tenantId, recordType: "Plot", recordId: plot.id }, include: { entity: { include: { scene: true } } } }),
  ]);

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="text-sm text-slate-500">Plot detail and audit</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{plot.code}</h1>
          <p className="mt-2 text-sm text-slate-600">{plot.currentOwner?.name ?? "Company owned"} · {plot.status.replaceAll("_", " ")} · {fullInr(Number(plot.priceInr ?? 0))}</p>
        </div>
        {spatialLinks[0]?.entity.scene.cadFileId ? (
          <Link className="btn-primary" href={`/app/cad/${spatialLinks[0].entity.scene.cadFileId}`}>
            <GitBranch size={17} />
            Open CAD source
          </Link>
        ) : null}
      </div>

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2 text-slate-600"><UserRound size={18} /><h2 className="font-semibold text-slate-900">Current owner</h2></div>
              <div className="text-lg font-semibold">{plot.currentOwner?.name ?? "Company inventory"}</div>
              <div className="mt-2 text-sm text-slate-500">{plot.currentOwner?.email ?? plot.currentOwner?.phone ?? "No owner contact linked"}</div>
            </div>
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2 text-slate-600"><Landmark size={18} /><h2 className="font-semibold text-slate-900">Registry</h2></div>
              <div className="text-lg font-semibold">{plot.registryRecords[0]?.status ?? "Not started"}</div>
              <div className="mt-2 text-sm text-slate-500">{plot.registryRecords[0]?.registryNo ?? "No registry reference"}</div>
            </div>
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2 text-slate-600"><BadgeIndianRupee size={18} /><h2 className="font-semibold text-slate-900">Last value</h2></div>
              <div className="text-lg font-semibold">{fullInr(Number(plot.ownershipRecords[0]?.amountInr ?? plot.priceInr ?? 0))}</div>
              <div className="mt-2 text-sm text-slate-500">{plot.ownershipRecords[0]?.kind.replaceAll("_", " ") ?? "Company inventory"}</div>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2"><History size={18} /><h2 className="font-semibold">Ownership timeline</h2></div>
            <div className="space-y-3">
              {plot.ownershipRecords.map((record) => (
                <div key={record.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="font-medium">{record.kind.replaceAll("_", " ")} · {record.owner?.name ?? "Company"}</div>
                  <div className="mt-1 text-slate-500">{record.amountInr ? fullInr(Number(record.amountInr)) : "No amount"} · {record.sharePct?.toString() ?? "100"}% share · {record.effectiveAt.toLocaleDateString("en-IN")}</div>
                  {record.notes ? <div className="mt-2 text-xs text-slate-500">{record.notes}</div> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2"><Landmark size={18} /><h2 className="font-semibold">Registry records</h2></div>
            <div className="space-y-3">
              {plot.registryRecords.map((record) => (
                <div key={record.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="font-medium">{record.status} · {record.registryNo ?? "No registry no"}</div>
                  <div className="mt-1 text-xs text-slate-500">{record.registryDate?.toLocaleDateString("en-IN") ?? record.createdAt.toLocaleDateString("en-IN")}</div>
                  {record.notes ? <div className="mt-2 text-xs text-slate-500">{record.notes}</div> : null}
                </div>
              ))}
              {!plot.registryRecords.length ? <div className="text-sm text-slate-500">No registry records yet.</div> : null}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2"><FileText size={18} /><h2 className="font-semibold">Plot document vault</h2></div>
            <div className="grid gap-3 md:grid-cols-2">
              {plotFiles.map((file) => (
                <DocumentRow key={file.id} file={file} />
              ))}
              {!plotFiles.length ? <div className="text-sm text-slate-500">No uploaded plot documents yet.</div> : null}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2"><UserRound size={18} /><h2 className="font-semibold">Owner KYC documents</h2></div>
            <div className="grid gap-3 md:grid-cols-2">
              {ownerFiles.map((file) => (
                <DocumentRow key={file.id} file={file} />
              ))}
              {!ownerFiles.length ? <div className="text-sm text-slate-500">No PAN/Aadhaar/KYC documents uploaded for this owner.</div> : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <OwnershipDocumentUpload ownerType="Plot" ownerId={plot.id} defaultVisibility="OWNER_VISIBLE" />
          {plot.currentOwnerId ? <OwnershipDocumentUpload ownerType="Owner" ownerId={plot.currentOwnerId} defaultVisibility="TEAM" /> : null}
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2"><FileText size={18} /><h2 className="font-semibold">Documents</h2></div>
            <div className="space-y-2">
              {documents.map((document) => (
                <div key={document.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="font-medium">{document.number ?? document.type}</div>
                  <div className="mt-1 text-xs text-slate-500">{document.status}</div>
                  {document.fileAssetId ? <a className="mt-2 inline-flex text-xs font-medium text-navy-800 underline" href={`/api/v1/files/${document.fileAssetId}/download`}>Download PDF</a> : null}
                </div>
              ))}
              {!documents.length ? <div className="text-sm text-slate-500">No documents generated.</div> : null}
            </div>
          </div>
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2"><History size={18} /><h2 className="font-semibold">Audit events</h2></div>
            <div className="space-y-2">
              {audit.map((event) => (
                <div key={event.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="font-medium">{event.action}</div>
                  <div className="mt-1 text-xs text-slate-500">{event.createdAt.toLocaleString("en-IN")}</div>
                </div>
              ))}
              {!audit.length ? <div className="text-sm text-slate-500">No plot-specific audit events yet.</div> : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function DocumentRow({ file }: { file: {
  id: string;
  fileName: string;
  documentType: string | null;
  documentNo: string | null;
  documentDate: Date | null;
  visibility: string;
  notes: string | null;
  createdAt: Date;
} }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-sm">
      <div className="font-medium">{file.documentType?.replaceAll("_", " ") ?? "Document"}</div>
      <div className="mt-1 truncate text-xs text-slate-500">{file.fileName}</div>
      <div className="mt-2 text-xs text-slate-500">
        {file.documentNo ?? "No reference"} · {(file.documentDate ?? file.createdAt).toLocaleDateString("en-IN")} · {file.visibility.replaceAll("_", " ")}
      </div>
      {file.notes ? <div className="mt-2 text-xs text-slate-500">{file.notes}</div> : null}
      <a className="mt-3 inline-flex text-xs font-medium text-navy-800 underline" href={`/api/v1/files/${file.id}/download`}>Download</a>
    </div>
  );
}
