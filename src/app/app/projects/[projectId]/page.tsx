import Link from "next/link";
import { BadgeIndianRupee, Building2, CheckCircle2, FileDown, FileWarning, Landmark, Map, Share2, Upload, Users } from "lucide-react";
import type React from "react";
import { getSessionUser } from "@/server/session";
import { getProjectWorkspace } from "@/server/services/projects";
import { fullInr } from "@/lib/format";
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
    `Total plots: ${totalPlots}`,
    `Available plots with company: ${companyPlots}`,
    `Project progress: ${project.progressPct}%`,
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

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Metric icon={Map} label="Total plots" value={String(totalPlots)} />
        <Metric icon={Landmark} label="With company" value={String(companyPlots)} />
        <Metric icon={Users} label="Allotted" value={String(plotCounts.ALLOTTED ?? 0)} />
        <Metric icon={CheckCircle2} label="Registered" value={String(plotCounts.REGISTERED ?? 0)} />
        <Metric icon={FileWarning} label="Doc gaps" value={String(workspace.missingDocuments)} />
        <Metric icon={BadgeIndianRupee} label="Budget" value={project.budgetInr ? fullInr(Number(project.budgetInr)) : "Not set"} />
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
                progressPct: project.progressPct,
                budgetInr: project.budgetInr?.toString() ?? null,
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

          <div className="card p-5">
            <div className="flex items-center gap-2">
              <Share2 size={18} />
              <h2 className="font-semibold">Site progress</h2>
            </div>
            <div className="mt-4 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-gold-shine" style={{ width: `${project.progressPct}%` }} />
            </div>
            <div className="mt-3 text-sm text-slate-600">{project.progressPct}% complete · {completedAssets} site parts completed</div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="card p-5">
      <Icon className="text-navy-800" size={20} />
      <div className="mt-3 truncate text-xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
