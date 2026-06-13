import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Map, Upload, Wrench } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { CadUploadForm } from "../../../../../cad/cad-upload-form";
import { DeleteCadButton } from "@/components/delete-cad-button";

export const dynamic = "force-dynamic";

export default async function SiteAssetWorkspacePage({
  params,
}: {
  params: { projectId: string; assetId: string };
}) {
  const session = await getSessionUser();
  if (!session) return null;
  const asset = await prisma.siteAsset.findFirst({
    where: {
      id: params.assetId,
      tenantId: session.tenantId,
      projectId: params.projectId,
      archivedAt: null,
    },
    include: { project: true },
  });
  if (!asset) notFound();

  const [sourceLinks, childCadFiles, checklistItems] = await Promise.all([
    prisma.spatialLink.findMany({
      where: { tenantId: session.tenantId, recordType: "SiteAsset", recordId: asset.id },
      include: { entity: { include: { scene: { include: { cadFile: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cadFile.findMany({
      where: { tenantId: session.tenantId, parentType: "SITE_ASSET", parentId: asset.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.checklistItem.findMany({
      where: { tenantId: session.tenantId, parentType: "SITE_ASSET", parentId: asset.id },
      orderBy: [{ category: "asc" }, { label: "asc" }],
    }),
  ]);

  return (
    <main className="px-4 py-6 lg:px-8">
      <Link className="mb-5 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-navy-950" href={`/app/projects/${asset.projectId}/development`}>
        <ArrowLeft size={16} /> Back to development
      </Link>
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
        <div>
          <div className="text-sm text-slate-500">{asset.project.name} / Site asset</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{asset.name}</h1>
          <p className="mt-2 text-sm text-slate-600">{asset.type.replaceAll("_", " ")} · {asset.status.replaceAll("_", " ")} · {asset.progressPct}% complete</p>
        </div>
        {sourceLinks[0] ? <Link className="btn-primary" href={`/app/cad/${sourceLinks[0].entity.scene.cadFile.id}`}><Map size={17} /> Open source CAD</Link> : null}
      </div>

      <section className="mt-6 grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-5">
          <CadUploadForm
            projects={[{ id: asset.projectId, name: asset.project.name }]}
            fixedProjectId={asset.projectId}
            fixedParentType="SITE_ASSET"
            fixedParentId={asset.id}
            title="Upload child CAD"
            description={`Upload a detailed drawing for ${asset.name}. Reviewed subcomponents become trackable work items.`}
            simple
            redirectToReview
          />
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold"><Upload size={17} /> Child CAD versions</h2>
            <div className="mt-3 space-y-2">
              {childCadFiles.map((file) => <div className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2" key={file.id}><Link className="min-w-0 flex-1 truncate text-sm hover:text-navy-700" href={`/app/cad/${file.id}`}>{file.originalName} · v{file.version} · {file.status.replaceAll("_", " ")}</Link><DeleteCadButton cadFileId={file.id} fileName={file.originalName} published={file.status === "PUBLISHED"} /></div>)}
              {!childCadFiles.length ? <p className="text-sm text-slate-500">No detailed child drawing uploaded yet.</p> : null}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold"><Wrench size={18} /> Extracted subcomponents</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {checklistItems.map((item) => (
                <div className="rounded-md border border-slate-200 p-3" key={item.id}>
                  <div className="flex items-center justify-between gap-3"><span className="font-medium">{item.label}</span><span className="chip bg-slate-100 text-slate-700">{item.category}</span></div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-gold-shine" style={{ width: `${item.progressPct}%` }} /></div>
                  <div className="mt-2 text-xs text-slate-500">{item.progressPct}% · {item.status}</div>
                </div>
              ))}
              {!checklistItems.length ? <div className="rounded-md border border-dashed border-slate-200 p-6 text-sm text-slate-500">Publish a child CAD to create trackable subcomponents.</div> : null}
            </div>
          </div>
          <div className="card p-5">
            <h2 className="font-semibold">Source history</h2>
            <div className="mt-3 space-y-2">
              {sourceLinks.map((link) => <Link className="block rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50" href={`/app/cad/${link.entity.scene.cadFile.id}`} key={link.id}>{link.entity.scene.cadFile.originalName} · v{link.entity.scene.cadFile.version}</Link>)}
              {!sourceLinks.length ? <p className="text-sm text-slate-500">This asset was created manually.</p> : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
