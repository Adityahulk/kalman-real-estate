import { AlertTriangle, Camera, Clock3, Hammer, Route } from "lucide-react";
import type React from "react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { ProgressForm, ProgressPhotoPanel } from "../../../development/development-actions";
import { ManualSiteAssetForm } from "../../manual-entry-actions";

export const dynamic = "force-dynamic";

export default async function ProjectDevelopmentPage({ params }: { params: { projectId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;

  const [project, assets, updates, issues] = await Promise.all([
    prisma.project.findFirstOrThrow({ where: { id: params.projectId, tenantId: session.tenantId } }),
    prisma.siteAsset.findMany({ where: { tenantId: session.tenantId, projectId: params.projectId, archivedAt: null }, orderBy: { updatedAt: "desc" } }),
    prisma.progressUpdate.findMany({
      where: {
        tenantId: session.tenantId,
        OR: [
          { parentType: "SiteAsset", parentId: { in: await siteAssetIds(session.tenantId, params.projectId) } },
          { parentType: "ChecklistItem", parentId: { in: await checklistIds(session.tenantId, params.projectId) } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.issue.findMany({
      where: {
        tenantId: session.tenantId,
        OR: [
          { parentType: "SiteAsset", parentId: { in: await siteAssetIds(session.tenantId, params.projectId) } },
          { parentType: "Plot", parentId: { in: await plotIds(session.tenantId, params.projectId) } },
          { parentType: "ChecklistItem", parentId: { in: await checklistIds(session.tenantId, params.projectId) } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const delayed = assets.filter((asset) => asset.deadline && asset.deadline < new Date() && !["COMPLETED", "DONE"].includes(asset.status));

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6 border-b border-slate-200 pb-6">
        <div className="text-sm text-slate-500">{project.name}</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Development dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          CAD-linked site assets, contractor progress, owner-visible updates, issues, and photos for this project.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric icon={Route} label="Site assets" value={assets.length} />
        <Metric icon={Hammer} label="In progress" value={assets.filter((asset) => asset.status === "IN_PROGRESS").length} />
        <Metric icon={Clock3} label="Delayed" value={delayed.length} />
        <Metric icon={Camera} label="Updates" value={updates.length} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <ManualSiteAssetForm projectId={project.id} />
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
              {!assets.length ? <Empty label="Publish site CAD assets or create assets to begin tracking." /> : null}
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
                {!updates.length ? <Empty label="No progress updates yet." /> : null}
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
                {!issues.length ? <Empty label="No issues." /> : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="card p-5">
      <Icon className="text-navy-800" size={20} />
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">{label}</div>;
}

async function plotIds(tenantId: string, projectId: string) {
  const plots = await prisma.plot.findMany({ where: { tenantId, projectId, archivedAt: null }, select: { id: true } });
  return plots.map((plot) => plot.id);
}

async function siteAssetIds(tenantId: string, projectId: string) {
  const assets = await prisma.siteAsset.findMany({ where: { tenantId, projectId, archivedAt: null }, select: { id: true } });
  return assets.map((asset) => asset.id);
}

async function checklistIds(tenantId: string, projectId: string) {
  const items = await prisma.checklistItem.findMany({ where: { tenantId, plot: { projectId, archivedAt: null } }, select: { id: true } });
  return items.map((item) => item.id);
}
