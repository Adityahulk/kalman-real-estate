import { notFound } from "next/navigation";
import { FileText, Hammer, Landmark, MapPinned } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function OwnerPlotPage({ params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  if (session.role !== "PLOT_OWNER") notFound();

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  const owner = await prisma.owner.findFirst({
    where: {
      tenantId: session.tenantId,
      OR: [
        user?.email ? { email: user.email } : undefined,
        user?.phone ? { phone: user.phone } : undefined,
      ].filter(Boolean) as Array<{ email: string } | { phone: string }>,
    },
  });
  if (!owner) notFound();

  const plot = await prisma.plot.findFirst({
    where: { id: params.id, tenantId: session.tenantId, currentOwnerId: owner.id, ownerVisible: true },
    include: {
      currentOwner: true,
      checklistItems: { orderBy: { category: "asc" } },
      registryRecords: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!plot) notFound();

  const [documents, uploadedDocuments] = await Promise.all([
    prisma.generatedDocument.findMany({
      where: { tenantId: session.tenantId, recordType: "Plot", recordId: plot.id, status: { in: ["APPROVED", "ISSUED"] } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fileAsset.findMany({
      where: {
        tenantId: session.tenantId,
        ownerType: "Plot",
        ownerId: plot.id,
        visibility: { in: ["OWNER_VISIBLE", "SHARED"] },
        OR: [
          { documentType: null },
          { documentType: { notIn: ["PAN_CARD", "AADHAAR_CARD", "KYC"] } },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

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
              <pattern id="owner-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="1" />
              </pattern>
              <rect width="800" height="500" fill="url(#owner-grid)" />
              <rect x="190" y="90" width="420" height="270" rx="6" fill="#f4c54222" stroke="#f4c542" strokeWidth="3" filter="url(#owner-glow)" />
              <defs>
                <filter id="owner-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#f4c542" floodOpacity="0.65" />
                </filter>
              </defs>
              <text x="225" y="145" fill="#f8fafc" fontSize="28">{plot.code}</text>
              <text x="225" y="185" fill="#cbd5e1" fontSize="16">{plot.areaSqft?.toString() ?? "-"} sq ft</text>
              <text x="225" y="225" fill="#f4c542" fontSize="15">Owner-visible live CAD boundary</text>
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
              {uploadedDocuments.map((file) => (
                <div key={file.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                  <span>{file.documentType?.replaceAll("_", " ") ?? file.fileName}</span>
                  <a className="text-navy-800 underline" href={`/api/v1/files/${file.id}/download`}>Download</a>
                </div>
              ))}
              {!documents.length && !uploadedDocuments.length ? <div className="text-sm text-slate-500">No owner-visible documents yet.</div> : null}
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
