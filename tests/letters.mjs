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
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    const items = content.items.map((item) => item.str);
    // Long tokens wrap across lines, splitting one word over two text items — keep both a
    // space-joined and a directly-concatenated view so `includes` works either way.
    spaced += items.join(" ") + "\n";
    joined += items.join("") + "\n";
  }
  return {
    numPages: doc.numPages,
    text: spaced,
    has: (needle) => spaced.includes(needle) || joined.includes(needle),
  };
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
  const firstPdf = await pdfText(await downloadPdf(firstFileId));
  assert(firstPdf.numPages >= 1, `${type}: rendered PDF has no pages`);
  assert(firstPdf.has(plot.code), `${type}: plot code missing from rendered PDF text`);
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
      body: JSON.stringify({
        type: "allotment_letter",
        recordType: "Plot",
        recordId: plot.id,
        data: { templateVariant: "joint" },
      }),
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
    const pdf = await pdfText(await downloadPdf(render.json.data.document.fileAssetId));
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
// Transfer letter seller/original-allotment wiring — the dashes in the reference .doc are now
// auto-filled: the transferor comes from the previous ownership record and the original allotment
// letter number/date from the plot's latest allotment document.
{
  console.log("\n■ transfer_letter (seller + original allotment wiring)");
  const sellerOwner = await prisma.owner.findFirstOrThrow({ where: { id: (await prisma.ownershipRecord.findFirstOrThrow({ where: { plotId: plot.id, kind: "ALLOTMENT" }, orderBy: [{ createdAt: "desc" }] })).ownerId ?? undefined } });

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
      kyc: { fatherName: "Test Father" },
    },
  });
  const transferRecord = await prisma.ownershipRecord.create({
    data: {
      tenantId: sellerOwner.tenantId,
      plotId: plot.id,
      ownerId: buyer.id,
      kind: "TRANSFER",
      effectiveAt: new Date(),
      createdById: (await prisma.user.findFirstOrThrow({ where: { email: "owner@saldhaland.example" } })).id,
    },
  });
  // The real transferPlot service moves currentOwner to the buyer — mirror that (owner.* in the
  // letter is the transferee) and restore afterwards.
  const plotBefore = await prisma.plot.findUniqueOrThrow({ where: { id: plot.id }, select: { currentOwnerId: true } });
  await prisma.plot.update({ where: { id: plot.id }, data: { currentOwnerId: buyer.id } });

  try {
    const created = await request("/api/v1/documents/drafts", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ type: "transfer_letter", recordType: "Plot", recordId: plot.id }),
    });
    assert(created.response.status === 201, `transfer wiring: draft creation failed (${created.json.error ?? created.response.status})`);
    const html = created.json.data.document.editableHtml ?? "";
    assert(html.includes(sellerOwner.name), "transfer wiring: seller (transferor) name missing from draft");
    assert(html.includes(originalNumber), "transfer wiring: original allotment letter number missing from draft");
    assert(html.includes(`Transfer Buyer TB${stamp}`), "transfer wiring: buyer name missing from draft");
    console.log("  ✓ seller, buyer, and original allotment number auto-filled");

    const render = await request(`/api/v1/documents/${created.json.data.document.id}/render`, { method: "POST", headers: { cookie } });
    assert(render.response.status === 200, `transfer wiring: render failed (${render.json.error ?? render.response.status})`);
    const pdf = await pdfText(await downloadPdf(render.json.data.document.fileAssetId));
    for (const needle of [sellerOwner.name, originalNumber, `Transfer Buyer TB${stamp}`]) {
      assert(pdf.has(needle), `transfer wiring: "${needle}" missing from rendered PDF`);
    }
    console.log(`  ✓ transfer PDF carries seller + original allotment reference (${pdf.numPages} pages)`);

    await request(`/api/v1/documents/${created.json.data.document.id}`, { method: "DELETE", headers: { cookie } });
  } finally {
    await request(`/api/v1/documents/${allotmentDoc.json.data.document.id}`, { method: "DELETE", headers: { cookie } });
    await prisma.plot.update({ where: { id: plot.id }, data: { currentOwnerId: plotBefore.currentOwnerId } }).catch(() => undefined);
    await prisma.ownershipRecord.delete({ where: { id: transferRecord.id } }).catch(() => undefined);
    await prisma.owner.delete({ where: { id: buyer.id } }).catch(() => undefined);
  }
}

console.log("\nAll letter pipeline checks passed.");
await prisma.$disconnect();
