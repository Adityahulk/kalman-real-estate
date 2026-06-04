import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeIndianRupee,
  CheckCircle2,
  ChevronDown,
  FileText,
  GitBranch,
  History,
  Image,
  Landmark,
  Map,
  Upload,
  UserRound,
  Wrench,
} from "lucide-react";
import type React from "react";
import { getSessionUser } from "@/server/session";
import { getPlotWorkspace } from "@/server/services/plot-workspace";
import { fullInr } from "@/lib/format";
import { DeleteFileButton } from "@/components/delete-file-button";
import { FileUploader } from "@/components/file-uploader";
import { CadUploadForm } from "../../../../cad/cad-upload-form";
import { DocumentApprovalButtons } from "../../../../documents/document-actions";
import { ManualPlotZoneForm } from "../../../manual-entry-actions";
import {
  PlotChecklistProgressForm,
} from "../../../../ownership/ownership-actions";

export const dynamic = "force-dynamic";

const primaryTabs = ["overview", "ownership", "documents", "history"] as const;
const advancedTabs = ["registry", "transfers", "development", "child-cad"] as const;
const tabs = [...primaryTabs, ...advancedTabs] as const;

export default async function ProjectPlotWorkspacePage({
  params,
  searchParams,
}: {
  params: { projectId: string; plotId: string };
  searchParams: { tab?: string };
}) {
  const session = await getSessionUser();
  if (!session) return null;
  const workspace = await getPlotWorkspace({ tenantId: session.tenantId, userId: session.id, role: session.role }, params.plotId);
  if (workspace.plot.projectId !== params.projectId) notFound();
  const plot = workspace.plot;
  const requestedTab = searchParams.tab === "audit" ? "history" : searchParams.tab;
  const activeTab = tabs.includes(requestedTab as typeof tabs[number]) ? requestedTab as typeof tabs[number] : "overview";
  const latestRegistry = plot.registryRecords[0];
  const latestOwnership = plot.ownershipRecords[0];
  const cadFileId = workspace.spatialLinks[0]?.entity.scene.cadFileId;
  const plotDocumentCount = workspace.plotFiles.length + workspace.generatedDocuments.length;

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 xl:flex-row xl:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link className="hover:underline" href={`/app/projects/${plot.projectId}`}>{plot.project.name}</Link>
            <span>/</span>
            <span>Plot workspace</span>
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{plot.code}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {plot.currentOwner?.name ?? "Company inventory"} · {plot.status.replaceAll("_", " ")} · {plot.areaSqft?.toString() ?? "-"} sq ft
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {cadFileId ? (
            <Link className="btn-primary" href={`/app/cad/${cadFileId}`}>
              <Map size={17} />
              Open CAD source
            </Link>
          ) : null}
          <Link className="btn-outline" href={`/app/projects/${plot.projectId}/ownership`}>
            Back to ledger
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 pb-2">
        {primaryTabs.map((tab) => (
          <Link
            key={tab}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
              activeTab === tab ? "bg-navy-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
            href={`/app/projects/${plot.projectId}/plots/${plot.id}?tab=${tab}`}
          >
            {tab.replaceAll("-", " ")}
          </Link>
        ))}
        <details className="relative">
          <summary className="cursor-pointer rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">More</summary>
          <div className="absolute z-20 mt-2 grid min-w-48 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-card">
            {advancedTabs.map((tab) => (
              <Link
                key={tab}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                  activeTab === tab ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
                href={`/app/projects/${plot.projectId}/plots/${plot.id}?tab=${tab}`}
              >
                {tab.replaceAll("-", " ")}
              </Link>
            ))}
          </div>
        </details>
      </div>

      {activeTab === "overview" ? (
        <section className="mt-4 space-y-6">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Metric icon={UserRound} label="Current owner" value={plot.currentOwner?.name ?? "Company"} />
              <Metric icon={Landmark} label="Registry" value={latestRegistry?.status ?? "Not started"} />
              <Metric icon={FileText} label="Documents" value={String(plotDocumentCount)} />
              <Metric icon={BadgeIndianRupee} label="Last value" value={fullInr(Number(latestOwnership?.amountInr ?? plot.priceInr ?? 0))} />
            </div>
            <div className="card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Quick actions</h2>
                  <p className="mt-1 text-sm text-slate-500">Open a focused page for each action.</p>
                </div>
                <Link className="btn-outline h-9 px-3 text-xs" href={`/app/projects/${plot.projectId}/plots/${plot.id}?tab=history`}>
                  View history
                </Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Link className="btn-primary justify-center" href={plot.currentOwnerId ? `/app/projects/${plot.projectId}/plots/${plot.id}/transfer` : `/app/projects/${plot.projectId}/ownership/new-allotment?plotId=${plot.id}`}>
                  <GitBranch size={17} />
                  {plot.currentOwnerId ? "Change owner" : "Add owner"}
                </Link>
                <Link className="btn-outline justify-center" href={`/app/projects/${plot.projectId}/plots/${plot.id}/documents/upload`}>
                  <Upload size={17} />
                  Upload document
                </Link>
                <Link className="btn-outline justify-center" href={`/app/projects/${plot.projectId}/plots/${plot.id}/letters/new`}>
                  <FileText size={17} />
                  Generate letter
                </Link>
                <Link className="btn-outline justify-center" href={`/app/projects/${plot.projectId}/plots/${plot.id}/registry/update`}>
                  <CheckCircle2 size={17} />
                  Update registry
                </Link>
              </div>
            </div>
            <div className="card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Map size={18} />
                  <h2 className="font-semibold">Plot CAD preview</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cadFileId ? <Link className="btn-outline h-9 px-3 text-xs" href={`/app/cad/${cadFileId}`}>Open full CAD</Link> : null}
                  <Link className="btn-outline h-9 px-3 text-xs" href={`?tab=child-cad`}>Upload plot CAD</Link>
                </div>
              </div>
              <PlotGeometryPreview geometry={plot.geometry} label={plot.code} />
            </div>
            <div className="card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Image size={18} />
                <h2 className="font-semibold">Plot media / structure photos</h2>
              </div>
              <FileUploader label="Upload plot image or house photo" ownerType="Plot" ownerId={plot.id} visibility="OWNER_VISIBLE" accept="image/*" />
            </div>
            <Timeline title="Recent plot history" items={workspace.timeline.slice(0, 8)} collapsible />
          </div>
        </section>
      ) : null}

      {activeTab === "ownership" ? (
        <section className="mt-4 grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <OwnerSummary plot={plot} />
            <OwnershipTimeline records={plot.ownershipRecords} />
            <div className="card p-5">
              <h2 className="mb-4 font-semibold">Owner KYC documents</h2>
              <DocumentGrid files={workspace.ownerFiles} empty="No PAN/Aadhaar/KYC uploaded for current owner." />
            </div>
          </div>
          <aside className="space-y-6">
            <ActionCard title="Ownership actions">
              <Link className="btn-primary justify-center" href={plot.currentOwnerId ? `/app/projects/${plot.projectId}/plots/${plot.id}/transfer` : `/app/projects/${plot.projectId}/ownership/new-allotment?plotId=${plot.id}`}>
                <GitBranch size={17} />
                {plot.currentOwnerId ? "Change owner" : "Add owner"}
              </Link>
              <Link className="btn-outline justify-center" href={`/app/projects/${plot.projectId}/plots/${plot.id}/documents/upload`}>
                <Upload size={17} />
                Upload owner documents
              </Link>
            </ActionCard>
          </aside>
        </section>
      ) : null}

      {activeTab === "documents" ? (
        <section className="mt-4 grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="card p-5">
              <h2 className="mb-4 font-semibold">Generated letters</h2>
              <div className="space-y-3">
                {workspace.generatedDocuments.map((document) => (
                  <div key={document.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{document.number ?? document.type}</div>
                        <div className="mt-1 text-xs text-slate-500">{document.status} · {document.createdAt.toLocaleDateString("en-IN")}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link className="btn-outline h-8 px-3 text-xs" href={`/app/projects/${plot.projectId}/plots/${plot.id}/letters/${document.id}`}>Edit</Link>
                        {document.fileAssetId ? <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/files/${document.fileAssetId}/download`}>Download</a> : null}
                        {document.fileAssetId ? <DeleteFileButton fileId={document.fileAssetId} fileName={document.number ?? document.type} /> : null}
                        <DocumentApprovalButtons documentId={document.id} />
                      </div>
                    </div>
                  </div>
                ))}
                {!workspace.generatedDocuments.length ? <Empty label="No letters generated yet." /> : null}
              </div>
            </div>
            <div className="card p-5">
              <h2 className="mb-4 font-semibold">Uploaded plot documents</h2>
              <DocumentGrid files={workspace.plotFiles} empty="No plot documents uploaded yet." />
            </div>
          </div>
          <aside className="space-y-6">
            <ActionCard title="Document actions">
              <Link className="btn-primary justify-center" href={`/app/projects/${plot.projectId}/plots/${plot.id}/letters/new`}>
                <FileText size={17} />
                Generate letter
              </Link>
              <Link className="btn-outline justify-center" href={`/app/projects/${plot.projectId}/plots/${plot.id}/documents/upload`}>
                <Upload size={17} />
                Upload document
              </Link>
            </ActionCard>
          </aside>
        </section>
      ) : null}

      {activeTab === "registry" ? (
        <section className="mt-4 grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="card p-5">
              <h2 className="mb-4 font-semibold">Registry records</h2>
              <div className="space-y-3">
                {plot.registryRecords.map((record) => (
                  <div key={record.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="font-medium">{record.status} · {record.registryNo ?? "No registry number"}</div>
                    <div className="mt-1 text-xs text-slate-500">{record.registryDate?.toLocaleDateString("en-IN") ?? record.createdAt.toLocaleDateString("en-IN")}</div>
                    {record.notes ? <div className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{record.notes}</div> : null}
                  </div>
                ))}
                {!plot.registryRecords.length ? <Empty label="No registry records yet." /> : null}
              </div>
            </div>
            <div className="card p-5">
              <h2 className="mb-4 font-semibold">Registry documents</h2>
              <DocumentGrid files={workspace.plotFiles.filter((file) => file.documentType === "REGISTRY_RECEIPT" || file.documentType === "REGISTRY_DEED")} empty="No registry receipt or deed uploaded." />
            </div>
          </div>
          <aside className="space-y-6">
            <ActionCard title="Registry actions">
              <Link className="btn-primary justify-center" href={`/app/projects/${plot.projectId}/plots/${plot.id}/registry/update`}>
                <CheckCircle2 size={17} />
                Update registry
              </Link>
              <Link className="btn-outline justify-center" href={`/app/projects/${plot.projectId}/plots/${plot.id}/documents/upload`}>
                <Upload size={17} />
                Upload registry document
              </Link>
            </ActionCard>
          </aside>
        </section>
      ) : null}

      {activeTab === "transfers" ? (
        <section className="mt-4 grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <OwnershipTimeline records={plot.ownershipRecords.filter((record) => record.kind === "TRANSFER" || record.kind === "ALLOTMENT")} />
            <div className="card p-5">
              <h2 className="mb-4 font-semibold">Transfer documents</h2>
              <DocumentGrid files={workspace.plotFiles.filter((file) => file.documentType === "TRANSFER_LETTER" || file.documentType === "AGREEMENT" || file.documentType === "KYC")} empty="No transfer documents uploaded." />
            </div>
          </div>
          <aside className="space-y-6">
            <ActionCard title="Transfer actions">
              <Link className="btn-primary justify-center" href={`/app/projects/${plot.projectId}/plots/${plot.id}/transfer`}>
                <GitBranch size={17} />
                Change owner
              </Link>
              <Link className="btn-outline justify-center" href={`/app/projects/${plot.projectId}/plots/${plot.id}/letters/new?type=transfer_letter`}>
                <FileText size={17} />
                Generate transfer letter
              </Link>
              <Link className="btn-outline justify-center" href={`/app/projects/${plot.projectId}/plots/${plot.id}/documents/upload`}>
                <Upload size={17} />
                Upload transfer document
              </Link>
            </ActionCard>
          </aside>
        </section>
      ) : null}

      {activeTab === "development" ? (
        <section className="mt-4 grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className="card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Wrench size={18} />
                <h2 className="font-semibold">Plot zones and checklist</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {plot.checklistItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{item.label}</div>
                      <span className="chip bg-slate-100 text-slate-700">{item.category}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-gold-shine" style={{ width: `${item.progressPct}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-slate-500">{item.progressPct}% · {item.status}</div>
                  </div>
                ))}
                {!plot.checklistItems.length ? <Empty label="Upload plot CAD or add checklist zones to track plot development." /> : null}
              </div>
            </div>
            <div className="card p-5">
              <h2 className="mb-4 font-semibold">Recent plot progress</h2>
              <div className="space-y-3">
                {workspace.progressUpdates.map((update) => (
                  <div key={update.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="font-medium">{update.parentType} · {update.progressPct}%</div>
                    <div className="mt-1 text-slate-500">{update.summary}</div>
                  </div>
                ))}
                {!workspace.progressUpdates.length ? <Empty label="No plot progress updates yet." /> : null}
              </div>
            </div>
          </div>
          <aside className="space-y-6">
            <ManualPlotZoneForm plotId={plot.id} />
            <PlotChecklistProgressForm items={plot.checklistItems.map((item) => ({ id: item.id, label: item.label }))} />
          </aside>
        </section>
      ) : null}

      {activeTab === "history" ? (
        <section className="mt-4">
          <Timeline title="Plot history" items={workspace.timeline} />
        </section>
      ) : null}

      {activeTab === "child-cad" ? (
        <section className="mt-4 grid gap-6 xl:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <CadUploadForm
              projects={[{ id: plot.projectId, name: plot.project.name }]}
              fixedProjectId={plot.projectId}
              fixedParentType="PLOT"
              fixedParentId={plot.id}
              title="Upload plot-level CAD"
              description="Upload this plot's internal CAD to extract rooms, bathroom, kitchen, electrical, plumbing, garden, and finishing zones."
              simple
              redirectToReview
            />
            <ManualPlotZoneForm plotId={plot.id} />
          </div>
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
              <GitBranch size={18} />
              <h2 className="font-semibold">Child CAD versions</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {workspace.childCadFiles.map((file) => (
                <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
                  <div>
                    <div className="font-medium">{file.originalName}</div>
                    <div className="mt-1 text-xs text-slate-500">v{file.version} · {file.status.replaceAll("_", " ")} · {file.scenes[0]?.id ? "scene ready" : "processing"}</div>
                  </div>
                  <Link className="btn-outline h-8 px-3 text-xs" href={`/app/cad/${file.id}`}>Open</Link>
                </div>
              ))}
              {!workspace.childCadFiles.length ? <div className="p-8 text-center text-sm text-slate-500">No child CAD uploaded for this plot yet.</div> : null}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="card p-4">
      <Icon className="text-navy-800" size={18} />
      <div className="mt-3 truncate text-lg font-semibold">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function ActionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function OwnerSummary({ plot }: { plot: Awaited<ReturnType<typeof getPlotWorkspace>>["plot"] }) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 font-semibold">Current ownership</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Info label="Owner" value={plot.currentOwner?.name ?? "Company inventory"} />
        <Info label="Owner type" value={plot.currentOwner?.type?.replaceAll("_", " ") ?? "Company"} />
        <Info label="Email" value={plot.currentOwner?.email ?? "-"} />
        <Info label="Phone" value={plot.currentOwner?.phone ?? "-"} />
        <Info label="Address" value={plot.currentOwner?.address ?? "-"} wide />
      </div>
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

function OwnershipTimeline({ records }: { records: Awaited<ReturnType<typeof getPlotWorkspace>>["plot"]["ownershipRecords"] }) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 font-semibold">Ownership timeline</h2>
      <div className="space-y-3">
        {records.map((record) => (
          <div key={record.id} className="rounded-lg border border-slate-200 p-3 text-sm">
            <div className="font-medium">{record.kind.replaceAll("_", " ")} · {record.owner?.name ?? "Company"}</div>
            <div className="mt-1 text-slate-500">{record.amountInr ? fullInr(Number(record.amountInr)) : "No amount"} · {record.sharePct?.toString() ?? "100"}% share · {record.effectiveAt.toLocaleDateString("en-IN")}</div>
            {record.notes ? <div className="mt-2 text-xs text-slate-500">{record.notes}</div> : null}
          </div>
        ))}
        {!records.length ? <Empty label="No ownership records yet." /> : null}
      </div>
    </div>
  );
}

function DocumentGrid({ files, empty }: { files: Awaited<ReturnType<typeof getPlotWorkspace>>["plotFiles"]; empty: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {files.map((file) => (
        <div key={file.id} className="rounded-lg border border-slate-200 p-3 text-sm">
          <div className="font-medium">{file.documentType?.replaceAll("_", " ") ?? "Document"}</div>
          <div className="mt-1 truncate text-xs text-slate-500">{file.fileName}</div>
          <div className="mt-2 text-xs text-slate-500">
            {file.documentNo ?? "No reference"} · {(file.documentDate ?? file.createdAt).toLocaleDateString("en-IN")} · {file.visibility.replaceAll("_", " ")}
          </div>
          {file.notes ? <div className="mt-2 text-xs text-slate-500">{file.notes}</div> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/files/${file.id}/download`}>Download</a>
            <DeleteFileButton fileId={file.id} fileName={file.fileName} />
          </div>
        </div>
      ))}
      {!files.length ? <Empty label={empty} /> : null}
    </div>
  );
}

function Timeline({
  title = "Audit timeline",
  items,
  collapsible = false,
}: {
  title?: string;
  items: Awaited<ReturnType<typeof getPlotWorkspace>>["timeline"];
  collapsible?: boolean;
}) {
  const body = (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-medium">{item.title}</div>
              <span className="text-xs text-slate-500">{item.at.toLocaleString("en-IN")}</span>
            </div>
            {item.detail ? <div className="mt-1 text-xs text-slate-500">{item.detail}</div> : null}
          </div>
        ))}
        {!items.length ? <Empty label="No audit history yet." /> : null}
      </div>
  );

  if (collapsible) {
    return (
      <details className="card group p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History size={18} />
            <h2 className="font-semibold">{title}</h2>
            <span className="chip bg-slate-100 text-slate-700">{items.length}</span>
          </div>
          <ChevronDown className="text-slate-400 transition group-open:rotate-180" size={18} />
        </summary>
        <div className="mt-4 border-t border-slate-100 pt-4">{body}</div>
      </details>
    );
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2">
        <History size={18} />
        <h2 className="font-semibold">{title}</h2>
      </div>
      {body}
    </div>
  );
}

function PlotGeometryPreview({ geometry, label }: { geometry: unknown; label: string }) {
  const points = extractPoints(geometry);
  if (!points.length) {
    return <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No CAD geometry attached to this plot yet.</div>;
  }
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const pad = 24;
  const mapped = points.map(([x, y]) => [x - minX + pad, maxY - y + pad]);
  const path = `M ${mapped.map((point) => point.join(" ")).join(" L ")} Z`;

  return (
    <svg viewBox={`0 0 ${width + pad * 2} ${height + pad * 2}`} className="h-72 w-full rounded-lg bg-slate-950">
      <rect width="100%" height="100%" fill="#020617" />
      <path d={path} fill="rgba(244,197,66,0.2)" stroke="#f4c542" strokeWidth="2" />
      <text x={pad + 8} y={pad + 18} fill="#f8fafc" fontSize="14" paintOrder="stroke" stroke="#020617" strokeWidth="4">{label}</text>
    </svg>
  );
}

function extractPoints(geometry: unknown): [number, number][] {
  if (!geometry || typeof geometry !== "object" || Array.isArray(geometry)) return [];
  const rawPoints = (geometry as Record<string, unknown>).points;
  if (!Array.isArray(rawPoints)) return [];
  return rawPoints.filter((point): point is [number, number] => Array.isArray(point) && typeof point[0] === "number" && typeof point[1] === "number");
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">{label}</div>;
}
