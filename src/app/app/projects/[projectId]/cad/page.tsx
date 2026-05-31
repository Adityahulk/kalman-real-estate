import Link from "next/link";
import { CheckCircle2, Clock3, FileWarning, Layers3, Map, Upload } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { CadUploadForm } from "../../../cad/cad-upload-form";

export const dynamic = "force-dynamic";

export default async function ProjectCadPage({ params }: { params: { projectId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;

  const project = await prisma.project.findFirstOrThrow({ where: { id: params.projectId, tenantId: session.tenantId } });
  const cadFiles = await prisma.cadFile.findMany({
    where: { tenantId: session.tenantId, projectId: project.id },
    orderBy: { createdAt: "desc" },
    include: { scenes: { take: 1, orderBy: { createdAt: "desc" } }, reviewIssues: { where: { resolved: false } } },
  });

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
        <div>
          <div className="text-sm text-slate-500">{project.name}</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">CAD map workspace</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Upload the project DXF, review extracted plots/assets, publish, then click plots to manage ownership and documents.
          </p>
        </div>
        <Link className="btn-outline" href={`/app/projects/${project.id}`}>
          Back to project
        </Link>
      </div>

      <section className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <CadUploadForm
            projects={[{ id: project.id, name: project.name }]}
            fixedProjectId={project.id}
            fixedParentType="PROJECT"
            fixedParentId={project.id}
            title="Upload site CAD"
            description="Choose the project DXF file. Parent and scope are handled automatically."
            simple
            redirectToReview
          />
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Upload size={18} />
              <h2 className="font-semibold">Processing states</h2>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <State label="Uploaded" detail="File saved and job queued." />
              <State label="Extracting" detail="Layers, polygons, labels, and dimensions are parsed." />
              <State label="Review required" detail="Admin confirms plots/assets before publish." />
              <State label="Published" detail="Plots and assets become live records." />
            </div>
          </div>
        </div>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Map size={18} />
              <h2 className="font-semibold">Project CAD files</h2>
            </div>
            <span className="chip bg-slate-100 text-slate-700">{cadFiles.length} files</span>
          </div>
          <div className="divide-y divide-slate-100">
            {cadFiles.map((file) => (
              <div key={file.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_180px] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Map size={17} className="text-navy-800" />
                    <Link className="font-medium text-navy-900 hover:underline" href={`/app/cad/${file.id}`}>{file.originalName}</Link>
                    <span className="chip bg-slate-100 text-slate-700">{file.format.replaceAll("_", " ")}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {file.parentType.replaceAll("_", " ")} · version {file.version} · {file.scenes[0]?.id ? "scene ready" : statusText(file.status)}
                  </div>
                  {file.errorMessage ? <div className="mt-2 text-xs text-rose-700">{file.errorMessage}</div> : null}
                  {file.reviewIssues.length ? (
                    <div className="mt-2 flex items-center gap-2 text-xs text-amber-700">
                      <FileWarning size={14} />
                      {file.reviewIssues.length} unresolved warnings
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <CadStatus status={file.status} />
                  <Link className="btn-outline h-8 px-3 text-xs" href={`/app/cad/${file.id}`}>{file.status === "PUBLISHED" ? "Open map" : "Review"}</Link>
                </div>
              </div>
            ))}
            {!cadFiles.length ? (
              <div className="p-8 text-center text-sm text-slate-500">Upload the first project CAD to start the ownership map.</div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}

function State({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="font-medium text-navy-950">{label}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}

function statusText(status: string) {
  if (status === "UPLOADED") return "queued for processing";
  if (status === "CONVERTING") return "converting";
  if (status === "PARSING") return "parsing";
  if (status === "EXTRACTING") return "extracting";
  if (status === "FAILED") return "failed";
  return status.replaceAll("_", " ").toLowerCase();
}

function CadStatus({ status }: { status: string }) {
  const Icon = status === "PUBLISHED" ? CheckCircle2 : status === "FAILED" ? FileWarning : status === "REVIEW_REQUIRED" ? Layers3 : Clock3;
  const tone =
    status === "PUBLISHED"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "FAILED"
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : "bg-amber-50 text-amber-800 ring-amber-200";

  return (
    <span className={`chip justify-center ring-1 ${tone}`}>
      <Icon size={14} />
      {status.replaceAll("_", " ")}
    </span>
  );
}
