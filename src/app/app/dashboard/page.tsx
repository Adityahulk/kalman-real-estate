import Link from "next/link";
import { Download, LayoutDashboard } from "lucide-react";
import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";

export const dynamic = "force-dynamic";

function StatCard({ label, value, href, tone = "slate" }: { label: string; value: number; href?: string; tone?: string }) {
  const toneClass =
    tone === "amber" ? "text-amber-700" : tone === "rose" ? "text-rose-700" : tone === "emerald" ? "text-emerald-700" : tone === "sky" ? "text-sky-700" : "text-navy-900";
  const inner = (
    <div className="card p-5">
      <div className={`text-3xl font-semibold ${toneClass}`}>{value}</div>
      <div className="mt-1 text-sm text-slate-600">{label}</div>
    </div>
  );
  return href ? <Link href={href} className="block transition hover:opacity-80">{inner}</Link> : inner;
}

export default async function DashboardPage() {
  const session = await requirePagePermission("reports.view");
  const tenantId = session.tenantId;

  const [
    availablePlots, reservedPlots, allottedPlots, soldPlots, owners,
    pendingAllotments, pendingSignatures, signedLetters,
    tasksPlanned, tasksInProgress, tasksCompleted, tasksAwaitingVerification, tasksOverdue,
    approvalsExpiring, approvalsExpired, pendingNocs, activeRera, activeLdc,
    projects,
  ] = await Promise.all([
    prisma.plot.count({ where: { tenantId, archivedAt: null, status: "COMPANY_OWNED" } }),
    prisma.plot.count({ where: { tenantId, archivedAt: null, status: "HOLD" } }),
    prisma.plot.count({ where: { tenantId, archivedAt: null, status: "ALLOTTED" } }),
    prisma.plot.count({ where: { tenantId, archivedAt: null, status: { in: ["TRANSFERRED", "REGISTERED"] } } }),
    prisma.owner.count({ where: { tenantId } }),
    prisma.generatedDocument.count({ where: { tenantId, archivedAt: null, status: "SUBMITTED" } }),
    prisma.generatedDocument.count({ where: { tenantId, archivedAt: null, status: { in: ["APPROVED", "SENT_FOR_SIGNATURE"] } } }),
    prisma.generatedDocument.count({ where: { tenantId, archivedAt: null, status: "SIGNED" } }),
    prisma.siteAsset.count({ where: { tenantId, archivedAt: null, status: "PLANNED" } }),
    prisma.siteAsset.count({ where: { tenantId, archivedAt: null, status: "IN_PROGRESS" } }),
    prisma.siteAsset.count({ where: { tenantId, archivedAt: null, status: "COMPLETED" } }),
    prisma.siteAsset.count({ where: { tenantId, archivedAt: null, status: "SENT_FOR_VERIFICATION" } }),
    prisma.siteAsset.count({ where: { tenantId, archivedAt: null, deadline: { lt: new Date() }, status: { notIn: ["COMPLETED"] } } }),
    prisma.approvalDocument.count({ where: { tenantId, status: "ACTIVE", expiresAt: { gte: new Date(), lte: new Date(Date.now() + 30 * 864e5) } } }),
    prisma.approvalDocument.count({ where: { tenantId, status: "ACTIVE", expiresAt: { lt: new Date() } } }),
    prisma.approvalDocument.count({ where: { tenantId, type: "NOC", status: "ACTIVE", fileAssetId: null } }),
    prisma.approvalDocument.count({ where: { tenantId, type: "RERA", status: "ACTIVE" } }),
    prisma.approvalDocument.count({ where: { tenantId, type: "LDC", status: "ACTIVE" } }),
    prisma.project.findMany({
      where: { tenantId },
      select: { id: true, name: true, city: true, state: true, progressPct: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const groups = [
    { title: "Inventory & customers", cards: [
      { label: "Available plots", value: availablePlots, href: undefined, tone: "emerald" },
      { label: "Reserved plots", value: reservedPlots, href: "/app/ownership", tone: "amber" },
      { label: "Allotted plots", value: allottedPlots, tone: "sky" },
      { label: "Sold / registered plots", value: soldPlots, tone: "slate" },
      { label: "Customers", value: owners, tone: "slate" },
    ]},
    { title: "Allotment pipeline", cards: [
      { label: "Pending approval", value: pendingAllotments, tone: "amber" },
      { label: "Pending signature", value: pendingSignatures, tone: "sky" },
      { label: "Signed letters", value: signedLetters, tone: "emerald" },
    ]},
    { title: "Engineering", cards: [
      { label: "In progress", value: tasksInProgress, tone: "sky" },
      { label: "Upcoming / planned", value: tasksPlanned, href: "/app/development", tone: "slate" },
      { label: "Completed", value: tasksCompleted, href: "/app/development", tone: "emerald" },
      { label: "Awaiting verification", value: tasksAwaitingVerification, tone: "amber" },
      { label: "Overdue", value: tasksOverdue, tone: "rose" },
    ]},
    { title: "Government approvals", cards: [
      { label: "Expiring within 30 days", value: approvalsExpiring, href: "/app/liaison", tone: "amber" },
      { label: "Expired", value: approvalsExpired, href: "/app/liaison", tone: "rose" },
      { label: "Pending NOCs", value: pendingNocs, href: "/app/liaison", tone: "amber" },
      { label: "Active RERA / LDC", value: activeRera + activeLdc, href: "/app/liaison", tone: "emerald" },
    ]},
  ];

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={22} className="text-navy-800" />
          <h1 className="text-3xl font-semibold tracking-tight">Project dashboard</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          A complete, at-a-glance view of inventory, the allotment pipeline, engineering progress and statutory approvals.
        </p>
      </div>

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{group.title}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {group.cards.map((card) => (
                <StatCard key={card.label} label={card.label} value={card.value} href={card.href} tone={card.tone} />
              ))}
            </div>
          </section>
        ))}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Reports</h2>
          <div className="card overflow-hidden">
            <div className="divide-y divide-slate-100">
              {projects.map((project) => (
                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" key={project.id}>
                  <div>
                    <div className="font-medium">{project.name}</div>
                    <div className="text-xs text-slate-500">{[project.city, project.state].filter(Boolean).join(", ")} · Development {project.progressPct}%</div>
                  </div>
                  <a className="btn-outline h-9 px-3 text-xs" href={`/api/v1/projects/${project.id}/report`}>
                    <Download size={14} />
                    Download plot report
                  </a>
                </div>
              ))}
              {!projects.length ? <div className="px-5 py-8 text-center text-sm text-slate-500">No projects available.</div> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
