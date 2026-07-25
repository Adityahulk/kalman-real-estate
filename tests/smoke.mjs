import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  const json = text && response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : {};
  return { response, json, cookie: response.headers.get("set-cookie") };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createAndApproveOwnershipLetter({ cookie, plotId, type, data = {} }) {
  const draft = await request("/api/v1/documents/drafts", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ type, recordType: "Plot", recordId: plotId, data }),
  });
  assert(draft.response.status === 201, `${type} draft creation failed`);
  const documentId = draft.json.data.document.id;
  const render = await request(`/api/v1/documents/${documentId}/render`, {
    method: "POST",
    headers: { cookie },
  });
  assert(render.response.status === 200, `${type} render failed`);
  const submit = await request(`/api/v1/documents/${documentId}/submit`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ notes: "Smoke workflow submission" }),
  });
  assert(submit.response.status === 200, `${type} submission failed`);
  const approve = await request(`/api/v1/documents/${documentId}/approve`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ status: "APPROVED", notes: "Smoke workflow approval" }),
  });
  assert(approve.response.status === 200, `${type} approval failed`);
  return approve.json.data;
}

const login = await request("/api/v1/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "owner@saldhaland.example", password: "Kalman@12345" }),
});
assert(login.response.status === 201, "builder login failed");
const cookie = login.cookie?.split(";")[0];
assert(cookie, "session cookie missing");

const me = await request("/api/v1/auth/me", { headers: { cookie } });
assert(me.json.data?.tenant?.name === "Saldha Land Developers", "tenant session failed");

const unauthPlatform = await request("/api/v1/platform/overview");
assert(unauthPlatform.response.status === 401, "protected API allowed unauthenticated access");

const plot = await prisma.plot.findFirstOrThrow({ where: { code: "A-101" } });
const project = await prisma.project.findFirstOrThrow({ where: { id: plot.projectId } });
const tenantId = project.tenantId;
const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;

const projectReport = await fetch(`${baseUrl}/api/v1/projects/${project.id}/report`, { headers: { cookie } });
assert(projectReport.status === 200, "project report download failed");
const projectReportText = await projectReport.text();
assert(projectReportText.includes("Plot Number") && projectReportText.includes("Owner Name / Company Status"), "project report is missing ownership columns");

const projectPatch = await request(`/api/v1/projects/${project.id}`, {
  method: "PATCH",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ whatsappShareText: `Smoke share text ${stamp}`, progressPct: project.progressPct }),
});
assert(projectPatch.response.status === 200, "project share text update failed");
assert(projectPatch.json.data?.whatsappShareText?.includes("Smoke share text"), "project share text was not saved");

const cadUploadFlow = await request("/api/v1/cad/upload", {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({
    projectId: project.id,
    parentType: "PROJECT",
    parentId: project.id,
    format: "DXF",
    originalName: `upload-flow-${stamp}.dxf`,
    contentType: "application/dxf",
  }),
});
assert(cadUploadFlow.response.status === 201, "CAD upload record creation failed");
if (process.env.FILE_STORAGE_DRIVER === "s3_with_local_fallback" && !process.env.S3_ACCESS_KEY_ID && !process.env.AWS_ACCESS_KEY_ID) {
  assert(cadUploadFlow.json.data.upload.primary.provider === "LOCAL", "CAD upload did not select local fallback without S3 credentials");
  assert(cadUploadFlow.json.data.upload.primary.storageKey.startsWith(`local/${tenantId}/cad/`), "CAD local fallback key is not tenant scoped");
}
const cadUploadTarget = typeof cadUploadFlow.json.data.upload === "string"
  ? { url: cadUploadFlow.json.data.upload, storageProvider: "S3", storageKey: cadUploadFlow.json.data.cadFile.storageKey }
  : cadUploadFlow.json.data.upload.primary;
const cadFallbackTarget = typeof cadUploadFlow.json.data.upload === "string" ? null : cadUploadFlow.json.data.upload.fallback;
let usedCadTarget = cadUploadTarget;
let cadPut = await fetch(new URL(cadUploadTarget.url, baseUrl), {
  method: "PUT",
  headers: { cookie, "content-type": "application/dxf" },
  body: "0\nEOF\n",
}).catch(() => ({ status: 0 }));
if (cadPut.status !== 200 && cadFallbackTarget) {
  usedCadTarget = cadFallbackTarget;
  cadPut = await fetch(new URL(cadFallbackTarget.url, baseUrl), {
    method: "PUT",
    headers: { cookie, "content-type": "application/dxf" },
    body: "0\nEOF\n",
  });
}
assert(cadPut.status === 200, "CAD binary upload failed");
const cadComplete = await request(`/api/v1/cad/${cadUploadFlow.json.data.cadFile.id}/upload-complete`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({
    storageProvider: usedCadTarget.provider ?? usedCadTarget.storageProvider,
    storageKey: usedCadTarget.storageKey,
  }),
});
assert(cadComplete.response.status === 200, "CAD upload completion failed");
const cadQueue = await request(`/api/v1/cad/${cadUploadFlow.json.data.cadFile.id}/process`, {
  method: "POST",
  headers: { cookie },
});
assert(cadQueue.response.status === 200, "CAD process queue failed");
assert(cadQueue.json.data?.queue?.reason === "browser_extraction_required", "DXF did not select browser extraction");
const cadSource = await fetch(`${baseUrl}/api/v1/cad/${cadUploadFlow.json.data.cadFile.id}/source`, {
  headers: { cookie },
});
assert(cadSource.status === 200, "authorized admin could not load the raw CAD source");
assert(/^[a-f0-9]{64}$/i.test(cadSource.headers.get("x-cad-source-sha256") ?? ""), "CAD source checksum is missing");
const cadDelete = await request(`/api/v1/cad/${cadUploadFlow.json.data.cadFile.id}`, {
  method: "DELETE",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ reason: "Smoke test cleanup" }),
});
assert(cadDelete.response.status === 200, "unpublished CAD deletion failed");
assert(await prisma.cadFile.findUnique({ where: { id: cadUploadFlow.json.data.cadFile.id } }) === null, "deleted CAD record still exists");
if ((usedCadTarget.provider ?? usedCadTarget.storageProvider) === "LOCAL") {
  const localRoot = process.env.LOCAL_STORAGE_ROOT ?? join(process.cwd(), "storage");
  const localPath = join(localRoot, usedCadTarget.storageKey.replace(/^local\//, ""));
  assert(!existsSync(localPath), "deleted CAD binary still exists in local storage");
}

const doc = await request("/api/v1/documents/generate", {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({
    type: "smoke_letter",
    recordType: "Plot",
    recordId: plot.id,
    data: { plotCode: plot.code },
  }),
});
assert(doc.response.status === 201, "document generation failed");
assert(doc.json.data?.document?.fileAssetId, "document PDF file missing");
const generatedLetterFile = await prisma.fileAsset.findUniqueOrThrow({ where: { id: doc.json.data.document.fileAssetId } });
assert(generatedLetterFile.documentType === "ALLOTMENT_LETTER", "generated allotment letter was not typed");

const draft = await request("/api/v1/documents/drafts", {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({
    type: "allotment_letter",
    recordType: "Plot",
    recordId: plot.id,
  }),
});
assert(draft.response.status === 201, "letter draft creation failed");
assert(draft.json.data?.document?.editableHtml?.includes(plot.code), "letter draft did not include plot data");
const draftId = draft.json.data.document.id;
const draftSave = await request(`/api/v1/documents/${draftId}/draft`, {
  method: "PATCH",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ editableHtml: `<h1>Smoke Allotment</h1><p>Plot ${plot.code} editable draft for smoke verification.</p>` }),
});
assert(draftSave.response.status === 200, "letter draft save failed");
const draftRender = await request(`/api/v1/documents/${draftId}/render`, {
  method: "POST",
  headers: { cookie },
});
assert(draftRender.response.status === 200, "letter draft render failed");
assert(draftRender.json.data?.document?.fileAssetId, "rendered letter file missing");

const download = await fetch(`${baseUrl}/api/v1/files/${doc.json.data.document.fileAssetId}/download`, {
  headers: { cookie },
});
assert(download.status === 200, "document download failed");
assert(download.headers.get("content-type")?.includes("pdf"), "download is not a PDF");

// The development database is intentionally long-lived and A-101 may have been transferred during
// manual testing. Temporarily attach it to the seeded owner account so this check remains stable,
// then restore the exact plot state before continuing.
const owner = await prisma.owner.findFirstOrThrow({ where: { tenantId, email: "amandeep@example.com" } });
const originalPlotAccess = await prisma.plot.findUniqueOrThrow({
  where: { id: plot.id },
  select: { currentOwnerId: true, ownerVisible: true },
});
await prisma.plot.update({
  where: { id: plot.id },
  data: { currentOwnerId: owner.id, ownerVisible: true },
});

const ownerLogin = await request("/api/v1/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "amandeep@example.com", password: "Kalman@12345" }),
});
const ownerCookie = ownerLogin.cookie?.split(";")[0];
assert(ownerCookie, "owner session cookie missing");
const blockedOwnerDownload = await fetch(`${baseUrl}/api/v1/files/${doc.json.data.document.fileAssetId}/download`, {
  headers: { cookie: ownerCookie },
});
assert(blockedOwnerDownload.status === 403, "owner downloaded unapproved document");

const prematureApproval = await request(`/api/v1/documents/${doc.json.data.document.id}/approve`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ status: "APPROVED", notes: "Must be submitted first" }),
});
assert(prematureApproval.response.status === 400, "generated document bypassed submission state");

const submit = await request(`/api/v1/documents/${doc.json.data.document.id}/submit`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ notes: "Smoke test submission" }),
});
assert(submit.response.status === 200, "document submission failed");
assert(submit.json.data?.status === "SUBMITTED", "document did not enter submitted state");

const approve = await request(`/api/v1/documents/${doc.json.data.document.id}/approve`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ status: "APPROVED", notes: "Smoke test approval" }),
});
assert(approve.response.status === 200, "document approval failed");
assert(approve.json.data?.status === "APPROVED", "approved document entered the wrong state");
const approvedOwnerDownload = await fetch(`${baseUrl}/api/v1/files/${doc.json.data.document.fileAssetId}/download`, {
  headers: { cookie: ownerCookie },
});
assert(approvedOwnerDownload.status === 200, "owner could not download approved document");

const localPdfBytes = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
function writeLocalSmokeFile(storageKey) {
  const path = join(process.cwd(), "storage", storageKey.replace(/^local\//, ""));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, localPdfBytes);
}

const registryDocKey = `local/smoke/registry-${stamp}.pdf`;
writeLocalSmokeFile(registryDocKey);
const registryDoc = await prisma.fileAsset.create({
  data: {
    tenantId,
    storageKey: registryDocKey,
    fileName: `registry-${stamp}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: localPdfBytes.length,
    visibility: "OWNER_VISIBLE",
    documentType: "REGISTRY_RECEIPT",
    documentNo: `REGDOC-${stamp}`,
    ownerType: "Plot",
    ownerId: plot.id,
    uploadedById: me.json.data.id,
  },
});
const ownerRegistryDownload = await fetch(`${baseUrl}/api/v1/files/${registryDoc.id}/download`, {
  headers: { cookie: ownerCookie },
});
assert(ownerRegistryDownload.status === 200, "owner could not download owner-visible registry receipt");
const deleteRegistryDoc = await request(`/api/v1/files/${registryDoc.id}`, {
  method: "DELETE",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ reason: "Smoke test deletion" }),
});
assert(deleteRegistryDoc.response.status === 200, "document delete failed");
const deletedRegistryDownload = await fetch(`${baseUrl}/api/v1/files/${registryDoc.id}/download`, {
  headers: { cookie: ownerCookie },
});
assert(deletedRegistryDownload.status === 404, "deleted document was still downloadable");
const deleteAudit = await prisma.auditEvent.findFirst({
  where: { tenantId, entityType: "FileAsset", entityId: registryDoc.id, action: "DELETE" },
});
assert(deleteAudit, "document delete audit event missing");

const panKey = `local/smoke/pan-${stamp}.pdf`;
writeLocalSmokeFile(panKey);
const panDoc = await prisma.fileAsset.create({
  data: {
    tenantId,
    storageKey: panKey,
    fileName: `pan-${stamp}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: localPdfBytes.length,
    visibility: "TEAM",
    documentType: "PAN_CARD",
    documentNo: `PAN-${stamp}`,
    ownerType: "Owner",
    ownerId: owner.id,
    uploadedById: me.json.data.id,
  },
});
const adminPanDownload = await fetch(`${baseUrl}/api/v1/files/${panDoc.id}/download`, {
  headers: { cookie },
});
assert(adminPanDownload.status === 200, "admin could not download owner PAN document");
const ownerPanDownload = await fetch(`${baseUrl}/api/v1/files/${panDoc.id}/download`, {
  headers: { cookie: ownerCookie },
});
assert(ownerPanDownload.status === 403, "owner could download internal PAN document");
await prisma.plot.update({
  where: { id: plot.id },
  data: originalPlotAccess,
});

const vendor = await request("/api/v1/finance/vendors", {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ name: `Smoke Vendor ${Date.now()}`, type: "Material" }),
});
assert(vendor.response.status === 201, "vendor creation failed");

const manualPlot = await request(`/api/v1/projects/${project.id}/plots`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({
    code: `SM-${stamp}`,
    label: `Smoke ${stamp}`,
    areaSqft: 1200,
    priceInr: 2500000,
    notes: "Smoke manual non-CAD plot",
  }),
});
assert(manualPlot.response.status === 201, "manual plot creation failed");
const smokePlot = manualPlot.json.data.plot;
const inventoryRecord = await prisma.ownershipRecord.findFirst({
  where: { tenantId, plotId: smokePlot.id, kind: "COMPANY_INVENTORY" },
});
assert(inventoryRecord, "manual plot did not create company inventory history");

const manualZone = await request(`/api/v1/plots/${smokePlot.id}/checklist-items`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ label: `Smoke bathroom ${stamp}`, category: "Plumbing", progressPct: 10 }),
});
assert(manualZone.response.status === 201, "manual plot subpart creation failed");

const newOwner = await request("/api/v1/ownership/owners", {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ type: "INDIVIDUAL", name: `Smoke Buyer ${stamp}`, email: `buyer-${stamp}@example.com` }),
});
assert(newOwner.response.status === 201, "owner creation failed");

const allot = await request(`/api/v1/ownership/plots/${smokePlot.id}/allot`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ ownerId: newOwner.json.data.id, amountInr: 2500000, sharePct: 100 }),
});
assert(allot.response.status === 200, "plot allotment failed");
const pendingAllotmentPlot = await prisma.plot.findUniqueOrThrow({ where: { id: smokePlot.id } });
assert(pendingAllotmentPlot.status === "COMPANY_OWNED", "unapproved allotment changed plot ownership");
await createAndApproveOwnershipLetter({
  cookie,
  plotId: smokePlot.id,
  type: "allotment_letter",
  data: { ownerName: newOwner.json.data.name, plotCode: smokePlot.code },
});
const approvedAllotmentPlot = await prisma.plot.findUniqueOrThrow({ where: { id: smokePlot.id } });
assert(approvedAllotmentPlot.currentOwnerId === newOwner.json.data.id, "approved allotment did not update current owner");

const buyer = await request("/api/v1/ownership/owners", {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ type: "INDIVIDUAL", name: `Smoke Transferee ${stamp}`, email: `transferee-${stamp}@example.com` }),
});
assert(buyer.response.status === 201, "transfer buyer creation failed");

const transfer = await request(`/api/v1/ownership/plots/${smokePlot.id}/transfer`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ buyerOwnerId: buyer.json.data.id, amountInr: 2700000 }),
});
assert(transfer.response.status === 200, "plot transfer failed");
const pendingTransferPlot = await prisma.plot.findUniqueOrThrow({ where: { id: smokePlot.id } });
assert(pendingTransferPlot.currentOwnerId === newOwner.json.data.id, "unapproved transfer changed plot ownership");
await createAndApproveOwnershipLetter({
  cookie,
  plotId: smokePlot.id,
  type: "transfer_letter",
  data: { ownerName: buyer.json.data.name, plotCode: smokePlot.code },
});
const approvedTransferPlot = await prisma.plot.findUniqueOrThrow({ where: { id: smokePlot.id } });
assert(approvedTransferPlot.currentOwnerId === buyer.json.data.id, "approved transfer did not update current owner");

const registry = await request(`/api/v1/ownership/plots/${smokePlot.id}/registry`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ status: "REGISTERED", registryNo: `REG-${stamp}` }),
});
assert(registry.response.status === 200, "registry update failed");

const audit = await request(`/api/v1/ownership/plots/${smokePlot.id}/audit`, { headers: { cookie } });
assert(audit.response.status === 200 && audit.json.data.ownership.length >= 2, "plot audit history failed");

const manualSiteAsset = await request(`/api/v1/projects/${project.id}/site-assets`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ name: `Smoke Road ${stamp}`, type: "ROAD", status: "PLANNED" }),
});
assert(manualSiteAsset.response.status === 201, "manual site asset creation failed");
const siteAsset = manualSiteAsset.json.data;
const siteProgress = await request(`/api/v1/development/site-assets/${siteAsset.id}/progress`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ progressPct: 55, areaDone: 55, summary: "Smoke progress update", visibleToOwner: false }),
});
assert(siteProgress.response.status === 200, "site progress update failed");

const progressPhoto = await prisma.fileAsset.create({
  data: {
    tenantId,
    storageKey: `local/smoke/${stamp}.jpg`,
    fileName: `smoke-${stamp}.jpg`,
    mimeType: "image/jpeg",
    sizeBytes: 1,
    visibility: "OWNER_VISIBLE",
    ownerType: "ProgressUpdate",
    ownerId: siteProgress.json.data.update.id,
  },
});
const attachPhoto = await request(`/api/v1/development/progress/${siteProgress.json.data.update.id}/photos`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ fileAssetIds: [progressPhoto.id], visibleToOwner: true }),
});
assert(attachPhoto.response.status === 200, "progress photo attach failed");

const issue = await request("/api/v1/development/issues", {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ parentType: "SiteAsset", parentId: siteAsset.id, title: `Smoke issue ${stamp}`, severity: "MEDIUM" }),
});
assert(issue.response.status === 201, "issue creation failed");

const marketingTask = await request("/api/v1/marketing/tasks", {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ projectId: project.id, title: `Smoke campaign ${stamp}`, brief: "Smoke marketing brief" }),
});
assert(marketingTask.response.status === 201, "marketing task creation failed");
const mediaFile = await prisma.fileAsset.create({
  data: {
    tenantId,
    storageKey: `local/smoke/${stamp}.mp4`,
    fileName: `smoke-${stamp}.mp4`,
    mimeType: "video/mp4",
    sizeBytes: 1,
    visibility: "TEAM",
    ownerType: "MarketingTask",
    ownerId: marketingTask.json.data.id,
  },
});
const media = await request(`/api/v1/marketing/tasks/${marketingTask.json.data.id}/media`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ fileAssetId: mediaFile.id, kind: "FINAL" }),
});
assert(media.response.status === 201, "marketing media attach failed");
const marketingStatus = await prisma.marketingTask.findUniqueOrThrow({ where: { id: marketingTask.json.data.id } });
assert(marketingStatus.status === "DRAFT_UPLOADED", "final media bypassed marketing approval");
const marketingApprove = await request(`/api/v1/marketing/tasks/${marketingTask.json.data.id}/approve`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ status: "APPROVED", notes: "Smoke approval" }),
});
assert(marketingApprove.response.status === 200, "marketing approval failed");

const po = await request("/api/v1/finance/purchase-orders", {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ projectId: project.id, vendorId: vendor.json.data.id, number: `PO-${stamp}`, totalInr: 10000, lineItems: [{ item: "cement", qty: 10 }] }),
});
assert(po.response.status === 201, "purchase order creation failed");

const invoice = await request("/api/v1/finance/invoices", {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ projectId: project.id, vendorId: vendor.json.data.id, number: `INV-${stamp}`, totalInr: 10000 }),
});
assert(invoice.response.status === 201, "invoice creation failed");
const payment = await request(`/api/v1/finance/invoices/${invoice.json.data.id}/payments`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ amountInr: 4000, mode: "BANK", reference: `PAY-${stamp}` }),
});
assert(payment.response.status === 200, "invoice payment failed");
const overpay = await request(`/api/v1/finance/invoices/${invoice.json.data.id}/payments`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ amountInr: 7000, mode: "BANK", reference: `OVER-${stamp}` }),
});
assert(overpay.response.status === 400, "invoice overpayment was allowed");

const usedCadPlotCodes = new Set((await prisma.plot.findMany({
  where: { tenantId, projectId: project.id, archivedAt: null },
  select: { code: true },
})).map((item) => item.code.toUpperCase()));
let smokeCadPlotCode;
for (let number = 1; number <= 9999; number += 1) {
  const candidate = `S${number}`;
  if (!usedCadPlotCodes.has(candidate)) {
    smokeCadPlotCode = candidate;
    break;
  }
}
assert(smokeCadPlotCode, "could not allocate a valid CAD smoke plot code");

const cadFile = await prisma.cadFile.create({
  data: {
    tenantId,
    projectId: project.id,
    parentType: "PROJECT",
    parentId: project.id,
    format: "DXF",
    status: "REVIEW_REQUIRED",
    originalName: `smoke-${stamp}.dxf`,
    storageKey: `local/smoke/${stamp}.dxf`,
    version: 1,
    uploadedById: me.json.data.id,
  },
});
await prisma.cadAnalysis.create({
  data: {
    tenantId,
    cadFileId: cadFile.id,
    discipline: "SITE_LAYOUT",
    sourceKind: "DXF",
    confirmedRegion: { x: 0, y: 0, width: 1, height: 1 },
    expectedCounts: { total: 1 },
    scaleCalibration: { drawingUnitsPerFoot: 1, source: "smoke-test" },
    setupConfirmedAt: new Date(),
    calibrationConfirmedAt: new Date(),
  },
});
const scene = await prisma.cadScene.create({
  data: {
    tenantId,
    cadFileId: cadFile.id,
    scope: "PROJECT",
    parentId: project.id,
    bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    sceneJson: { source: "smoke" },
  },
});
await prisma.cadEntity.createMany({
  data: [
    {
      tenantId,
      sceneId: scene.id,
      type: "PLOT",
      label: smokeCadPlotCode,
      confidence: 0.96,
      geometry: { type: "polygon", points: [[0, 0], [20, 0], [20, 20], [0, 20]], closed: true },
      measurements: { areaSqft: 400 },
      status: "CONFIRMED",
    },
    {
      tenantId,
      sceneId: scene.id,
      type: "ROAD",
      label: `Road-${stamp}`,
      confidence: 0.9,
      geometry: { type: "line", points: [[0, 30], [80, 30]] },
      measurements: { length: 80 },
      status: "CONFIRMED",
    },
  ],
});
const cadPublish = await request(`/api/v1/cad/${cadFile.id}/publish`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({}),
});
assert(cadPublish.response.status === 200, "site CAD publish failed");
assert(cadPublish.json.data.plots.length === 1 && cadPublish.json.data.assets.length === 1, "site CAD did not create plot and asset");
const cadInventoryRecord = await prisma.ownershipRecord.findFirst({
  where: { tenantId, plotId: cadPublish.json.data.plots[0].id, kind: "COMPANY_INVENTORY" },
});
assert(cadInventoryRecord, "CAD-published plot did not create company inventory history");
const republish = await request(`/api/v1/cad/${cadFile.id}/publish`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({}),
});
assert(republish.response.status === 400, "CAD republish was allowed");

const childCad = await prisma.cadFile.create({
  data: {
    tenantId,
    projectId: project.id,
    parentType: "PLOT",
    parentId: plot.id,
    format: "DXF",
    status: "REVIEW_REQUIRED",
    originalName: `plot-${stamp}.dxf`,
    storageKey: `local/smoke/plot-${stamp}.dxf`,
    version: 1,
    uploadedById: me.json.data.id,
  },
});
const childScene = await prisma.cadScene.create({
  data: {
    tenantId,
    cadFileId: childCad.id,
    scope: "PLOT",
    parentId: plot.id,
    bounds: { minX: 0, minY: 0, maxX: 50, maxY: 50 },
    sceneJson: { source: "smoke-child" },
  },
});
await prisma.cadEntity.create({
  data: {
    tenantId,
    sceneId: childScene.id,
    type: "BATHROOM",
    label: `Bathroom ${stamp}`,
    confidence: 0.91,
    geometry: { type: "polygon", points: [[0, 0], [8, 0], [8, 6], [0, 6]], closed: true },
    measurements: { areaSqft: 48 },
    status: "CONFIRMED",
  },
});
const childPublish = await request(`/api/v1/cad/${childCad.id}/publish`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({}),
});
assert(childPublish.response.status === 200, "plot CAD publish failed");
assert(childPublish.json.data.checklistItems.length === 1, "plot CAD did not create checklist zone");

const notifications = await request("/api/v1/notifications", { headers: { cookie } });
assert(notifications.response.status === 200, "notification list failed");

await prisma.$disconnect();
console.log("Smoke tests passed");
