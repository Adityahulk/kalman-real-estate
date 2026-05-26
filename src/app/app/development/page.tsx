import { AlertTriangle, Hammer, Route } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { ProgressForm, ProgressPhotoPanel } from "./development-actions";

export const dynamic = "force-dynamic";

export default async function DevelopmentPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const [assets, updates, issues] = await Promise.all([
    prisma.siteAsset.findMany({ where: { tenantId: session.tenantId }, orderBy: { updatedAt: "desc" } }),
    prisma.progressUpdate.findMany({ where: { tenantId: session.tenantId }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.issue.findMany({ where: { tenantId: session.tenantId }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Site and plot development</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          CAD-linked roads, boundaries, utilities, parks, gates, plot zones, progress updates, photos, and issues.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <ProgressForm assets={assets.map((asset) => ({ id: asset.id, name: asset.name }))} />
          <ProgressPhotoPanel progressUpdates={updates.map((update) => ({ id: update.id, summary: update.summary }))} />
        </div>
        <div className="space-y-6">
          <section className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
              <Route size={18} />
              <h2 className="font-semibold">Site assets</h2>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              {assets.map((asset) => (
                <div key={asset.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{asset.name}</div>
                    <span className="chip bg-slate-100 text-slate-700">{asset.type}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-gold-shine" style={{ width: `${asset.progressPct}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{asset.progressPct}% · {asset.status}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2"><Hammer size={18} /><h2 className="font-semibold">Recent progress</h2></div>
              <div className="space-y-3">
                {updates.map((update) => (
                  <div key={update.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="font-medium">{update.parentType} · {update.progressPct}%</div>
                    <div className="mt-1 text-slate-500">{update.summary}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2"><AlertTriangle size={18} /><h2 className="font-semibold">Issues</h2></div>
              <div className="space-y-3">
                {issues.map((issue) => (
                  <div key={issue.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="font-medium">{issue.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{issue.severity} · {issue.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
