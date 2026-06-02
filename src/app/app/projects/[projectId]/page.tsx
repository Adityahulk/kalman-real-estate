import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeIndianRupee,
  Building2,
  CheckCircle2,
  Clock3,
  FileDown,
  FileWarning,
  GitBranch,
  Landmark,
  Map,
  Megaphone,
  Route,
  Upload,
  Users,
} from "lucide-react";
import type React from "react";
import { getSessionUser } from "@/server/session";
import { getProjectWorkspace } from "@/server/services/projects";
import { fullInr } from "@/lib/format";
import { FileUploader } from "@/components/file-uploader";
import { AddPlotPanel, QuickAllotmentLink, WhatsAppShareLink } from "../simplified-workflow-actions";

export const dynamic = "force-dynamic";

export default async function ProjectWorkspacePage({ params }: { params: { projectId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  const workspace = await getProjectWorkspace({ tenantId: session.tenantId, userId: session.id, role: session.role }, params.projectId);
  const { project, latestCad } = workspace;
  const plotCounts = Object.fromEntries(workspace.plotStatus.map((item) => [item.status, item._count]));
  const assetCounts = Object.fromEntries(workspace.assetStatus.map((item) => [item.status, item._count]));
  const cadCounts = Object.fromEntries(workspace.cadStatus.map((item) => [item.status, item._count]));
  const totalPlots = Object.values(plotCounts).reduce((sum, count) => sum + Number(count), 0);
  const shareText = `${project.name}, ${project.city}. Total plots: ${totalPlots}. Company-held plots: ${plotCounts.COMPANY_OWNED ?? 0}.`;

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 xl:flex-row xl:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Building2 size={16} />
            {project.city}
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Project workspace for CAD map, plot ownership, registry, documents, development progress, and audit history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-primary" href={`/app/projects/${project.id}/cad`}>
            <Map size={17} />
            Open CAD map
          </Link>
          <AddPlotPanel compact projectId={project.id} />
          <QuickAllotmentLink projectId={project.id} />
          <Link className="btn-outline" href={`/app/projects/${project.id}/ownership`}>
            <Users size={17} />
            Ownership ledger
          </Link>
          <a className="btn-outline" href={`/api/v1/projects/${project.id}/report`}>
            <FileDown size={17} />
            Download Report
          </a>
          <WhatsAppShareLink text={shareText} />
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Landmark} label="Company owned" value={String(plotCounts.COMPANY_OWNED ?? 0)} />
        <Metric icon={Users} label="Allotted" value={String(plotCounts.ALLOTTED ?? 0)} />
        <Metric icon={GitBranch} label="Transferred" value={String(plotCounts.TRANSFERRED ?? 0)} />
        <Metric icon={CheckCircle2} label="Registered" value={String(plotCounts.REGISTERED ?? 0)} />
        <Metric icon={FileWarning} label="Doc gaps" value={String(workspace.missingDocuments)} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
              <Building2 size={18} />
              <h2 className="font-semibold">Site details</h2>
            </div>
            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
              <div className="grid gap-4 md:grid-cols-2">
                <Info label="Project name" value={project.name} />
                <Info label="City / location" value={project.city} />
                <Info label="Address" value={project.address ?? "No address saved"} wide />
                <Info label="CAD file" value={latestCad?.originalName ?? "No CAD uploaded"} />
                <Info label="CAD status" value={latestCad?.status.replaceAll("_", " ") ?? "Not uploaded"} />
              </div>
              <div className="space-y-3">
                <Link className="btn-primary w-full justify-center" href={`/app/projects/${project.id}/cad`}>
                  <Upload size={17} />
                  Upload / Change CAD
                </Link>
                <FileUploader
                  label="Upload brochure or marketing image"
                  ownerType="Project"
                  ownerId={project.id}
                  visibility="SHARED"
                  accept="application/pdf,image/*"
                />
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  WhatsApp text: {shareText}
                </div>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Map size={18} />
                <h2 className="font-semibold">CAD status</h2>
              </div>
              <Link className="text-sm font-medium text-navy-800 hover:underline" href={`/app/projects/${project.id}/cad`}>Manage CAD</Link>
            </div>
            <div className="grid gap-4 p-5 lg:grid-cols-[1fr_220px]">
              <div>
                <div className="text-lg font-semibold">{latestCad?.originalName ?? "No site CAD uploaded"}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {latestCad
                    ? `Latest version ${latestCad.version} is ${latestCad.status.replaceAll("_", " ").toLowerCase()}.`
                    : "Upload a DXF site plan to extract plots, roads, boundaries, utilities, and amenities."}
                </p>
                {latestCad ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="chip bg-slate-100 text-slate-700">{latestCad.status.replaceAll("_", " ")}</span>
                    <span className="chip bg-slate-100 text-slate-700">{latestCad.scenes[0]?.id ? "Scene ready" : "Processing"}</span>
                    {latestCad.reviewIssues.length ? <span className="chip bg-amber-50 text-amber-800">{latestCad.reviewIssues.length} warnings</span> : null}
                  </div>
                ) : null}
              </div>
              <div className="grid gap-2 text-sm">
                <StatusLine label="Uploaded" value={cadCounts.UPLOADED ?? 0} />
                <StatusLine label="Review required" value={cadCounts.REVIEW_REQUIRED ?? 0} />
                <StatusLine label="Published" value={cadCounts.PUBLISHED ?? 0} />
                <StatusLine label="Failed" value={cadCounts.FAILED ?? 0} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Link href={`/app/projects/${project.id}/cad`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
              <Map className="text-navy-800" size={22} />
              <h2 className="mt-3 font-semibold">CAD based setup</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Upload DXF, review extracted plots/assets, publish them, then manage each clicked plot.</p>
            </Link>
            <Link href={`/app/projects/${project.id}/ownership`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
              <Landmark className="text-navy-800" size={22} />
              <h2 className="mt-3 font-semibold">Plot registry</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Search plots, add manual plots, allot owners, generate letters, and manage documents.</p>
            </Link>
            <Link href={`/app/marketing`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
              <Megaphone className="text-navy-800" size={22} />
              <h2 className="mt-3 font-semibold">Marketing and media</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Assign shoots, upload videos, review edits, and keep brochure assets near the project.</p>
            </Link>
            <Link href={`/app/finance`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
              <BadgeIndianRupee className="text-navy-800" size={22} />
              <h2 className="mt-3 font-semibold">Cost and BOQ</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Budgets, vendors, invoices, payments, and CAD-linked quantity variance stay available.</p>
            </Link>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
              <Route size={18} />
              <h2 className="font-semibold">Development snapshot</h2>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-3">
              <Metric icon={Route} label="Planned assets" value={String(assetCounts.PLANNED ?? 0)} compact />
              <Metric icon={Clock3} label="In progress" value={String(assetCounts.IN_PROGRESS ?? 0)} compact />
              <Metric icon={AlertTriangle} label="Delayed" value={String(workspace.delayedAssets.length)} compact />
            </div>
            <div className="border-t border-slate-100 p-5">
              <div className="mb-3 text-sm font-semibold">Recent owner-visible updates</div>
              <div className="space-y-2">
                {workspace.ownerVisibleUpdates.map((update) => (
                  <div key={update.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="font-medium">{update.parentType} · {update.progressPct}%</div>
                    <div className="mt-1 text-slate-500">{update.summary}</div>
                  </div>
                ))}
                {!workspace.ownerVisibleUpdates.length ? <Empty label="No owner-visible progress updates yet." /> : null}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <Panel title="Registry and Documents">
            <StatusLine label="Pending registry" value={workspace.pendingRegistry} />
            <StatusLine label="Missing plot documents" value={workspace.missingDocuments} />
            <StatusLine label="Budget" value={project.budgetInr ? fullInr(Number(project.budgetInr)) : "Not set"} />
          </Panel>

          <Panel title="Recent transfers">
            {workspace.recentTransfers.map((record) => (
              <Link key={record.id} href={`/app/projects/${project.id}/plots/${record.plotId}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                <span>{record.plot.code} · {record.owner?.name ?? "Unknown"}</span>
                <ArrowRight size={15} />
              </Link>
            ))}
            {!workspace.recentTransfers.length ? <Empty label="No transfers recorded yet." /> : null}
          </Panel>

          <Panel title="Open issues">
            {workspace.openIssues.map((issue) => (
              <div key={issue.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="font-medium">{issue.title}</div>
                <div className="mt-1 text-xs text-slate-500">{issue.severity} · {issue.parentType}</div>
              </div>
            ))}
            {!workspace.openIssues.length ? <Empty label="No open issues." /> : null}
          </Panel>
        </aside>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value, compact = false }: { icon: React.ElementType; label: string; value: string; compact?: boolean }) {
  return (
    <div className={compact ? "rounded-lg border border-slate-200 bg-white p-4" : "card p-5"}>
      <Icon className="text-navy-800" size={compact ? 18 : 21} />
      <div className={`mt-3 font-semibold ${compact ? "text-xl" : "text-2xl"}`}>{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-navy-950">{value}</div>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-500">{label}</div>;
}
