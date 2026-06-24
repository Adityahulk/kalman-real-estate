import { existsSync } from "node:fs";
import type { Browser, LaunchOptions } from "puppeteer";
import { PDFDocument } from "pdf-lib";

// Renders the letter editor's saved HTML to a PDF with real headless Chromium, so the PDF is a
// pixel-faithful copy of what the user sees in the "Letter Studio" editor (same HTML + same CSS).

// Print CSS mirrors the editor's `.letter-paper-editor` rules in src/styles/globals.css, minus
// screen-only affordances (shadow/outer border/gap) and plus paged rules so each <section> is one page.
// Keep this in sync with globals.css `.letter-paper-editor`.
const LETTER_PRINT_CSS = `
  @page { margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .letter-paper-editor { color: #111827; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .letter-paper-editor section[data-ambey-page],
  .letter-paper-editor section[data-letter-page] {
    position: relative;
    width: 860px;
    min-height: 1110px;
    padding: 74px 86px 82px;
    background: #fff;
    overflow: visible;
    break-after: page;
    page-break-after: always;
  }
  .letter-paper-editor section[data-ambey-page]:last-child,
  .letter-paper-editor section[data-letter-page]:last-child { break-after: auto; page-break-after: auto; }
  .letter-paper-editor section[data-ambey-page="1"],
  .letter-paper-editor section[data-ambey-page="2"] { padding-top: 150px; }
  .letter-paper-editor h1, .letter-paper-editor h2, .letter-paper-editor h3 {
    margin: 0 0 18px; color: #111827; font-weight: 700; text-align: center; white-space: pre-wrap; line-height: 1.22;
  }
  .letter-paper-editor p { margin: 0 0 16px; white-space: pre-wrap; }
  .letter-paper-editor h1 u,
  .letter-paper-editor h2 u,
  .letter-paper-editor .verification-title u,
  .letter-paper-editor .regulatory-note u,
  .letter-paper-editor .buyer-block u,
  .letter-paper-editor .recipient-block u { text-underline-offset: 3px; }
  .letter-paper-editor .right { text-align: right; }
  .letter-paper-editor .center { text-align: center; }
  .letter-paper-editor .first-page-signoff {
    position: absolute;
    right: 86px;
    bottom: 74px;
    margin: 0;
    text-align: right;
  }
  .letter-paper-editor .meta-block { max-width: 330px; margin-left: auto; margin-bottom: 28px; line-height: 1.28; }
  .letter-paper-editor .recipient-block,
  .letter-paper-editor .buyer-block { max-width: 520px; line-height: 1.45; }
  .letter-paper-editor .subject-line { display: grid; grid-template-columns: 132px minmax(0, 1fr); gap: 18px; align-items: start; font-weight: 700; margin-top: 8px; margin-bottom: 26px; }
  .letter-paper-editor .stamp-line { margin-bottom: 40px; }
  .letter-paper-editor .declaration-intro,
  .letter-paper-editor .verification-body,
  .letter-paper-editor .consent-subject,
  .letter-paper-editor .agreement-opening,
  .letter-paper-editor .agreement-party,
  .letter-paper-editor .buyer-note,
  .letter-paper-editor .regulatory-note { line-height: 1.56; }
  .letter-paper-editor .agreement-page { font-size: 14.6px; line-height: 1.7; letter-spacing: 0.01em; }
  .letter-paper-editor .agreement-page p { margin: 0 0 18px; white-space: normal; line-height: 1.72; text-align: justify; text-justify: inter-word; }
  .letter-paper-editor .agreement-page h2 { margin-bottom: 22px; }
  .letter-paper-editor .agreement-page table { margin: 12px 0 14px; }
  .letter-paper-editor .agreement-page .pricing-table + p { margin-bottom: 28px; }
  .letter-paper-editor .clause-heading-only { display: grid; grid-template-columns: max-content minmax(0, 1fr); column-gap: 10px; align-items: start; margin-bottom: 14px; text-align: left; }
  .letter-paper-editor .clause-block { margin-bottom: 24px; }
  .letter-paper-editor .clause-heading { display: grid; grid-template-columns: max-content minmax(0, 1fr); column-gap: 10px; align-items: start; margin-bottom: 16px; line-height: 1.45; text-align: left; }
  .letter-paper-editor .clause-heading-number, .letter-paper-editor .clause-heading-text { display: block; }
  .letter-paper-editor .clause-heading-text { font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
  .letter-paper-editor .clause-body { display: block; padding-left: 34px; white-space: normal; line-height: 1.78; text-align: justify; text-justify: inter-word; }
  .letter-paper-editor .clause-follow { padding-left: 34px; margin-bottom: 18px; }
  .letter-paper-editor .clause-continuation { padding-left: 34px; margin-bottom: 18px; white-space: normal; line-height: 1.78; text-align: justify; text-justify: inter-word; }
  .letter-paper-editor .subclause-item { display: grid; grid-template-columns: 34px minmax(0, 1fr); column-gap: 8px; align-items: start; margin-bottom: 18px; white-space: normal; }
  .letter-paper-editor .subclause-label, .letter-paper-editor .subclause-text { display: block; }
  .letter-paper-editor .subclause-text { line-height: 1.72; text-align: justify; text-justify: inter-word; }
  .letter-paper-editor .subclause-continuation { padding-left: 42px; margin-bottom: 18px; white-space: normal; line-height: 1.72; text-align: justify; text-justify: inter-word; }
  .letter-paper-editor .roman-item,
  .letter-paper-editor .consent-indent { padding-left: 38px; text-indent: -24px; line-height: 1.62; margin-bottom: 22px; }
  .letter-paper-editor .verification-title { margin-top: 56px; margin-bottom: 48px; }
  .letter-paper-editor .verification-body { margin-top: 78px; max-width: 720px; }
  .letter-paper-editor .framed-photo { border: 2px solid #111827; padding: 16px; color: #111827; background: #fff; }
  .letter-paper-editor .framed-photo::before { content: ""; position: absolute; inset: 14px; border: 1px solid #111827; pointer-events: none; }
  .letter-paper-editor .photo-box { position: relative; }
  .letter-paper-editor .consent-subject { margin-bottom: 34px; }
  .letter-paper-editor .salutation { margin-bottom: 34px; }
  .letter-paper-editor .consent-plot-lines { color: #dc2626; line-height: 1.55; margin-bottom: 22px; }
  .letter-paper-editor .consent-signoff { margin-top: 56px; }
  .letter-paper-editor .regulatory-note { font-style: italic; margin-bottom: 30px; }
  .letter-paper-editor .agreement-note { font-style: italic; line-height: 1.45; margin-bottom: 28px; }
  .letter-paper-editor .buyer-note { margin-top: 18px; max-width: 760px; }
  .letter-paper-editor .closing-intro { line-height: 1.56; margin-bottom: 24px; }
  .letter-paper-editor .closing-title { margin-bottom: 28px; line-height: 1.6; }
  .letter-paper-editor .signature-lines,
  .letter-paper-editor .witness-table { width: 100%; margin: 0 0 28px; table-layout: fixed; }
  .letter-paper-editor .closing-witness-layout { display: flex; flex-direction: column; gap: 34px; margin-bottom: 18px; }
  .letter-paper-editor .closing-witness-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 56px; }
  .letter-paper-editor .closing-witness-entry { flex: 1 1 auto; min-width: 0; }
  .letter-paper-editor .closing-witness-line { display: grid; grid-template-columns: 148px minmax(0, 1fr); align-items: end; column-gap: 10px; margin: 0 0 28px; }
  .letter-paper-editor .closing-witness-label { display: block; min-width: 0; white-space: nowrap; }
  .letter-paper-editor .closing-witness-fill { display: block; min-width: 0; padding-left: 4px; border-bottom: 1.6px solid #1f2937; line-height: 1.1; white-space: normal; overflow-wrap: anywhere; }
  .letter-paper-editor .closing-photo-box { width: 104px; height: 142px; flex: 0 0 104px; border: 3px solid #374151; background: #fff; margin-top: 8px; }
  .letter-paper-editor .signature-lines td,
  .letter-paper-editor .witness-table td { border: 0; padding: 8px 0; vertical-align: top; }
  .letter-paper-editor .signature-lines td:first-child { width: 72%; }
  .letter-paper-editor .signature-lines td:last-child { width: 28%; text-align: right; }
  .letter-paper-editor .witness-table td:first-child { width: 18%; padding-right: 10px; }
  .letter-paper-editor .witness-table td:last-child { width: 82%; }
  .letter-paper-editor .closing-meta,
  .letter-paper-editor .closing-subtitle,
  .letter-paper-editor .closing-witness-title,
  .letter-paper-editor .closing-firm-title,
  .letter-paper-editor .closing-firm-note { margin-bottom: 12px; }
  .letter-paper-editor .closing-firm-title { margin-top: 18px; }
  .letter-paper-editor .closing-firm-note { line-height: 1.5; }
  .letter-paper-editor .muted { color: #475569; }
  .letter-paper-editor .site-plan-box {
    display: grid; min-height: 210px; place-items: center; border: none; color: #64748b;
  }
  .letter-paper-editor .photo-box {
    display: grid; width: 132px; height: 170px; place-items: center; padding: 6px;
    border: 1px dashed #cbd5e1; text-align: center; font-size: 11px; line-height: 1.3; color: #64748b;
  }
  .letter-paper-editor .photo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .letter-paper-editor .photo-box.bottom-left, .letter-paper-editor .photo-box.left { float: left; margin: 8px 16px 8px 0; }
  .letter-paper-editor .photo-box.right-mid, .letter-paper-editor .photo-box.right { float: right; margin: 8px 0 8px 16px; }
  .letter-paper-editor table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  .letter-paper-editor th, .letter-paper-editor td { border: 1px solid #111827; padding: 8px 12px; vertical-align: top; white-space: pre-wrap; }
  .letter-paper-editor .plain th, .letter-paper-editor .plain td { border: 0; padding: 4px 0; }
  .letter-paper-editor .pricing-table { width: 100%; margin: 8px 0 4px; table-layout: fixed; }
  .letter-paper-editor .pricing-table td:nth-child(1) { width: 38%; }
  .letter-paper-editor .pricing-table td:nth-child(2) { width: 5%; text-align: center; padding-left: 0; padding-right: 0; }
  .letter-paper-editor .pricing-table td:nth-child(3) { width: 57%; }
  .letter-paper-editor .pricing-table td { font-size: 15px; line-height: 1.25; }
  .letter-paper-editor section[data-ambey-page="1"] table th,
  .letter-paper-editor section[data-ambey-page="1"] table td,
  .letter-paper-editor .pricing-table td { font-weight: 600; }
  .letter-paper-editor .side-table th, .letter-paper-editor .side-table td { text-align: center; }
  .letter-paper-editor .side-grid-table th, .letter-paper-editor .side-grid-table td { text-align: left; }
  .letter-paper-editor .possession-layout { display: flex; gap: 42px; align-items: flex-start; margin: 22px 0 0; }
  .letter-paper-editor .possession-table { flex: 0 0 420px; width: 420px; margin: 0; table-layout: fixed; }
  .letter-paper-editor .possession-table th:nth-child(1), .letter-paper-editor .possession-table td:nth-child(1) { width: 32%; }
  .letter-paper-editor .possession-table th:nth-child(2), .letter-paper-editor .possession-table td:nth-child(2) { width: 5%; text-align: center; padding-left: 0; padding-right: 0; }
  .letter-paper-editor .possession-table th:nth-child(3), .letter-paper-editor .possession-table td:nth-child(3) { width: 22%; }
  .letter-paper-editor .possession-table th:nth-child(4), .letter-paper-editor .possession-table td:nth-child(4) { width: 41%; }
  .letter-paper-editor .possession-table th { font-weight: 700; }
  .letter-paper-editor .possession-table td { font-weight: 500; }
  .letter-paper-editor .possession-table th, .letter-paper-editor .possession-table td { padding: 9px 10px; font-size: 12px; line-height: 1.15; }
  .letter-paper-editor .possession-aside { width: 238px; flex-shrink: 0; text-align: center; }
  .letter-paper-editor .possession-plan-box { width: 190px; min-height: 258px; border: 3px solid #374151; margin: 0 auto; }
  .letter-paper-editor .site-plan-label { margin-top: 24px; font-size: 13px; font-weight: 700; letter-spacing: 0.02em; }
  .letter-paper-editor .compass { display: flex; justify-content: center; margin: 26px 0 22px; }
  .letter-paper-editor .compass svg { width: 118px; height: 118px; }
  .letter-paper-editor .certificate-signature { margin-top: 20px; line-height: 1.35; }
  .letter-paper-editor ol, .letter-paper-editor ul { padding-left: 22px; }
  .letter-paper-editor li { margin-bottom: 8px; }
  .letter-paper-editor .attachment-block img { max-width: 100%; height: auto; display: block; margin: 8px auto; }
  .letter-paper-editor .attachment-block { margin: 12px 0; }
  [data-editor-page-controls] { display: none !important; }
`;

// `--single-process` / `--no-zygote` are memory-savers needed on the small Linux server, but they
// crash Chromium on macOS — only apply them on Linux so local `npm run dev` works out of the box.
// Common system-Chromium install locations, checked when no usable PUPPETEER_EXECUTABLE_PATH is set.
const SYSTEM_CHROMIUM_PATHS = [
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/snap/bin/chromium",
];

// Resolve the Chromium binary at launch time. We trust PUPPETEER_EXECUTABLE_PATH only if the file
// actually exists (a stale/missing path is the usual "Chromium not installed" cause on servers),
// then fall back to scanning known system paths, then to Puppeteer's own bundled download.
function resolveChromiumExecutable(): string | undefined {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  for (const candidate of SYSTEM_CHROMIUM_PATHS) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

function launchOptions(): LaunchOptions {
  const executablePath = resolveChromiumExecutable();
  return {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-crash-reporter",
      "--crash-dumps-dir=/tmp",
      ...(process.platform === "linux" ? ["--no-zygote", "--single-process"] : []),
    ],
    ...(executablePath ? { executablePath } : {}),
  };
}

// Serialize renders so only one Chromium runs at a time (memory-safe on small servers).
let renderChain: Promise<unknown> = Promise.resolve();

function wrapDocument(bodyHtml: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${LETTER_PRINT_CSS}</style></head><body><div class="letter-paper-editor">${bodyHtml}</div></body></html>`;
}

export async function renderLetterHtmlToPdf(bodyHtml: string): Promise<Buffer> {
  const run = renderChain.then(() => renderOnce(bodyHtml));
  // Keep the chain alive even if this render rejects, but propagate the error to the caller.
  renderChain = run.catch(() => undefined);
  return run;
}

async function renderOnce(bodyHtml: string): Promise<Buffer> {
  const { default: puppeteer } = await import("puppeteer");
  let browser: Browser | undefined;
  try {
    try {
      browser = await puppeteer.launch(launchOptions());
    } catch (launchError) {
      const detail = launchError instanceof Error ? launchError.message : String(launchError);
      throw new Error(
        "Could not launch Chromium for PDF rendering. Install a system Chromium (e.g. `apt-get install -y chromium`) "
          + "and/or set PUPPETEER_EXECUTABLE_PATH to its path (commonly /usr/bin/chromium). "
          + `Underlying error: ${detail}`,
      );
    }
    const page = await browser.newPage();
    await page.setViewport({ width: 860, height: 1110 });
    await page.setContent(wrapDocument(bodyHtml), { waitUntil: "load", timeout: 30000 });

    // Images are inlined as data URIs, but still decode asynchronously — wait so their height
    // is included when we measure each section.
    await page.evaluate(() => Promise.all(
      Array.from(document.images).map((img) =>
        img.complete ? null : new Promise<void>((resolve) => { img.onload = img.onerror = () => resolve(); })),
    ));

    // Each <section> is one editor "sheet" that grows with its content (min-height: 1110px).
    // Render each section as its own page sized to that section's height so a single dense
    // section never splits across two PDF pages — matching the editor exactly.
    const heights = await page.evaluate(() => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>("section[data-ambey-page], section[data-letter-page]"));
      return sections.map((el) => Math.ceil(el.getBoundingClientRect().height));
    });

    // Fallback for letters that aren't section-based: render the whole body as one tall page.
    if (!heights.length) {
      const bodyHeight = await page.evaluate(() => Math.ceil(document.body.scrollHeight));
      const pdf = await page.pdf({
        width: "860px",
        height: `${bodyHeight + 2}px`,
        printBackground: true,
        preferCSSPageSize: false,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      return Buffer.from(pdf);
    }

    const pages: Buffer[] = [];
    for (let i = 0; i < heights.length; i++) {
      await page.evaluate((visibleIndex) => {
        const sections = Array.from(document.querySelectorAll<HTMLElement>("section[data-ambey-page], section[data-letter-page]"));
        sections.forEach((el, index) => { el.style.display = index === visibleIndex ? "" : "none"; });
      }, i);
      const pdf = await page.pdf({
        width: "860px",
        height: `${heights[i] + 2}px`,
        printBackground: true,
        preferCSSPageSize: false,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      pages.push(Buffer.from(pdf));
    }

    const merged = await PDFDocument.create();
    for (const buffer of pages) {
      const doc = await PDFDocument.load(buffer);
      const copied = await merged.copyPages(doc, doc.getPageIndices());
      for (const copiedPage of copied) merged.addPage(copiedPage);
    }
    return Buffer.from(await merged.save());
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
