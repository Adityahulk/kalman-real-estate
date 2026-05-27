import Link from "next/link";
import { CheckCircle2, Clock3, FileWarning, Layers3, Map } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { CadUploadForm } from "./cad-upload-form";
import { getCadDependencyHealth } from "@/server/services/cad-health";

export const dynamic = "force-dynamic";

export default async function CadPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const [projects, cadFiles, cadHealth] = await Promise.all([
    prisma.project.findMany({ where: { tenantId: session.tenantId }, orderBy: { name: "asc" } }),
    prisma.cadFile.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { scenes: { take: 1, orderBy: { createdAt: "desc" } }, reviewIssues: { where: { resolved: false } } },
    }),
    getCadDependencyHealth(),
  ]);

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Automatic recursive CAD engine</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Upload DWG, DXF, or vector PDF against project/site, plot, unit, floor, room, or asset. Processing creates reviewable scenes before publish affects inventory.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <CadUploadForm projects={projects.map((project) => ({ id: project.id, name: project.name }))} />
          <section className="card p-5">
            <h2 className="font-semibold">CAD worker health</h2>
            <div className="mt-4 grid gap-2 text-sm">
              <HealthRow label="Python" ok={cadHealth.python.ok} />
              <HealthRow label="DXF ezdxf" ok={cadHealth.ezdxf.ok} fallback="JS fallback available" />
              <HealthRow label="DWG ODA converter" ok={cadHealth.oda.ok} />
              <HealthRow label="Vector PDF PyMuPDF" ok={cadHealth.pymupdf.ok} />
            </div>
          </section>
        </div>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">CAD processing queue</h2>
            <span className="chip bg-slate-100 text-slate-700">{cadFiles.length} files</span>
          </div>
          <div className="divide-y divide-slate-100">
            {cadFiles.map((file) => (
              <div key={file.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_180px] md:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <Map size={17} className="text-navy-800" />
                    <Link className="font-medium text-navy-900 hover:underline" href={`/app/cad/${file.id}`}>{file.originalName}</Link>
                    <span className="chip bg-slate-100 text-slate-700">{file.format.replaceAll("_", " ")}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {file.parentType} · version {file.version} · {file.scenes[0]?.id ? "scene ready" : "scene pending"}
                  </div>
                  {file.reviewIssues.length ? (
                    <div className="mt-2 flex items-center gap-2 text-xs text-amber-700">
                      <FileWarning size={14} />
                      {file.reviewIssues.length} unresolved review warnings
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  <CadStatus status={file.status} />
                  <Link className="btn-outline h-8 px-3 text-xs" href={`/app/cad/${file.id}`}>Review</Link>
                </div>
              </div>
            ))}
            {!cadFiles.length ? (
              <div className="p-8 text-center text-sm text-slate-500">No CAD files uploaded yet.</div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function HealthRow({ label, ok, fallback }: { label: string; ok: boolean; fallback?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span>{label}</span>
      <span className={`chip ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
        {ok ? "ready" : fallback ?? "needs setup"}
      </span>
    </div>
  );
}

function CadStatus({ status }: { status: string }) {
  const icon = status === "PUBLISHED" ? CheckCircle2 : status === "FAILED" ? FileWarning : status === "REVIEW_REQUIRED" ? Layers3 : Clock3;
  const Icon = icon;
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
