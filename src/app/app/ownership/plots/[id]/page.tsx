import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, GitBranch, History, Landmark } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { fullInr } from "@/lib/format";

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

  const [documents, audit, spatialLinks] = await Promise.all([
    prisma.generatedDocument.findMany({ where: { tenantId: session.tenantId, recordType: "Plot", recordId: plot.id }, orderBy: { createdAt: "desc" } }),
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
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2"><History size={18} /><h2 className="font-semibold">Ownership timeline</h2></div>
            <div className="space-y-3">
              {plot.ownershipRecords.map((record) => (
                <div key={record.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="font-medium">{record.kind.replaceAll("_", " ")} · {record.owner?.name ?? "Company"}</div>
                  <div className="mt-1 text-slate-500">{record.amountInr ? fullInr(Number(record.amountInr)) : "No amount"} · {record.effectiveAt.toLocaleDateString("en-IN")}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2"><Landmark size={18} /><h2 className="font-semibold">Registry records</h2></div>
            <div className="space-y-3">
              {plot.registryRecords.map((record) => (
                <div key={record.id} className="rounded-lg bg-slate-50 p-3 text-sm">{record.status} · {record.registryNo ?? "No registry no"}</div>
              ))}
              {!plot.registryRecords.length ? <div className="text-sm text-slate-500">No registry records yet.</div> : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2"><FileText size={18} /><h2 className="font-semibold">Documents</h2></div>
            <div className="space-y-2">
              {documents.map((document) => (
                <div key={document.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="font-medium">{document.number ?? document.type}</div>
                  <div className="mt-1 text-xs text-slate-500">{document.status}</div>
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
