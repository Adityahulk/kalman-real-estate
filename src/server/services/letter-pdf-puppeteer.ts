import type { Browser, LaunchOptions } from "puppeteer";
import { PDFDocument } from "pdf-lib";

// Renders the letter editor's saved HTML to a PDF with real headless Chromium, so the PDF is a
// pixel-faithful copy of what the user sees in the "Letter Studio" editor (same HTML + same CSS).

// Print CSS mirrors the editor's `.letter-paper-editor` rules in src/styles/globals.css, minus
// screen-only affordances (shadow/outer border/gap) and plus paged rules so each <section> is one page.
// Keep this in sync with globals.css `.letter-paper-editor`.
const LETTER_PRINT_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .letter-paper-editor { color: #111827; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.58; }
  .letter-paper-editor section[data-ambey-page],
  .letter-paper-editor section[data-letter-page] {
    width: 860px;
    min-height: 1110px;
    padding: 82px 96px;
    background: #fff;
    break-after: page;
    page-break-after: always;
  }
  .letter-paper-editor section[data-ambey-page]:last-child,
  .letter-paper-editor section[data-letter-page]:last-child { break-after: auto; page-break-after: auto; }
  .letter-paper-editor section[data-ambey-page="1"],
  .letter-paper-editor section[data-ambey-page="2"] { padding-top: 190px; }
  .letter-paper-editor h1, .letter-paper-editor h2, .letter-paper-editor h3 {
    margin: 0 0 14px; color: #111827; font-weight: 700; text-align: center; white-space: pre-wrap;
  }
  .letter-paper-editor p { margin: 0 0 12px; white-space: pre-wrap; }
  .letter-paper-editor .right { text-align: right; }
  .letter-paper-editor .center { text-align: center; }
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
  .letter-paper-editor th, .letter-paper-editor td { border: 1px solid #475569; padding: 8px 10px; vertical-align: top; white-space: pre-wrap; }
  .letter-paper-editor .plain th, .letter-paper-editor .plain td { border: 0; padding: 4px 0; }
  .letter-paper-editor .side-table th, .letter-paper-editor .side-table td { text-align: center; }
  .letter-paper-editor .possession-layout { display: flex; gap: 24px; align-items: flex-start; margin: 12px 0; }
  .letter-paper-editor .possession-layout .side-table { flex: 1; margin: 0; }
  .letter-paper-editor .possession-aside { width: 240px; flex-shrink: 0; }
  .letter-paper-editor .possession-aside .site-plan-box { min-height: 170px; }
  .letter-paper-editor .compass { display: flex; justify-content: center; margin: 10px 0; }
  .letter-paper-editor .compass svg { width: 120px; height: 120px; }
  .letter-paper-editor ol, .letter-paper-editor ul { padding-left: 22px; }
  .letter-paper-editor li { margin-bottom: 8px; }
  .letter-paper-editor .attachment-block img { max-width: 100%; height: auto; display: block; margin: 8px auto; }
  .letter-paper-editor .attachment-block { margin: 12px 0; }
  [data-editor-page-controls] { display: none !important; }
`;

// `--single-process` / `--no-zygote` are memory-savers needed on the small Linux server, but they
// crash Chromium on macOS — only apply them on Linux so local `npm run dev` works out of the box.
const LAUNCH_OPTIONS: LaunchOptions = {
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    ...(process.platform === "linux" ? ["--no-zygote", "--single-process"] : []),
  ],
  ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {}),
};

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
    browser = await puppeteer.launch(LAUNCH_OPTIONS);
    const page = await browser.newPage();
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
      const pdf = await page.pdf({ width: "860px", height: `${bodyHeight + 2}px`, printBackground: true, preferCSSPageSize: false });
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
        pageRanges: "1",
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
