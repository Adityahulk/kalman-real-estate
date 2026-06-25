import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Browser, LaunchOptions } from "puppeteer";
import { PDFDocument } from "pdf-lib";

// Renders the letter editor's saved HTML to a PDF with real headless Chromium, so the PDF is a
// pixel-faithful copy of what the user sees in the "Letter Studio" editor (same HTML + same CSS).

// Print CSS is built from the real editor stylesheet so the saved draft and generated PDF do not
// drift apart. The small override block removes app-only paper chrome while keeping content layout.
const LETTER_PRINT_CSS = `
  @page { margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  ${loadLetterEditorCss()}
  .letter-paper-editor { display: block; gap: 0; color: #111827; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .letter-paper-editor [data-template="ambey-allotment"],
  .letter-paper-editor [data-letter-template] { display: block; gap: 0; }
  .letter-paper-editor section[data-ambey-page],
  .letter-paper-editor section[data-letter-page] {
    width: 860px !important;
    max-width: none !important;
    margin: 0 !important;
    border: 0 !important;
    box-shadow: none !important;
    overflow: visible;
    break-after: page;
    page-break-after: always;
  }
  .letter-paper-editor section[data-ambey-page]:last-child,
  .letter-paper-editor section[data-letter-page]:last-child { break-after: auto; page-break-after: auto; }
  [data-editor-page-controls] { display: none !important; }
`;

function loadLetterEditorCss() {
  // The renderer needs the editor stylesheet at runtime. The Next standalone image does not ship
  // raw source, so the Dockerfile copies globals.css to /app/src/styles. Probe a couple of likely
  // locations so a layout change in either the repo or the image can't silently strip all styling.
  const candidates = [
    join(process.cwd(), "src/styles/globals.css"),
    join(__dirname, "../../../src/styles/globals.css"),
  ];
  const stylesheet = candidates.find((path) => existsSync(path));
  if (!stylesheet) {
    console.error("[letter-pdf] globals.css not found at any of:", candidates,
      "— PDFs will render UNSTYLED. Ensure the stylesheet is copied into the runtime image.");
    return "";
  }
  const css = readFileSync(stylesheet, "utf8");
  const start = css.indexOf("/* Letter Studio paper canvas */");
  const end = css.indexOf(".letter-template-editor-viewport", start);
  if (start === -1 || end === -1) {
    console.error("[letter-pdf] Letter Studio CSS markers missing in globals.css — PDFs will render UNSTYLED.");
    return "";
  }
  return stripCssBlock(css.slice(start, end), "@media (max-width: 900px)");
}

function stripCssBlock(css: string, selector: string) {
  const start = css.indexOf(selector);
  if (start === -1) return css;
  const open = css.indexOf("{", start);
  if (open === -1) return css;
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    else if (css[index] === "}") {
      depth -= 1;
      if (depth === 0) return `${css.slice(0, start)}${css.slice(index + 1)}`;
    }
  }
  return css;
}

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
