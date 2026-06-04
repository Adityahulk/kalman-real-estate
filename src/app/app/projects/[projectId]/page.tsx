import Link from "next/link";
import { Building2, CheckCircle2, ChevronDown, FileDown, Landmark, Map, Share2, Upload, Users } from "lucide-react";
import type React from "react";
import { getSessionUser } from "@/server/session";
import { getProjectWorkspace } from "@/server/services/projects";
import { FileUploader } from "@/components/file-uploader";
import { WhatsAppShareLink } from "../simplified-workflow-actions";
import { ProjectSiteInfoForm } from "../workflow-action-forms";

export const dynamic = "force-dynamic";

export default async function ProjectWorkspacePage({ params }: { params: { projectId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  const workspace = await getProjectWorkspace({ tenantId: session.tenantId, userId: session.id, role: session.role }, params.projectId);
  const { project } = workspace;
  const plotCounts = Object.fromEntries(workspace.plotStatus.map((item) => [item.status, item._count]));
  const assetCounts = Object.fromEntries(workspace.assetStatus.map((item) => [item.status, item._count]));
  const totalPlots = Object.values(plotCounts).reduce((sum, count) => sum + Number(count), 0);
  const companyPlots = Number(plotCounts.COMPANY_OWNED ?? 0);
  const completedAssets = Number(assetCounts.COMPLETED ?? 0) + Number(assetCounts.DONE ?? 0);
  const defaultShareText = [
    `${project.name} in ${project.city}`,
    project.address ? `Location: ${project.address}` : "",
    project.reraNumber ? `RERA: ${project.reraNumber}` : "",
    `Total plots: ${totalPlots}`,
    `Available plots with company: ${companyPlots}`,
    `Project progress: ${project.progressPct}%`,
    project.siteContactPhone ? `Site contact: ${project.siteContactPhone}` : "",
    "Please contact the builder office for current availability, allotment details, site visit, and documents.",
  ].filter(Boolean).join("\n");
  const shareText = project.whatsappShareText ?? defaultShareText;

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
            Site information, project actions, plot inventory, and shareable project details.
          </p>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Map} label="Total plots" value={String(totalPlots)} href={`/app/projects/${project.id}/ownership`} />
        <Metric icon={Landmark} label="With company" value={String(companyPlots)} href={`/app/projects/${project.id}/ownership?status=COMPANY_OWNED`} />
        <Metric icon={Users} label="Allotted" value={String(plotCounts.ALLOTTED ?? 0)} href={`/app/projects/${project.id}/ownership?status=ALLOTTED`} />
        <Metric icon={CheckCircle2} label="Registered" value={String(plotCounts.REGISTERED ?? 0)} href={`/app/projects/${project.id}/ownership?status=REGISTERED`} />
        <Metric icon={Share2} label="Site progress" value={`${project.progressPct}%`} href={`/app/projects/${project.id}/development`} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Building2 size={18} />
            <h2 className="font-semibold">Site information</h2>
          </div>
          <div className="p-5">
            <ProjectSiteInfoForm
              project={{
                id: project.id,
                name: project.name,
                city: project.city,
                address: project.address,
                reraNumber: project.reraNumber,
                landAreaSqft: project.landAreaSqft?.toString() ?? null,
                siteContactPhone: project.siteContactPhone,
                progressPct: project.progressPct,
                whatsappShareText: project.whatsappShareText,
              }}
              defaultShareText={defaultShareText}
            />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold">Project actions</h2>
            <div className="mt-4 grid gap-2">
              <Link className="btn-primary justify-center" href={`/app/projects/${project.id}/ownership`}>
                <Landmark size={17} />
                Open plot registry
              </Link>
              <Link className="btn-outline justify-center" href={`/app/projects/${project.id}/cad`}>
                <Map size={17} />
                Open site layout / CAD
              </Link>
              <a className="btn-outline justify-center" href={`/api/v1/projects/${project.id}/report`}>
                <FileDown size={17} />
                Download report
              </a>
              <WhatsAppShareLink label="Share project" text={shareText} />
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2">
              <Upload size={18} />
              <h2 className="font-semibold">Project media</h2>
            </div>
            <div className="mt-4">
              <FileUploader
                label="Upload brochure or marketing image"
                ownerType="Project"
                ownerId={project.id}
                visibility="SHARED"
                accept="application/pdf,image/*"
              />
            </div>
          </div>

          <details className="card group p-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Share2 size={18} />
                  <h2 className="font-semibold">Site progress</h2>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-gold-shine" style={{ width: `${project.progressPct}%` }} />
                </div>
                <div className="mt-3 text-sm text-slate-600">{project.progressPct}% complete · {completedAssets} site parts completed</div>
              </div>
              <ChevronDown className="mt-1 text-slate-400 transition group-open:rotate-180" size={18} />
            </summary>
            <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
              <div className="grid gap-2">
                {workspace.assetStatus.length ? workspace.assetStatus.map((item) => (
                  <div key={item.status} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="capitalize text-slate-600">{item.status.replaceAll("_", " ").toLowerCase()}</span>
                    <span className="font-semibold text-navy-900">{item._count}</span>
                  </div>
                )) : (
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">No site parts have been added yet.</div>
                )}
              </div>
              {workspace.delayedAssets.length ? (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delayed work</div>
                  <div className="mt-2 space-y-2">
                    {workspace.delayedAssets.slice(0, 3).map((asset) => (
                      <div key={asset.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        {asset.name}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {workspace.ownerVisibleUpdates.length ? (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest public updates</div>
                  <div className="mt-2 space-y-2">
                    {workspace.ownerVisibleUpdates.slice(0, 3).map((update) => (
                      <div key={update.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        <div className="font-medium text-navy-900">{update.progressPct}% progress</div>
                        <div className="mt-1 line-clamp-2 text-xs">{update.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </details>
        </aside>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value: string; href?: string }) {
  const content = (
    <>
      <Icon className="text-navy-800" size={20} />
      <div className="mt-3 truncate text-xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </>
  );
  if (href) {
    return (
      <Link className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-lg" href={href}>
        {content}
      </Link>
    );
  }
  return (
    <div className="card p-5">
      {content}
    </div>
  );
}
