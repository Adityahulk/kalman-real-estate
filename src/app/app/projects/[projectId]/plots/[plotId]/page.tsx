import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileText,
  GitBranch,
  History,
  Landmark,
  Map,
  Pencil,
  Upload,
  Wrench,
} from "lucide-react";
import type React from "react";
import { requireAnyPagePermission } from "@/server/page-auth";
import { hasPermission } from "@/server/rbac";
import { getPlotWorkspace } from "@/server/services/plot-workspace";
import { prisma } from "@/server/db";
import { fullInr } from "@/lib/format";
import { DeleteFileButton } from "@/components/delete-file-button";
import { DeleteCadButton } from "@/components/delete-cad-button";
import { FileActions } from "@/components/file-actions";
import { FilePreview } from "@/components/file-preview";
import { FileShareActions } from "@/components/file-share-actions";
import { MultiFileShare } from "@/components/multi-file-share";
import { FileUploader } from "@/components/file-uploader";
import { SignedLetterUpload } from "@/components/signed-letter-upload";
import { DeleteDocumentButton, DocumentApprovalButtons } from "../../../../documents/document-actions";
import { ManualPlotZoneForm } from "../../../manual-entry-actions";
import {
  PlotChecklistProgressForm,
} from "../../../../ownership/ownership-actions";
import { BackButton } from "@/components/back-button";
import { CadUploadForm } from "../../../../cad/cad-upload-form";
import { HistoricalAllotmentToggle, OwnershipEventHistory } from "./ownership-history-controls";

export const dynamic = "force-dynamic";

const primaryTabs = ["overview", "status", "ownership", "plot-map", "documents", "history"] as const;
const advancedTabs = ["registry", "transfers", "development"] as const;
const tabs = [...primaryTabs, ...advancedTabs] as const;

export default async function ProjectPlotWorkspacePage(
  props: {
    params: Promise<{ projectId: string; plotId: string }>;
    searchParams: Promise<{ tab?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const session = await requireAnyPagePermission(["ownership.view", "owner.portal"]);
  const canManageOwnership = hasPermission(session.role, "ownership.manage", session.permissions);
  const canGenerateDocuments = hasPermission(session.role, "documents.generate", session.permissions);
  const canApproveDocuments = hasPermission(session.role, "documents.approve", session.permissions);
  const canSignDocuments = hasPermission(session.role, "documents.sign", session.permissions);
  const canUploadFiles = hasPermission(session.role, "files.upload", session.permissions);
  const canRestoreRecords = hasPermission(session.role, "records.restore", session.permissions);
  const [workspace, firm] = await Promise.all([
    getPlotWorkspace({ tenantId: session.tenantId, userId: session.id, role: session.role }, params.plotId),
    prisma.tenant.findUniqueOrThrow({ where: { id: session.tenantId }, select: { name: true, maxTransfersPerPlot: true } }),
  ]);
  if (workspace.plot.projectId !== params.projectId) notFound();
  const plot = workspace.plot;
  const requestedTab = searchParams.tab === "audit" ? "history" : searchParams.tab;
  const activeTab = tabs.includes(requestedTab as typeof tabs[number]) ? requestedTab as typeof tabs[number] : "overview";
  const cadFileId = workspace.spatialLinks[0]?.entity.scene.cadFileId;
  const plotMapFileId = workspace.childCadFiles[0]?.id ?? cadFileId;
  const plotMapFiles = workspace.plotFiles.filter((file) => file.categoryKey === "plot-map");
  const signedOwnershipFiles = workspace.plotFiles.filter(
    (file) => file.categoryKey === "signed-allotment-letter" || file.categoryKey === "signed-transfer-letter",
  );
  const oldDocumentFiles = workspace.plotFiles.filter((file) => file.categoryKey === "old-documents");
  const linkedOwnershipFileIds = new Set(
    workspace.generatedDocuments
      .flatMap((document) => [document.fileAssetId, document.signedFileAssetId])
      .filter(Boolean) as string[],
  );
  const pendingHistoricalFiles = [...oldDocumentFiles, ...signedOwnershipFiles]
    .filter((file, index, files) => files.findIndex((candidate) => candidate.id === file.id) === index)
    .filter((file) => !linkedOwnershipFileIds.has(file.id));
  const latestPlotMapFile = plotMapFiles[0] ?? null;
  const latestPlotCadPreviewId = workspace.childCadFiles.find((file) => file.analysis?.previewArtifactKey)?.id ?? null;
  const registryDocuments = workspace.plotFiles.filter((file) => file.documentType === "REGISTRY_RECEIPT" || file.documentType === "REGISTRY_DEED");
  const ownershipLetters = workspace.generatedDocuments.filter((document) => document.type.includes("allotment") || document.type.includes("transfer"));
  const latestSignedLetterUploadTargetId = ownershipLetters
    .filter((document) => document.fileAssetId && ["APPROVED", "SENT_FOR_SIGNATURE", "SIGNED"].includes(document.status))
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0]?.id ?? null;
  const latestSignedByDocumentNo = new globalThis.Map<string, typeof signedOwnershipFiles[number]>();
  const availableSignedFileIds = new Set(signedOwnershipFiles.map((file) => file.id));
  for (const file of signedOwnershipFiles) {
    if (file.documentNo && !latestSignedByDocumentNo.has(file.documentNo)) latestSignedByDocumentNo.set(file.documentNo, file);
  }
  const latestAllotmentRecord = plot.ownershipRecords.find((record) => record.kind === "ALLOTMENT") ?? null;
  const ownershipEventRecords = plot.ownershipRecords.filter(
    (record): record is typeof record & { kind: "ALLOTMENT" | "TRANSFER" } => record.kind === "ALLOTMENT" || record.kind === "TRANSFER",
  );
  const latestOwnershipEvent = ownershipEventRecords[0] ?? null;
  const historicalAllotmentRecord = ownershipEventRecords.find(
    (record) => record.kind === "ALLOTMENT" && isHistoricalAllotment(record.extraDetails),
  ) ?? null;
  const currentAllotteeSupportingFiles = uniqueFiles([
    ...workspace.allotmentSupportingFiles,
    ...workspace.ownerFiles.filter((file) => file.categoryKey === "allottee-kyc" || file.categoryKey === "transfer-kyc"),
  ]).sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  const developmentPct = plot.checklistItems.length
    ? Math.round(plot.checklistItems.reduce((total, item) => total + item.progressPct, 0) / plot.checklistItems.length)
    : 0;
  const developmentStatus = developmentPct === 0 ? "Not started" : developmentPct >= 100 ? "Finished" : "In progress";
  const allotmentStatus = plot.currentOwnerId ? "Allotted" : "Not allotted";
  const acceptedTransferCount = await acceptedTransferCountForPlot(session.tenantId, plot.id);
  const transferLimitReached = acceptedTransferCount >= firm.maxTransfersPerPlot;
  const documentState = workspace.documentState;
  const latestDocument = documentState?.latestDocument ?? null;
  const latestDocumentHref = latestDocument?.fileAssetId
    ? `/api/v1/files/${latestDocument.fileAssetId}/download?disposition=inline&proxy=1`
    : latestDocument?.generatedDocumentId
      ? `/app/projects/${plot.projectId}/plots/${plot.id}/letters/${latestDocument.generatedDocumentId}`
      : null;

  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-8">
      <BackButton fallbackHref={`/app/projects/${plot.projectId}/ownership`} />
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 xl:flex-row xl:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link className="hover:underline" href={`/app/projects/${plot.projectId}`}>{plot.project.name}</Link>
            <span>/</span>
            <span>Plot details</span>
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{plot.code}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {plot.currentOwner?.name ?? firm.name} · {plot.status.replaceAll("_", " ")} · {plot.areaSqYards?.toString() ?? (plot.areaSqft ? String(Number(plot.areaSqft) / 9) : "-")} sq yd
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-primary" href={`/app/projects/${plot.projectId}/plots/${plot.id}?tab=plot-map`}>
            <Map size={17} />
            Plot map
          </Link>
          {canManageOwnership ? (
            <Link className="btn-outline" href={`/app/projects/${plot.projectId}/plots/${plot.id}/edit`}>
              <Pencil size={17} />
              Edit plot
            </Link>
          ) : null}
          <Link className="btn-outline" href={`/app/projects/${plot.projectId}/ownership`}>
            Back to ledger
          </Link>
        </div>
      </div>

      <section className="grid gap-3 border-b border-slate-200 py-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_auto] xl:items-stretch">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Current owner</div>
          <div className="mt-1 font-semibold text-navy-950">{plot.currentOwner?.name ?? firm.name}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Plot status</div>
          <div className="mt-1 font-semibold text-navy-950">{plot.status.replaceAll("_", " ")}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Latest document</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 font-semibold text-navy-950">
            <span>{latestDocument?.label ?? "No legal document available"}</span>
            {latestDocument?.signed ? <span className="chip bg-emerald-50 text-emerald-700">Signed</span> : null}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {latestDocument
              ? [latestDocument.number, latestDocument.ownerName, latestDocument.documentDate.toLocaleDateString("en-IN")].filter(Boolean).join(" · ")
              : "Upload or generate the ownership document"}
          </div>
        </div>
        <div className="flex items-stretch">
          {latestDocumentHref && latestDocument ? (
            <a
              className="btn-primary min-h-16 w-full justify-center px-5 xl:w-auto"
              href={latestDocumentHref}
              target={latestDocument.fileAssetId ? "_blank" : undefined}
              rel={latestDocument.fileAssetId ? "noreferrer" : undefined}
            >
              <Eye size={17} />
              See latest document
            </a>
          ) : (
            <Link className="btn-outline min-h-16 w-full justify-center px-5 xl:w-auto" href="?tab=documents">
              <Upload size={17} />
              Add document
            </Link>
          )}
        </div>
      </section>

      {activeTab === "overview" ? (
        <section className="mt-6">
          <div className="card divide-y divide-slate-200 overflow-hidden">
            <AccordionRow label="Plot" value={plot.code} open>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Info label="Plot code" value={plot.code} />
                <Info label="Area" value={`${plot.areaSqYards?.toString() ?? (plot.areaSqft ? String(Number(plot.areaSqft) / 9) : "-")} sq yd`} />
                <Info label="Prime location" value={plot.primeLocation ?? "-"} />
                <Info label="Who allotted" value={plot.allottedBy ?? "-"} />
                <Info label="Dimensions" value={plot.dimensions ?? "-"} />
              </div>
              <div className="mt-5">
                <div className="mb-3 text-sm font-semibold text-navy-950">Plot boundary details</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["North", "north", "northDimension"],
                    ["South", "south", "southDimension"],
                    ["East", "east", "eastDimension"],
                    ["West", "west", "westDimension"],
                  ] as const).map(([label, edgeKey, dimensionKey]) => (
                    <div key={label} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                      <div className="font-medium text-slate-900">{label}</div>
                      <div className="mt-2 text-slate-600">{boundaryValue(plot.boundaries, edgeKey)}</div>
                      <div className="mt-1 text-xs text-slate-500">Dimension: {boundaryValue(plot.boundaries, dimensionKey)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </AccordionRow>

            <AccordionRow label="Current owner" value={plot.currentOwner?.name ?? firm.name}>
              <div className="grid gap-4 md:grid-cols-2">
                <Info label="Owner" value={plot.currentOwner?.name ?? firm.name} />
                <Info label="Owner type" value={plot.currentOwner?.type?.replaceAll("_", " ") ?? "Company"} />
                <Info label="Phone" value={plot.currentOwner?.phone ?? "-"} />
                <Info label="Email" value={plot.currentOwner?.email ?? "-"} />
                <Info label="Address" value={plot.currentOwner?.address ?? "-"} wide />
              </div>
              <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
                <OwnerHistoryRows records={plot.ownershipRecords} firmName={firm.name} />
              </div>
            </AccordionRow>

            <AccordionRow label="Status" value={allotmentStatus}>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <Info label="Latest document" value={latestDocument?.label ?? "Not available"} />
                <Info label="Signed allotment letter" value={documentState?.signedAllotmentAvailable ? "Available" : "Not available"} />
                <Info label="Registry document" value={documentState?.registryDocumentAvailable ? "Available" : "Not available"} />
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <OwnershipLetterRows
                  documents={ownershipLetters}
                  plotId={plot.id}
                  latestSignedLetterUploadTargetId={latestSignedLetterUploadTargetId}
                  signedByDocumentNo={latestSignedByDocumentNo}
                  availableSignedFileIds={availableSignedFileIds}
                  canUploadSigned={canSignDocuments}
                />
              </div>
            </AccordionRow>

            <AccordionRow label="Development" value={`${developmentStatus} · ${developmentPct}%`}>
              <div className="grid gap-3 md:grid-cols-2">
                {plot.checklistItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{item.label}</div>
                      <span className="chip bg-slate-100 text-slate-700">{item.progressPct}%</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-gold-shine" style={{ width: `${item.progressPct}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-slate-500">{item.status.replaceAll("_", " ")}</div>
                  </div>
                ))}
                {!plot.checklistItems.length ? <Empty label="No development checklist has been added yet." /> : null}
              </div>
            </AccordionRow>

            <AccordionRow label="Actions" value={plot.currentOwnerId ? "Transfer or registry" : "New allotment"}>
              <div className="flex flex-wrap gap-2">
                {((!plot.currentOwnerId && canGenerateDocuments) || (plot.currentOwnerId && canManageOwnership && !transferLimitReached)) ? <Link className="btn-primary justify-center" href={plot.currentOwnerId ? `/app/projects/${plot.projectId}/plots/${plot.id}/transfer` : `/app/projects/${plot.projectId}/ownership/new-allotment?plotId=${plot.id}`}>
                  <GitBranch size={17} />
                  + {plot.currentOwnerId ? "New transfer" : "New allotment"}
                </Link> : null}
                {plot.currentOwnerId && transferLimitReached ? <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Transfer limit reached. Registry is the only next ownership action.</div> : null}
                {plot.currentOwnerId && canManageOwnership ? <Link className="btn-outline justify-center" href={`/app/projects/${plot.projectId}/plots/${plot.id}/registry/update`}><Upload size={17} />{registryDocuments.length ? "+ New registry" : "Upload registry"}</Link> : null}
                {latestAllotmentRecord && canGenerateDocuments ? <Link className="btn-outline justify-center" href={`/app/projects/${plot.projectId}/ownership/new-allotment?plotId=${plot.id}&edit=1`}><Pencil size={17} />Allotment details</Link> : null}
                {registryDocuments.length ? <Link className="btn-outline justify-center" href={`?tab=registry`}><Landmark size={17} />View registry</Link> : null}
                <Link className="btn-outline justify-center" href={`?tab=documents`}><FileText size={17} />Documents</Link>
                <Link className="btn-outline justify-center" href={`?tab=history`}><History size={17} />History</Link>
                {canManageOwnership ? <Link className="btn-outline justify-center" href={`/app/projects/${plot.projectId}/plots/${plot.id}/edit`}><Pencil size={17} />Edit plot details</Link> : null}
              </div>
            </AccordionRow>
          </div>
        </section>
      ) : null}

      {activeTab === "status" ? (
        <section className="mt-4">
          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold">Allotment and transfer letters</h2>
              <p className="mt-1 text-sm text-slate-500">Letters recorded during allotment and every owner transfer.</p>
            </div>
            <OwnershipLetterRows
              documents={ownershipLetters}
              plotId={plot.id}
              latestSignedLetterUploadTargetId={latestSignedLetterUploadTargetId}
              signedByDocumentNo={latestSignedByDocumentNo}
              availableSignedFileIds={availableSignedFileIds}
              canUploadSigned={canSignDocuments}
            />
          </div>
        </section>
      ) : null}

      {activeTab === "ownership" ? (
        <section className="mt-4 grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <OwnerSummary plot={plot} firmName={firm.name} />
            <OwnerHistoryTable records={plot.ownershipRecords} firmName={firm.name} />
            <div className="card p-5">
              <h2 className="mb-4 font-semibold">Owner KYC documents</h2>
              <DocumentGrid files={workspace.ownerFiles} empty="No PAN/Aadhaar/KYC uploaded for current owner." />
            </div>
          </div>
          <aside className="space-y-6">
            <ActionCard title="Ownership actions">
              {!transferLimitReached || !plot.currentOwnerId ? <Link className="btn-primary justify-center" href={plot.currentOwnerId ? `/app/projects/${plot.projectId}/plots/${plot.id}/transfer` : `/app/projects/${plot.projectId}/ownership/new-allotment?plotId=${plot.id}`}>
                <GitBranch size={17} />
                {plot.currentOwnerId ? "New transfer" : "New allotment"}
              </Link> : <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Transfer limit reached. Continue with registry only.</div>}
              <Link className="btn-outline justify-center" href={`/app/projects/${plot.projectId}/plots/${plot.id}/documents/upload`}>
                <Upload size={17} />
                Upload owner documents
              </Link>
            </ActionCard>
          </aside>
        </section>
      ) : null}

      {activeTab === "plot-map" ? (
        <section className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Plot map preview</h2>
              {plotMapFileId ? <Link className="btn-outline h-9 px-3 text-xs" href={`/app/cad/${plotMapFileId}`}>Open full map with zoom</Link> : null}
            </div>
            <PlotGeometryPreview
              geometry={plot.geometry}
              label={plot.code}
              previewCadId={latestPlotCadPreviewId}
              previewFile={latestPlotMapFile ? { id: latestPlotMapFile.id, fileName: latestPlotMapFile.fileName, mimeType: latestPlotMapFile.mimeType } : null}
            />
          </div>
          <aside className="space-y-4">
            <div className="card p-4">
              <h3 className="font-semibold">Upload plot map</h3>
              <p className="mt-1 text-sm text-slate-500">Upload a PNG or PDF for quick preview, or a CAD/PDF drawing for full map workflow.</p>
              <div className="mt-4 space-y-4">
                <FileUploader
                  label="Upload plot map image / PDF"
                  ownerType="Plot"
                  ownerId={plot.id}
                  visibility="TEAM"
                  accept="application/pdf,image/*"
                  metadata={{ categoryKey: "plot-map", documentType: "OTHER", notes: "Plot map upload" }}
                  refreshOnUpload
                />
                <CadUploadForm
                  projects={[{ id: plot.projectId, name: plot.project.name }]}
                  fixedProjectId={plot.projectId}
                  fixedParentType="PLOT"
                  fixedParentId={plot.id}
                  title="Upload plot map CAD / PDF"
                  description="Upload a plot-level drawing and open it in the Map workspace."
                  simple
                />
              </div>
            </div>
            <div className="card p-4">
              <h3 className="font-semibold">Map versions</h3>
              <div className="mt-3 space-y-2">
                {workspace.childCadFiles.map((file) => <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2" key={file.id}><Link className="min-w-0 flex-1 truncate text-sm hover:text-navy-700" href={`/app/cad/${file.id}`}>{file.originalName} · v{file.version}</Link><DeleteCadButton cadFileId={file.id} fileName={file.originalName} published={file.status === "PUBLISHED"} /></div>)}
                {plotMapFiles.map((file) => <div className="rounded-lg bg-slate-50 px-3 py-2" key={file.id}><div className="flex items-center justify-between gap-2"><button className="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-700" type="button">{file.fileName}</button><FileActions fileId={file.id} fileName={file.fileName} /></div><div className="mt-1 text-xs text-slate-500">{new Date(file.createdAt).toLocaleString("en-IN")}</div></div>)}
                {!workspace.childCadFiles.length && !plotMapFiles.length ? <div className="text-sm text-slate-500">No plot map uploaded yet.</div> : null}
              </div>
            </div>
          </aside>
        </section>
      ) : null}

      {activeTab === "documents" ? (
        <section className="mt-4 grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="card p-5">
              <h2 className="mb-4 font-semibold">Signed allotment and transfer letters</h2>
              <DocumentGrid files={signedOwnershipFiles} empty="No signed allotment or transfer letter uploaded yet." />
              {session.role === "SUPER_ADMIN" && (historicalAllotmentRecord || pendingHistoricalFiles.length > 0) ? (
                <HistoricalAllotmentToggle
                  projectId={plot.projectId}
                  plotId={plot.id}
                  sourceFileCount={pendingHistoricalFiles.length}
                  sourceFiles={pendingHistoricalFiles.map((file) => ({
                    id: file.id,
                    fileName: file.fileName,
                    documentType: file.documentType,
                    documentNo: file.documentNo,
                    documentDate: file.documentDate?.toLocaleDateString("en-IN") ?? null,
                  }))}
                  hasCurrentOwner={Boolean(plot.currentOwnerId)}
                  active={Boolean(historicalAllotmentRecord)}
                  historicalRecordId={historicalAllotmentRecord?.id ?? null}
                  latestRecordId={latestOwnershipEvent?.id ?? null}
                />
              ) : null}
            </div>
            <div className="card p-5">
              <h2 className="mb-4 font-semibold">Supporting documents of current allottee</h2>
              <DocumentGrid files={currentAllotteeSupportingFiles} empty="No supporting documents uploaded for the current allottee yet." />
            </div>
            <div className="card p-5">
              <h2 className="mb-4 font-semibold">Old documents</h2>
              <DocumentGrid files={oldDocumentFiles} empty="No old allotment or transfer letter uploaded yet." showShare />
            </div>
            <div className="card p-5">
              <h2 className="mb-4 font-semibold">Generated letters</h2>
              <div className="space-y-3">
                {workspace.generatedDocuments.map((document) => {
                  const signedByNumber = document.number ? latestSignedByDocumentNo.get(document.number) : null;
                  const signedFileAssetId = document.signedFileAssetId && availableSignedFileIds.has(document.signedFileAssetId)
                    ? document.signedFileAssetId
                    : signedByNumber?.id ?? null;
                  const latestVisibleFileId = signedFileAssetId ?? document.fileAssetId;
                  return (
                    <div key={document.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">{document.number ?? document.type}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {document.status} · {document.createdAt.toLocaleDateString("en-IN")}
                            {signedFileAssetId ? <span className="ml-1 text-emerald-600">· Signed copy available</span> : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {canGenerateDocuments ? (
                            isHistoricalAllotment(document.data) && document.type.includes("allotment")
                              ? <Link className="btn-outline h-8 px-3 text-xs" href={`/app/projects/${plot.projectId}/ownership/new-allotment?plotId=${plot.id}&edit=1`}>Edit details</Link>
                              : !isHistoricalAllotment(document.data)
                                ? <Link className="btn-outline h-8 px-3 text-xs" href={`/app/projects/${plot.projectId}/plots/${plot.id}/letters/${document.id}`}>Edit</Link>
                                : null
                          ) : null}
                          {latestVisibleFileId ? (
                            <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/files/${latestVisibleFileId}/download?disposition=inline&proxy=1`} target="_blank" rel="noreferrer">
                              {signedFileAssetId ? "View signed letter" : "View letter"}
                            </a>
                          ) : null}
                          {signedFileAssetId && document.fileAssetId ? (
                            <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/files/${document.fileAssetId}/download`}>Download generated</a>
                          ) : null}
                          {canRestoreRecords ? <DeleteDocumentButton documentId={document.id} documentName={document.number ?? document.type} /> : null}
                          {canApproveDocuments ? <DocumentApprovalButtons documentId={document.id} status={document.status} fileAssetId={document.fileAssetId} /> : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!workspace.generatedDocuments.length ? <Empty label="No letters generated yet." /> : null}
              </div>
            </div>
          </div>
          <aside className="space-y-6">
            <ActionCard title="Document actions">
              <Link
                className="btn-primary justify-center"
                href={plot.currentOwnerId
                  ? `/app/projects/${plot.projectId}/plots/${plot.id}/transfer`
                  : `/app/projects/${plot.projectId}/ownership/new-allotment?plotId=${plot.id}`}
              >
                <FileText size={17} />
                {plot.currentOwnerId ? "Generate transfer letter" : "Generate allotment letter"}
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
              {!transferLimitReached ? <Link className="btn-primary justify-center" href={`/app/projects/${plot.projectId}/plots/${plot.id}/transfer`}>
                <GitBranch size={17} />
                New transfer
              </Link> : <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Transfer limit reached. Registry is still available.</div>}
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
                {!plot.checklistItems.length ? <Empty label="Upload plot Map or add checklist zones to track plot development." /> : null}
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
        <section className="mt-4 space-y-6">
          <DocumentHistoryTable items={documentState?.history ?? []} projectId={plot.projectId} plotId={plot.id} />
          <OwnershipEventHistory
            plotId={plot.id}
            canCancel={session.role === "SUPER_ADMIN"}
            records={ownershipEventRecords.map((record) => ({
              id: record.id,
              kind: record.kind,
              ownerName: record.owner?.name ?? "Unknown owner",
              effectiveAt: record.effectiveAt,
              actorName: record.createdBy?.name ?? record.createdBy?.email ?? null,
              notes: record.notes,
            }))}
          />
        </section>
      ) : null}
    </main>
  );
}

function DocumentHistoryTable({
  items,
  projectId,
  plotId,
}: {
  items: NonNullable<Awaited<ReturnType<typeof getPlotWorkspace>>["documentState"]>["history"];
  projectId: string;
  plotId: string;
}) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <FileText size={18} />
          <h2 className="font-semibold">Document history</h2>
          <span className="chip bg-slate-100 text-slate-700">{items.length}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">All allotment, transfer, registry, and supporting documents remain available in effective-date order.</p>
      </div>
      {items.length ? (
        <div className="max-h-[36rem] overflow-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)]">
              <tr>
                <th className="px-5 py-3">Document</th>
                <th className="px-5 py-3">Owner at the time</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Document date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Version</th>
                <th className="px-5 py-3 text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const href = item.fileAssetId
                  ? `/api/v1/files/${item.fileAssetId}/download?disposition=inline&proxy=1`
                  : item.generatedDocumentId
                    ? `/app/projects/${projectId}/plots/${plotId}/letters/${item.generatedDocumentId}`
                    : null;
                return (
                  <tr key={item.id} className={item.latest ? "bg-emerald-50/50" : "hover:bg-slate-50/60"}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 font-medium text-navy-950">
                        {item.label}
                        {item.latest ? <span className="chip bg-emerald-100 text-emerald-800">Latest</span> : null}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{item.uploadedBy ? `Uploaded by ${item.uploadedBy}` : "Recorded in ownership workflow"}</div>
                    </td>
                    <td className="px-5 py-3">{item.ownerName ?? "-"}</td>
                    <td className="px-5 py-3">{item.number ?? "-"}</td>
                    <td className="whitespace-nowrap px-5 py-3">{item.documentDate.toLocaleDateString("en-IN")}</td>
                    <td className="px-5 py-3">
                      <span className={`chip ${item.missing ? "bg-amber-50 text-amber-800" : item.signed ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                        {item.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3">{item.version || "-"}</td>
                    <td className="px-5 py-3 text-right">
                      {href ? (
                        <a className="btn-outline h-8 px-3 text-xs" href={href} target={item.fileAssetId ? "_blank" : undefined} rel={item.fileAssetId ? "noreferrer" : undefined}>
                          <Eye size={14} /> View
                        </a>
                      ) : <span className="text-xs text-amber-700">Document unavailable</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <div className="p-5 text-sm text-slate-500">No ownership or registry documents have been recorded.</div>}
    </div>
  );
}

function AccordionRow({
  label,
  value,
  children,
  open = false,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details className="group" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
        <div className="flex min-w-0 items-center gap-3">
          <span className="w-32 shrink-0 text-sm font-semibold text-slate-600">{label}</span>
          <span className="truncate text-sm font-medium text-navy-950">{value}</span>
        </div>
        <ChevronDown className="shrink-0 text-slate-400 transition group-open:rotate-180" size={18} />
      </summary>
      <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5">{children}</div>
    </details>
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

function OwnerSummary({ plot, firmName }: { plot: Awaited<ReturnType<typeof getPlotWorkspace>>["plot"]; firmName: string }) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 font-semibold">Current ownership</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Info label="Owner" value={plot.currentOwner?.name ?? firmName} />
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

function OwnerHistoryTable({
  records,
  firmName,
}: {
  records: Awaited<ReturnType<typeof getPlotWorkspace>>["plot"]["ownershipRecords"];
  firmName: string;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold">Owner history</h2>
        <p className="mt-1 text-sm text-slate-500">Every allotment and transfer recorded for this plot.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Owner</th>
              <th className="px-5 py-3">Record</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Address</th>
              <th className="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record) => (
              <tr key={record.id}>
                <td className="px-5 py-3 font-medium">{record.owner?.name ?? firmName}</td>
                <td className="px-5 py-3">{record.kind.replaceAll("_", " ")}</td>
                <td className="px-5 py-3">{record.owner?.phone ?? "-"}</td>
                <td className="px-5 py-3">{record.owner?.email ?? "-"}</td>
                <td className="max-w-64 px-5 py-3">{record.owner?.address ?? "-"}</td>
                <td className="whitespace-nowrap px-5 py-3">{record.effectiveAt.toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!records.length ? <div className="p-5"><Empty label="No owner history yet." /></div> : null}
    </div>
  );
}

function OwnerHistoryRows({
  records,
  firmName,
}: {
  records: Awaited<ReturnType<typeof getPlotWorkspace>>["plot"]["ownershipRecords"];
  firmName: string;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
        <tr><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Record</th><th className="px-4 py-3">Done by</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Date</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {records.map((record) => (
          <tr key={record.id}>
            <td className="px-4 py-3 font-medium">{record.owner?.name ?? firmName}</td>
            <td className="px-4 py-3">{record.kind.replaceAll("_", " ")}</td>
            <td className="px-4 py-3">{record.createdBy?.name ?? "-"}</td>
            <td className="px-4 py-3">{record.owner?.phone ?? "-"}</td>
            <td className="px-4 py-3">{record.owner?.email ?? "-"}</td>
            <td className="whitespace-nowrap px-4 py-3">{record.effectiveAt.toLocaleDateString("en-IN")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OwnershipLetterRows({
  documents,
  plotId,
  latestSignedLetterUploadTargetId,
  signedByDocumentNo,
  availableSignedFileIds,
  canUploadSigned,
}: {
  documents: Awaited<ReturnType<typeof getPlotWorkspace>>["generatedDocuments"];
  plotId: string;
  latestSignedLetterUploadTargetId: string | null;
  signedByDocumentNo: Map<string, Awaited<ReturnType<typeof getPlotWorkspace>>["plotFiles"][number]>;
  availableSignedFileIds: Set<string>;
  canUploadSigned: boolean;
}) {
  return (
    <>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
          <tr><th className="px-4 py-3">Letter</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Download</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {documents.map((document) => {
            const legacySigned = document.number ? signedByDocumentNo.get(document.number) : null;
            const signedFileAssetId = document.signedFileAssetId && availableSignedFileIds.has(document.signedFileAssetId)
              ? document.signedFileAssetId
              : legacySigned?.id ?? null;
            return (
              <tr key={document.id}>
                <td className="px-4 py-3 font-medium">{document.number ?? document.type.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">{document.status.replaceAll("_", " ")}</td>
                <td className="whitespace-nowrap px-4 py-3">{document.createdAt.toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {document.fileAssetId ? (
                      <a className="btn-outline h-8 w-8 px-0 text-xs" href={`/api/v1/files/${document.fileAssetId}/download`} title="Download generated PDF" aria-label="Download generated PDF">
                        <Download size={14} />
                      </a>
                    ) : <span className="text-slate-500">PDF not generated</span>}
                    {signedFileAssetId ? (
                      <a className="btn-outline h-8 w-8 px-0 text-xs" href={`/api/v1/files/${signedFileAssetId}/download?disposition=inline&proxy=1`} target="_blank" rel="noreferrer" title="View signed copy" aria-label="View signed copy">
                        <Eye size={14} />
                      </a>
                    ) : null}
                    {canUploadSigned && document.id === latestSignedLetterUploadTargetId ? (
                      <SignedLetterUpload
                        documentId={document.id}
                        plotId={plotId}
                        documentType={document.type}
                        documentNo={document.number}
                        documentDate={document.createdAt.toISOString()}
                        replacing={Boolean(signedFileAssetId)}
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!documents.length ? <div className="bg-white p-4 text-sm text-slate-500">No allotment or transfer letters yet.</div> : null}
    </>
  );
}

function uniqueFiles<T extends { id: string }>(files: T[]) {
  const seen = new Set<string>();
  return files.filter((file) => {
    if (seen.has(file.id)) return false;
    seen.add(file.id);
    return true;
  });
}

function isHistoricalAllotment(value: unknown) {
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && (value as Record<string, unknown>).historicalImport === true,
  );
}

function DocumentGrid({ files, empty, showShare = false }: { files: Awaited<ReturnType<typeof getPlotWorkspace>>["plotFiles"]; empty: string; showShare?: boolean }) {
  return (
    <div className="space-y-3">
      {showShare && files.length ? <MultiFileShare files={files.map((file) => ({ id: file.id, fileName: file.fileName }))} /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {files.map((file) => (
          <div key={file.id} className="rounded-lg border border-slate-200 p-3 text-sm">
            <div className="font-medium">
              {file.categoryKey === "signed-allotment-letter"
                ? "Signed version of allotment letter"
                : file.categoryKey === "signed-transfer-letter"
                  ? "Signed version of transfer letter"
                  : file.documentType?.replaceAll("_", " ") ?? "Document"}
            </div>
            <div className="mt-1 truncate text-xs text-slate-500">{file.fileName}</div>
            <div className="mt-2 text-xs text-slate-500">
              {file.documentNo ?? "No reference"} · {(file.documentDate ?? file.createdAt).toLocaleDateString("en-IN")} · {file.visibility.replaceAll("_", " ")}
            </div>
            {file.notes ? <div className="mt-2 text-xs text-slate-500">{file.notes}</div> : null}
            <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
              <a className="btn-outline h-9 justify-center px-3 text-xs sm:h-8" href={`/api/v1/files/${file.id}/download`}>Download</a>
              {showShare ? <FileShareActions fileId={file.id} fileName={file.fileName} /> : null}
              <DeleteFileButton fileId={file.id} fileName={file.fileName} />
            </div>
          </div>
        ))}
        {!files.length ? <Empty label={empty} /> : null}
      </div>
    </div>
  );
}


function PlotGeometryPreview({
  geometry,
  label,
  previewCadId,
  previewFile,
}: {
  geometry: unknown;
  label: string;
  previewCadId?: string | null;
  previewFile?: { id: string; fileName: string; mimeType: string } | null;
}) {
  if (previewCadId) {
    return <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"><img className="block h-[32rem] w-full object-contain bg-slate-950" src={`/api/v1/cad/${previewCadId}/preview`} alt={`${label} map preview`} /></div>;
  }
  if (previewFile) {
    return <div className="overflow-hidden rounded-lg border border-slate-200 bg-white"><FilePreview id={previewFile.id} fileName={previewFile.fileName} mimeType={previewFile.mimeType} /></div>;
  }
  const points = extractPoints(geometry);
  if (!points.length) {
    return <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No Map geometry attached to this plot yet.</div>;
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

function boundaryValue(boundaries: unknown, direction: string) {
  if (!boundaries || typeof boundaries !== "object" || Array.isArray(boundaries)) return "-";
  const value = (boundaries as Record<string, unknown>)[direction];
  return typeof value === "string" && value.trim() ? value : "-";
}

async function acceptedTransferCountForPlot(tenantId: string, plotId: string) {
  const records = await prisma.ownershipRecord.findMany({
    where: { tenantId, plotId, kind: "TRANSFER", cancelledAt: null },
    select: { documentId: true },
  });
  const documentIds = records.map((record) => record.documentId).filter(Boolean) as string[];
  if (!documentIds.length) return 0;
  return prisma.generatedDocument.count({
    where: {
      tenantId,
      id: { in: documentIds },
      archivedAt: null,
      status: { in: ["APPROVED", "ISSUED", "SENT_FOR_SIGNATURE", "SIGNED"] },
    },
  });
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">{label}</div>;
}
