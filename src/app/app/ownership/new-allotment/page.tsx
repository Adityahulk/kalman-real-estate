import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { requirePagePermission } from "@/server/page-auth";
import { prisma } from "@/server/db";
import { ActionHint, ActionPageShell } from "../../projects/action-page-shell";

export const dynamic = "force-dynamic";

export default async function GlobalNewAllotmentPage() {
  const session = await requirePagePermission("documents.generate");
  const projects = await prisma.project.findMany({
    where: { tenantId: session.tenantId, ...(Array.isArray(session.projectIds) ? { id: { in: session.projectIds } } : {}) },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { plots: true } } },
  });

  return (
    <ActionPageShell
      eyebrow="Ownership"
      title="New allotment"
      description="Choose the project first, then select a company-owned plot and record owner details."
      backHref="/app"
      backLabel="Back to dashboard"
      aside={<ActionHint title="Why project first?">Allotment belongs to one project and one plot, so this keeps ownership history and documents clean.</ActionHint>}
    >
      <div className="grid gap-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-gold-400 hover:bg-slate-50"
            href={`/app/projects/${project.id}/ownership/new-allotment`}
          >
            <div className="flex items-center gap-3">
              <Building2 className="text-navy-800" size={20} />
              <div>
                <div className="font-semibold">{project.name}</div>
                <div className="text-sm text-slate-500">{project.city} · {project._count.plots} plots</div>
              </div>
            </div>
            <ArrowRight size={18} />
          </Link>
        ))}
        {!projects.length ? <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-600">Create a project before recording allotments.</div> : null}
      </div>
    </ActionPageShell>
  );
}
