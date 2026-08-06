// End-to-end verification of the letters pipeline: template → draft → edit → PDF.
//
// For every letter type (allotment / transfer / registry status) this test:
//   1. creates a draft from the project's template and checks the template styling structure
//      arrived intact (paged sections, no unresolved {{placeholders}});
//   2. renders the untouched draft to a PDF (Chromium) and checks core letter data is in the text;
//   3. applies an edit exercising every formatting tool the editor offers (bold/italic/underline,
//      exact px font-size spans, font-family spans) plus everything a Word/Docs paste can inject
//      (headings, lists, links, special characters, a broken image) and checks the HTML
//      round-trips through save byte-for-byte;
//   4. re-renders and asserts every edit is present in the downloaded PDF's extracted text;
//   5. deletes the draft (cleanup).
//
// It also statically guards the editor↔PDF parity contract: the print renderer slices the letter
// CSS out of globals.css between two markers — if the markers or the pinned parity rules drift,
// PDFs would silently stop matching the editor, so we assert the slice still contains them.
//
// Requires: dev server running (SMOKE_BASE_URL or :3000), seeded DB, and a Chromium for
// Puppeteer (`npx puppeteer browsers install chrome` or system chromium).

import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  const json = text && response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : {};
  return { response, json, cookie: response.headers.get("set-cookie") };
}

// ---------------------------------------------------------------------------
// Static guard: the print CSS slice that letter-pdf-puppeteer.ts extracts must exist and must
// contain the WYSIWYG parity rules. Losing either silently un-styles every future PDF.
{
  const css = readFileSync("src/styles/globals.css", "utf8");
  const start = css.indexOf("/* Letter Studio paper canvas */");
  const end = css.indexOf(".letter-template-editor-viewport", start);
  assert(start !== -1 && end !== -1, "letter print CSS markers missing from globals.css");
  const slice = css.slice(start, end);
  for (const needle of [
    ".letter-paper-editor h1 { font-size: 2em; }",
    ".letter-paper-editor h2 { font-size: 1.5em; }",
    "list-style: disc outside",
    ".letter-paper-editor blockquote",
    "border-collapse: collapse",
    "max-width: 100%",
    "font-size: 17.3px",
    'font-family: "WideState Calibri"',
    "color: #111827 !important",
    ".letter-paper-editor .transfer-recipient-table",
  ]) {
    assert(slice.includes(needle), `print CSS slice lost parity rule: ${needle}`);
  }
  console.log("✓ print-CSS parity contract intact");
}

// ---------------------------------------------------------------------------
const login = await request("/api/v1/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "owner@saldhaland.example", password: "Kalman@12345" }),
});
assert(login.response.status === 201, "builder login failed");
const cookie = login.cookie?.split(";")[0];
assert(cookie, "session cookie missing");

const plot = await prisma.plot.findFirstOrThrow({ where: { code: "A-101" } });
const stamp = `${Date.now()}-${randomUUID().slice(0, 6)}`;

// pdfjs-dist text extraction (legacy build works under Node without a worker thread).
async function pdfText(buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, disableFontFace: true }).promise;
  let spaced = "";
  let joined = "";
  const pageTexts = [];
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    const items = content.items.map((item) => item.str);
    pageTexts.push(items.join(" "));
    // Long tokens wrap across lines, splitting one word over two text items — keep both a
    // space-joined and a directly-concatenated view so `includes` works either way.
    spaced += items.join(" ") + "\n";
    joined += items.join("") + "\n";
  }
  return {
    numPages: doc.numPages,
    text: spaced,
    pageTexts,
    has: (needle) => spaced.includes(needle) || joined.includes(needle),
  };
}

async function assertA4Pages(buffer, label) {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.load(buffer);
  for (const [index, page] of pdf.getPages().entries()) {
    const { width, height } = page.getSize();
    assert(Math.abs(width - 595.32) < 1, `${label}: page ${index + 1} width is ${width}, expected A4`);
    assert(Math.abs(height - 841.92) < 3, `${label}: page ${index + 1} height is ${height}, expected A4`);
  }
}

async function downloadPdf(fileAssetId) {
  const res = await fetch(`${baseUrl}/api/v1/files/${fileAssetId}/download`, { headers: { cookie } });
  assert(res.status === 200, `PDF download failed (HTTP ${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  assert(buffer.subarray(0, 5).toString() === "%PDF-", "downloaded file is not a PDF");
  assert(buffer.length > 5_000, `PDF suspiciously small (${buffer.length} bytes)`);
  return buffer;
}

// The edit fragment exercises the full formatting surface of the draft editor + paste sanitizer.
function editFragment(marker) {
  return [
    `<h3>SUBHEAD ${marker}</h3>`,
    `<p data-test="edit">Edited paragraph EDIT-${marker} with <b>bold-${marker}</b>, <i>italic-${marker}</i>, ` +
      `<u>underline-${marker}</u>, <span style="font-size: 22px">bigtext-${marker}</span>, ` +
      `<span style="font-family: 'Times New Roman', 'Liberation Serif', serif">serif-${marker}</span>, ` +
      `amount ₹ 12,34,567 &amp; specials &lt;ok&gt;.</p>`,
    `<ul><li>bullet-one-${marker}</li><li>bullet-two-${marker}</li></ul>`,
    `<p><a href="https://example.com/">link-${marker}</a></p>`,
    // Unreachable image: the renderer must proceed after its 5s per-image cap, not hang or fail.
    `<img src="http://127.0.0.1:9/broken-${marker}.png" alt="broken">`,
  ].join("");
}

// Every string that must survive into the final PDF text layer.
function expectedInPdf(marker) {
  return [
    `SUBHEAD ${marker}`,
    `EDIT-${marker}`,
    `bold-${marker}`,
    `italic-${marker}`,
    `underline-${marker}`,
    `bigtext-${marker}`,
    `serif-${marker}`,
    `bullet-one-${marker}`,
    `bullet-two-${marker}`,
    `link-${marker}`,
    "12,34,567",
  ];
}

async function exerciseLetterType(type) {
  const marker = `${type.split("_")[0].toUpperCase()}-${stamp}`;
  console.log(`\n■ ${type}`);

  // 1. Create the draft from the project template.
  const created = await request("/api/v1/documents/drafts", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ type, recordType: "Plot", recordId: plot.id }),
  });
  assert(created.response.status === 201, `${type}: draft creation failed (${created.json.error ?? created.response.status})`);
  const doc = created.json.data.document;
  const html = doc.editableHtml ?? "";
  assert(html.length > 500, `${type}: draft HTML is implausibly small (${html.length} chars)`);
  assert(/data-(ambey|letter)-page/.test(html), `${type}: draft lost its paged template structure`);
  assert(!/\{\{[^}]+\}\}/.test(html), `${type}: unresolved {{placeholder}} left in draft HTML`);
  assert(html.includes(plot.code), `${type}: plot code missing from draft`);
  console.log(`  ✓ draft created (${html.length} chars, missing vars: ${created.json.data.missingVariables?.length ?? 0})`);

  // 2. Render the untouched draft — the default template itself must produce a valid PDF.
  const firstRender = await request(`/api/v1/documents/${doc.id}/render`, { method: "POST", headers: { cookie } });
  assert(firstRender.response.status === 200, `${type}: initial render failed (${firstRender.json.error ?? firstRender.response.status})`);
  const firstFileId = firstRender.json.data.document.fileAssetId;
  const firstPdfBuffer = await downloadPdf(firstFileId);
  await assertA4Pages(firstPdfBuffer, `${type} initial PDF`);
  const firstPdf = await pdfText(firstPdfBuffer);
  assert(firstPdf.numPages >= 1, `${type}: rendered PDF has no pages`);
  assert(firstPdf.has(plot.code), `${type}: plot code missing from rendered PDF text`);
  if (type === "allotment_letter") {
    assert(firstPdf.pageTexts[0]?.includes("Warm Regards"), "allotment_letter: first-page sign-off spilled onto another page");
  }
  console.log(`  ✓ template render ok (${firstPdf.numPages} pages)`);

  // 3. Edit: inject the formatting fragment into the LAST page section, exactly where the
  //    contenteditable editor would put it, and confirm the save round-trips byte-for-byte.
  const closeTag = "</section>";
  const lastClose = html.lastIndexOf(closeTag);
  assert(lastClose !== -1, `${type}: no </section> found to edit`);
  const editedHtml = html.slice(0, lastClose) + editFragment(marker) + html.slice(lastClose);
  const saved = await request(`/api/v1/documents/${doc.id}/draft`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ editableHtml: editedHtml }),
  });
  assert(saved.response.status === 200, `${type}: draft save failed (${saved.json.error ?? saved.response.status})`);
  // There is no GET /documents/[id] API (the editor page loads server-side), so verify the
  // persisted draft straight from the database — byte equality proves zero server-side mutation.
  const reloaded = await prisma.generatedDocument.findUniqueOrThrow({ where: { id: doc.id } });
  assert(reloaded.editableHtml === editedHtml, `${type}: saved draft HTML did not round-trip byte-for-byte`);
  console.log("  ✓ edit saved and round-tripped exactly");

  // 4. Re-render and assert every edit shows up in the downloaded PDF.
  const rerender = await request(`/api/v1/documents/${doc.id}/render`, { method: "POST", headers: { cookie } });
  assert(rerender.response.status === 200, `${type}: post-edit render failed (${rerender.json.error ?? rerender.response.status})`);
  const secondFileId = rerender.json.data.document.fileAssetId;
  assert(secondFileId && secondFileId !== firstFileId, `${type}: re-render did not produce a fresh PDF file`);
  const finalPdf = await pdfText(await downloadPdf(secondFileId));
  for (const needle of expectedInPdf(marker)) {
    assert(finalPdf.has(needle), `${type}: edited content "${needle}" missing from final PDF`);
  }
  assert(finalPdf.numPages >= firstPdf.numPages, `${type}: edited PDF lost pages (${finalPdf.numPages} < ${firstPdf.numPages})`);
  console.log(`  ✓ all ${expectedInPdf(marker).length} edits present in final PDF (${finalPdf.numPages} pages)`);

  // 5. Cleanup so repeated runs don't pile up drafts.
  const del = await request(`/api/v1/documents/${doc.id}`, { method: "DELETE", headers: { cookie } });
  assert(del.response.status === 200, `${type}: cleanup delete failed`);
}

await exerciseLetterType("allotment_letter");
await exerciseLetterType("transfer_letter");
await exerciseLetterType("registry_status_letter");

// ---------------------------------------------------------------------------
// Edge cases

// A near-empty draft is rejected at the API boundary (schema min length) with a 400, never a
// Chromium crash: guards select-all + delete + save.
{
  const created = await request("/api/v1/documents/drafts", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ type: "allotment_letter", recordType: "Plot", recordId: plot.id }),
  });
  assert(created.response.status === 201, "edge: draft creation failed");
  const emptySave = await request(`/api/v1/documents/${created.json.data.document.id}/draft`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ editableHtml: "<p><br></p>" }),
  });
  assert(emptySave.response.status === 400, `edge: emptied draft should be a 400, got ${emptySave.response.status}`);
  await request(`/api/v1/documents/${created.json.data.document.id}`, { method: "DELETE", headers: { cookie } });
  console.log("\n✓ edge: emptied draft rejected with 400");
}

// An invalid letter type never reaches the renderer.
{
  const bad = await request("/api/v1/documents/drafts", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ type: "not_a_letter", recordType: "Plot", recordId: plot.id }),
  });
  assert(bad.response.status === 400, `edge: invalid type should be 400, got ${bad.response.status}`);
  console.log("✓ edge: invalid letter type rejected");
}

// ---------------------------------------------------------------------------
// Joint (partnership) allotment letter — the two-allottee variant ported from the
// "Allotment Ambey Homes Double" reference. Seeds a second allottee onto the plot's allotment
// record, creates a joint-variant draft, and verifies both allottees + the Share split appear in
// the draft structure and in the rendered PDF.
{
  console.log("\n■ allotment_letter (joint / partnership variant)");
  const allotmentRecord = await prisma.ownershipRecord.findFirstOrThrow({
    where: { plotId: plot.id, kind: "ALLOTMENT" },
    orderBy: [{ createdAt: "desc" }],
  });
  const originalExtra = allotmentRecord.extraDetails ?? {};
  const jointName = `Anish Kumar Garg JT${stamp}`;
  await prisma.ownershipRecord.update({
    where: { id: allotmentRecord.id },
    data: {
      extraDetails: {
        ...originalExtra,
        secondAllottee: {
          name: jointName,
          fatherName: "Surinder Kumar",
          address: "House No. 1750, Lakhi Colony, Ward No. 16, Barnala, Punjab 148101",
          aadhaarNo: "1111 2222 3333",
          share: "50%",
        },
      },
    },
  });

  try {
    const created = await request("/api/v1/documents/drafts", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ type: "allotment_letter_joint", recordType: "Plot", recordId: plot.id }),
    });
    assert(created.response.status === 201, `joint: draft creation failed (${created.json.error ?? created.response.status})`);
    const doc = created.json.data.document;
    const html = doc.editableHtml ?? "";
    assert(html.includes('data-template-variant="joint"'), "joint: draft did not use the joint template");
    assert(html.includes(jointName), "joint: second allottee name missing from draft");
    assert(html.includes("s/o Surinder Kumar"), "joint: second allottee relation missing from draft");
    assert(html.includes("<th>Share</th>"), "joint: Share row missing from details table");
    assert((html.match(/50%/g) ?? []).length >= 2, "joint: 50/50 share split missing");
    assert(html.includes("(2) NAME:") && html.includes(`(2) NAME: ${jointName}`), "joint: second allottee missing from closing signature line");
    assert((html.match(/Please affix/g) ?? []).length >= 4, "joint: expected two photograph boxes on declaration + agreement pages");
    assert(!/\{\{[^}]+\}\}/.test(html), "joint: unresolved {{placeholder}} left in draft");
    console.log("  ✓ joint draft structure matches the Double reference");

    const render = await request(`/api/v1/documents/${doc.id}/render`, { method: "POST", headers: { cookie } });
    assert(render.response.status === 200, `joint: render failed (${render.json.error ?? render.response.status})`);
    const jointPdfBuffer = await downloadPdf(render.json.data.document.fileAssetId);
    await assertA4Pages(jointPdfBuffer, "joint allotment initial PDF");
    const pdf = await pdfText(jointPdfBuffer);
    assert(pdf.pageTexts[0]?.includes("Warm Regards"), "joint: first-page sign-off spilled onto another page");
    for (const needle of [jointName, "Share", "50%", plot.code]) {
      assert(pdf.has(needle), `joint: "${needle}" missing from rendered PDF`);
    }
    console.log(`  ✓ joint PDF contains both allottees and the share split (${pdf.numPages} pages)`);

    await request(`/api/v1/documents/${doc.id}`, { method: "DELETE", headers: { cookie } });
  } finally {
    await prisma.ownershipRecord.update({
      where: { id: allotmentRecord.id },
      data: { extraDetails: originalExtra },
    });
  }
}

// ---------------------------------------------------------------------------
// Approved transfer letters use the same physical-signature workflow as allotment letters.
// The signed upload must belong to the same plot, mark the document SIGNED, and remain replaceable.
{
  console.log("\n■ transfer letter signed-copy workflow");
  const document = await prisma.generatedDocument.create({
    data: {
      tenantId: plot.tenantId,
      type: "transfer_letter",
      status: "APPROVED",
      recordType: "Plot",
      recordId: plot.id,
      data: {},
      number: `SIGNED-TRANSFER-${stamp}`,
    },
  });
  const createSignedFile = (suffix, ownerId = plot.id) => prisma.fileAsset.create({
    data: {
      tenantId: plot.tenantId,
      storageKey: `test/${stamp}/signed-transfer-${suffix}.pdf`,
      storageProvider: "LOCAL",
      fileName: `signed-transfer-${suffix}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 1024,
      visibility: "OWNER_VISIBLE",
      documentType: "TRANSFER_LETTER",
      documentNo: document.number,
      ownerType: "Plot",
      ownerId,
      categoryKey: "signed-transfer-letter",
    },
  });
  const wrongPlotFile = await createSignedFile("wrong-plot", "another-plot");
  const firstSignedFile = await createSignedFile("first");
  const replacementSignedFile = await createSignedFile("replacement");
  try {
    const invalid = await request(`/api/v1/documents/${document.id}/sign`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ signedFileAssetId: wrongPlotFile.id }),
    });
    assert(invalid.response.status === 400, "transfer signed copy: accepted a file belonging to another plot");

    const signed = await request(`/api/v1/documents/${document.id}/sign`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ signedFileAssetId: firstSignedFile.id }),
    });
    assert(signed.response.status === 200, `transfer signed copy: upload failed (${signed.json.error ?? signed.response.status})`);
    assert(signed.json.data.status === "SIGNED", "transfer signed copy: document was not marked SIGNED");
    assert(signed.json.data.signedFileAssetId === firstSignedFile.id, "transfer signed copy: uploaded file was not linked");

    const replaced = await request(`/api/v1/documents/${document.id}/sign`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ signedFileAssetId: replacementSignedFile.id }),
    });
    assert(replaced.response.status === 200, `transfer signed copy: replacement failed (${replaced.json.error ?? replaced.response.status})`);
    assert(replaced.json.data.signedFileAssetId === replacementSignedFile.id, "transfer signed copy: replacement file was not linked");
    console.log("  ✓ approved transfer becomes signed and its signed copy can be replaced safely");
  } finally {
    await prisma.auditEvent.deleteMany({ where: { entityType: "GeneratedDocument", entityId: document.id } });
    await prisma.generatedDocument.delete({ where: { id: document.id } });
    await prisma.fileAsset.deleteMany({ where: { id: { in: [wrongPlotFile.id, firstSignedFile.id, replacementSignedFile.id] } } });
  }
}

// ---------------------------------------------------------------------------
// Returning from Letter Studio and submitting revised transfer details must update the same
// pending ownership record and refresh the same draft document. It must never create a second
// transfer event merely because the user pressed Back to correct the form.
{
  console.log("\n■ transfer form draft update is idempotent");
  const plotBefore = await prisma.plot.findUniqueOrThrow({ where: { id: plot.id } });
  assert(plotBefore.currentOwnerId, "transfer draft update: test plot has no current owner");
  const buyer = await request("/api/v1/ownership/owners", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      type: "INDIVIDUAL",
      name: `Saved Transfer Buyer ${stamp}`,
      phone: "9876501234",
      address: "Draft House, Barnala",
    }),
  });
  assert(buyer.response.status === 201, "transfer draft update: buyer creation failed");
  const buyerId = buyer.json.data.id;
  const countBefore = await prisma.ownershipRecord.count({
    where: { plotId: plot.id, kind: "TRANSFER", cancelledAt: null },
  });
  let recordId;
  let documentId;
  try {
    const recorded = await request(`/api/v1/ownership/plots/${plot.id}/transfer`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({
        buyerOwnerId: buyerId,
        notes: "first saved value",
        extraDetails: { transfer: { notes: "first saved value" } },
      }),
    });
    assert(recorded.response.status === 200, `transfer draft update: initial record failed (${recorded.json.error ?? recorded.response.status})`);
    recordId = recorded.json.data.record.id;

    const drafted = await request("/api/v1/documents/drafts", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ type: "transfer_letter", recordType: "Plot", recordId: plot.id }),
    });
    assert(drafted.response.status === 201, "transfer draft update: initial letter failed");
    documentId = drafted.json.data.document.id;

    const updated = await request(`/api/v1/ownership/plots/${plot.id}/transfer`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({
        recordId,
        buyerOwnerId: buyerId,
        notes: "latest saved value",
        extraDetails: { transfer: { notes: "latest saved value" } },
      }),
    });
    assert(updated.response.status === 200, `transfer draft update: update failed (${updated.json.error ?? updated.response.status})`);
    assert(updated.json.data.record.id === recordId, "transfer draft update: a second ownership record was created");
    const countAfter = await prisma.ownershipRecord.count({
      where: { plotId: plot.id, kind: "TRANSFER", cancelledAt: null },
    });
    assert(countAfter === countBefore + 1, `transfer draft update: expected one new record, found ${countAfter - countBefore}`);

    const refreshed = await request(`/api/v1/documents/${documentId}/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ data: { transferNotes: "latest saved value" } }),
    });
    assert(refreshed.response.status === 200, `transfer draft update: letter refresh failed (${refreshed.json.error ?? refreshed.response.status})`);
    assert(refreshed.json.data.document.id === documentId, "transfer draft update: letter refresh created a new document");
    assert(refreshed.json.data.document.status === "DRAFT", "transfer draft update: refreshed letter is not editable");
    const stored = await prisma.ownershipRecord.findUniqueOrThrow({ where: { id: recordId } });
    assert(stored.notes === "latest saved value", "transfer draft update: latest form value was not stored");
    console.log("  ✓ revised form updates one pending transfer and one editable A4 letter");
  } finally {
    if (documentId) await request(`/api/v1/documents/${documentId}`, { method: "DELETE", headers: { cookie } });
    if (recordId) await prisma.ownershipRecord.delete({ where: { id: recordId } }).catch(() => undefined);
    await prisma.owner.delete({ where: { id: buyerId } }).catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Transfer letter seller/original-allotment wiring — the dashes in the reference .doc are now
// auto-filled: the transferor comes from the previous ownership record and the original allotment
// letter number/date from the plot's latest allotment document.
{
  console.log("\n■ transfer_letter (seller + original allotment wiring)");
  const sellerOwnership = await prisma.ownershipRecord.findFirstOrThrow({
    where: { plotId: plot.id, kind: { in: ["TRANSFER", "ALLOTMENT"] }, ownerId: { not: null } },
    orderBy: [{ createdAt: "desc" }, { effectiveAt: "desc" }],
  });
  const sellerOwner = await prisma.owner.findFirstOrThrow({ where: { id: sellerOwnership.ownerId ?? undefined } });

  // The "original allotment letter" reference: a live allotment draft with a number.
  const allotmentDoc = await request("/api/v1/documents/drafts", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ type: "allotment_letter", recordType: "Plot", recordId: plot.id }),
  });
  assert(allotmentDoc.response.status === 201, "transfer wiring: allotment draft creation failed");
  const originalNumber = allotmentDoc.json.data.document.number;

  // Simulate a completed sale: a TRANSFER ownership record to a new buyer.
  const buyer = await prisma.owner.create({
    data: {
      tenantId: sellerOwner.tenantId,
      type: "INDIVIDUAL",
      name: `Transfer Buyer TB${stamp}`,
      address: "House 12, New Grain Market Road, Barnala, Punjab",
      kyc: { fatherName: "Test Father", aadhaarNo: "1234 5678 9012" },
    },
  });
  const transferKycFile = await prisma.fileAsset.create({
    data: {
      tenantId: sellerOwner.tenantId,
      storageKey: `test/${stamp}/transfer-aadhaar.png`,
      storageProvider: "LOCAL",
      fileName: `transfer-aadhaar-${stamp}.png`,
      mimeType: "image/png",
      sizeBytes: 1024,
      visibility: "TEAM",
      ownerType: "Owner",
      ownerId: buyer.id,
      categoryKey: "transfer-kyc",
    },
  });
  const snapshotSellerName = `Snapshot Seller ${stamp}`;
  const snapshotAllotmentNumber = `ORIGINAL-${stamp}`;
  const snapshotAllotmentDate = "25.07.2026";
  const transferRecord = await prisma.ownershipRecord.create({
    data: {
      tenantId: sellerOwner.tenantId,
      plotId: plot.id,
      ownerId: buyer.id,
      kind: "TRANSFER",
      effectiveAt: new Date(),
      extraDetails: {
        transfer: {
          seller: { name: snapshotSellerName, relationPrefix: "s/o Sh.", fatherName: "Snapshot Father" },
          originalAllotmentNumber: snapshotAllotmentNumber,
          originalAllotmentDate: snapshotAllotmentDate,
        },
        allottee: { documents: [{ kind: "Aadhaar", files: [{ id: transferKycFile.id, fileName: transferKycFile.fileName }] }] },
      },
      createdById: (await prisma.user.findFirstOrThrow({ where: { email: "owner@saldhaland.example" } })).id,
    },
  });

  try {
    const created = await request("/api/v1/documents/drafts", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ type: "transfer_letter", recordType: "Plot", recordId: plot.id }),
    });
    assert(created.response.status === 201, `transfer wiring: draft creation failed (${created.json.error ?? created.response.status})`);
    const html = created.json.data.document.editableHtml ?? "";
    assert(html.includes(snapshotSellerName) && html.includes("s/o Sh. Snapshot Father"), "transfer wiring: stored seller snapshot missing from draft");
    assert(html.includes(snapshotAllotmentNumber) && html.includes(snapshotAllotmentDate), "transfer wiring: stored original allotment reference missing from draft");
    assert(html.includes(`Transfer Buyer TB${stamp}`), "transfer wiring: buyer name missing from draft");
    console.log("  ✓ seller, buyer, and original allotment number auto-filled");

    // The transferee details use the same compact labelled table on the request and issued letter.
    assert((html.match(/class="transfer-recipient-table/g) ?? []).length === 2, "transfer wiring: reference recipient tables missing");
    assert(html.includes("transfer-recipient-table-centered") && html.includes("transfer-recipient-table-left"), "transfer wiring: recipient table alignment missing");
    for (const label of ["Name", "Address", "PAN No.", "Aadhaar No."]) {
      assert(html.includes(`<th scope="row">${label}</th>`), `transfer wiring: recipient table missing ${label} row`);
    }
    assert(html.includes("House 12, New Grain Market Road<br>Barnala, Punjab"), "transfer wiring: recipient/table address was not split into two lines");
    assert(!html.includes("red-text"), "transfer wiring: legacy red text styling remains in the draft");
    console.log("  ✓ recipient tables are structured and the transfer draft is monochrome");

    assert(html.includes("Supporting documents") && html.includes(transferKycFile.id), "transfer wiring: transfer-specific KYC attachment missing");
    console.log("  ✓ transfer-specific supporting document is appended");

    const render = await request(`/api/v1/documents/${created.json.data.document.id}/render`, { method: "POST", headers: { cookie } });
    assert(render.response.status === 200, `transfer wiring: render failed (${render.json.error ?? render.response.status})`);
    const pdf = await pdfText(await downloadPdf(render.json.data.document.fileAssetId));
    for (const needle of [snapshotSellerName, "Snapshot Father", snapshotAllotmentNumber, snapshotAllotmentDate, `Transfer Buyer TB${stamp}`]) {
      assert(pdf.has(needle), `transfer wiring: "${needle}" missing from rendered PDF`);
    }
    console.log(`  ✓ transfer PDF carries seller + original allotment reference (${pdf.numPages} pages)`);

    await request(`/api/v1/documents/${created.json.data.document.id}`, { method: "DELETE", headers: { cookie } });
  } finally {
    await request(`/api/v1/documents/${allotmentDoc.json.data.document.id}`, { method: "DELETE", headers: { cookie } });
    await prisma.ownershipRecord.delete({ where: { id: transferRecord.id } }).catch(() => undefined);
    await prisma.fileAsset.delete({ where: { id: transferKycFile.id } }).catch(() => undefined);
    await prisma.owner.delete({ where: { id: buyer.id } }).catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Bug fix regression: a transfer letter drafted while only the ALLOTMENT ownership record exists
// (the normal case — you draft the transfer request before any TRANSFER record is created) must
// NOT pull in the allottee's KYC photograph that was uploaded during the original allotment. An
// allotment_letter draft in the exact same state SHOULD still show it (the feature is scoped to
// allotment types, not switched off entirely).
{
  console.log("\n■ transfer_letter must not leak the allotment's KYC photos");
  const allotmentRecord = await prisma.ownershipRecord.findFirstOrThrow({
    where: { plotId: plot.id, kind: "ALLOTMENT" },
    orderBy: [{ createdAt: "desc" }],
  });
  const originalExtra = allotmentRecord.extraDetails ?? {};
  const kycFile = await prisma.fileAsset.create({
    data: {
      tenantId: allotmentRecord.tenantId,
      storageKey: `test/${stamp}/kyc-photo.png`,
      storageProvider: "LOCAL",
      fileName: `aadhaar-${stamp}.png`,
      mimeType: "image/png",
      sizeBytes: 1024,
      visibility: "TEAM",
      ownerType: "Owner",
      ownerId: allotmentRecord.ownerId,
    },
  });
  await prisma.ownershipRecord.update({
    where: { id: allotmentRecord.id },
    data: {
      extraDetails: {
        ...originalExtra,
        allottee: { documents: [{ kind: "Aadhaar", files: [{ id: kycFile.id, fileName: kycFile.fileName }] }] },
      },
    },
  });

  try {
    // Sanity check: the allotment letter itself DOES still pick up the KYC photo.
    const allotmentDraft = await request("/api/v1/documents/drafts", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ type: "allotment_letter", recordType: "Plot", recordId: plot.id }),
    });
    assert(allotmentDraft.response.status === 201, "photo-leak: allotment draft creation failed");
    const allotmentHtml = allotmentDraft.json.data.document.editableHtml ?? "";
    assert(allotmentHtml.includes("Supporting documents") && allotmentHtml.includes(kycFile.id), "photo-leak: allotment letter unexpectedly lost its own supporting KYC photo");
    await request(`/api/v1/documents/${allotmentDraft.json.data.document.id}`, { method: "DELETE", headers: { cookie } });
    console.log("  ✓ allotment letter still attaches its own KYC photo (feature intact)");

    // The actual bug: with no TRANSFER ownership record yet, the transfer draft must NOT inherit
    // the allotment's KYC photo.
    const transferDraft = await request("/api/v1/documents/drafts", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ type: "transfer_letter", recordType: "Plot", recordId: plot.id }),
    });
    assert(transferDraft.response.status === 201, "photo-leak: transfer draft creation failed");
    const transferHtml = transferDraft.json.data.document.editableHtml ?? "";
    assert(!transferHtml.includes("Supporting documents"), "photo-leak: transfer letter still has a Supporting documents section");
    assert(!transferHtml.includes(kycFile.id), "photo-leak: transfer letter still embeds the allotment's KYC photo");
    await request(`/api/v1/documents/${transferDraft.json.data.document.id}`, { method: "DELETE", headers: { cookie } });
    console.log("  ✓ transfer letter no longer inherits the allotment's KYC photo");
  } finally {
    await prisma.ownershipRecord.update({ where: { id: allotmentRecord.id }, data: { extraDetails: originalExtra } });
    await prisma.fileAsset.delete({ where: { id: kycFile.id } }).catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Bug fix regression: the joint allotment letter must be a first-class, independently editable
// letter type — selectable and savable from the project's "Set your letters" template editor
// (not just draftable), and its default body reachable via the same defaults endpoint as the
// other three types.
{
  console.log("\n■ allotment_letter_joint is editable in Set your letters");
  const project = await prisma.project.findFirstOrThrow({ where: { id: plot.projectId } });
  // Saving a new active template deactivates the project's current active one of that type
  // (same as every other letter type) — remember it so this check leaves the project exactly as
  // it found it.
  const previousActive = await prisma.documentTemplate.findFirst({
    where: { tenantId: project.tenantId, projectId: project.id, type: "allotment_letter_joint", active: true },
    select: { id: true },
  });

  try {
    const defaults = await request(`/api/v1/projects/${project.id}/letter-templates/defaults?type=allotment_letter_joint`, { headers: { cookie } });
    assert(defaults.response.status === 200, "joint type: defaults endpoint rejected allotment_letter_joint");
    assert(defaults.json.data?.body?.includes('data-template-variant="joint"'), "joint type: defaults endpoint did not return the joint template body");

    const saved = await request(`/api/v1/projects/${project.id}/letter-templates`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: `Custom joint template ${stamp}`, type: "allotment_letter_joint", body: defaults.json.data.body }),
    });
    assert(saved.response.status === 201, `joint type: saving a custom joint template failed (${saved.json.error ?? saved.response.status})`);
    assert(saved.json.data.type === "allotment_letter_joint", "joint type: saved template did not keep the joint type");
    console.log("  ✓ joint template is listed, defaulted, and savable like the other letter types");

    await prisma.documentTemplate.delete({ where: { id: saved.json.data.id } }).catch(() => undefined);
  } finally {
    if (previousActive) {
      await prisma.documentTemplate.update({ where: { id: previousActive.id }, data: { active: true } }).catch(() => undefined);
    }
  }
}

console.log("\nAll letter pipeline checks passed.");
await prisma.$disconnect();
