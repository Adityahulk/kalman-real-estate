import { notFound } from "next/navigation";
import { FileText, Hammer, Landmark, MapPinned } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function OwnerPlotPage({ params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return null;

  const plot = await prisma.plot.findFirst({
    where: { id: params.id, tenantId: session.tenantId, ownerVisible: true },
    include: {
      currentOwner: true,
      checklistItems: { orderBy: { category: "asc" } },
      registryRecords: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!plot) notFound();

  const documents = await prisma.generatedDocument.findMany({
    where: { tenantId: session.tenantId, recordType: "Plot", recordId: plot.id, status: { in: ["APPROVED", "ISSUED", "GENERATED"] } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <div className="text-sm text-slate-500">Owner: {plot.currentOwner?.name ?? "Company"}</div>
        <h1 className="text-3xl font-semibold tracking-tight">Plot {plot.code}</h1>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4"><MapPinned size={18} /><h2 className="font-semibold">Plot visualization</h2></div>
          <div className="h-[420px] bg-slate-950 p-6">
            <svg viewBox="0 0 800 500" className="h-full w-full">
              <rect width="800" height="500" fill="#020617" />
              <rect x="190" y="90" width="420" height="270" rx="6" fill="#f4c54222" stroke="#f4c542" strokeWidth="3" />
              <text x="225" y="145" fill="#f8fafc" fontSize="28">{plot.code}</text>
              <text x="225" y="185" fill="#cbd5e1" fontSize="16">{plot.areaSqft?.toString() ?? "-"} sq ft</text>
            </svg>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2"><Landmark size={18} /><h2 className="font-semibold">Registry</h2></div>
            <div className="space-y-2 text-sm">
              {plot.registryRecords.map((record) => (
                <div key={record.id} className="rounded-lg bg-slate-50 p-3">{record.status} · {record.registryNo ?? "No registry no"}</div>
              ))}
              {!plot.registryRecords.length ? <div className="text-slate-500">Registry not started.</div> : null}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2"><FileText size={18} /><h2 className="font-semibold">Documents</h2></div>
            <div className="space-y-2">
              {documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                  <span>{document.number ?? document.type}</span>
                  {document.fileAssetId ? <a className="text-navy-800 underline" href={`/api/v1/files/${document.fileAssetId}/download`}>Download</a> : null}
                </div>
              ))}
              {!documents.length ? <div className="text-sm text-slate-500">No owner-visible documents yet.</div> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="card mt-6 p-5">
        <div className="mb-4 flex items-center gap-2"><Hammer size={18} /><h2 className="font-semibold">Construction progress</h2></div>
        <div className="grid gap-3 md:grid-cols-2">
          {plot.checklistItems.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex justify-between gap-3 text-sm"><span className="font-medium">{item.label}</span><span>{item.progressPct}%</span></div>
              <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-gold-shine" style={{ width: `${item.progressPct}%` }} /></div>
            </div>
          ))}
          {!plot.checklistItems.length ? <div className="text-sm text-slate-500">Progress checklist not published yet.</div> : null}
        </div>
      </section>
    </main>
  );
}
