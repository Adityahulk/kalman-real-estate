import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Browser, LaunchOptions } from "puppeteer";
import { PDFDocument } from "pdf-lib";
import { reflowPagesBrowserSource } from "@/lib/editor-page-overflow";

// Renders the letter editor's saved HTML to a PDF with real headless Chromium, so the PDF is a
// pixel-faithful copy of what the user sees in the "Letter Studio" editor (same HTML + same CSS).

// Print CSS is built from the real editor stylesheet so the saved draft and generated PDF do not
// drift apart. The small override block removes app-only paper chrome while keeping content layout.
const LETTER_PRINT_CSS = `
  @page { margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  ${loadLetterEditorCss()}
  .letter-paper-editor { display: block; gap: 0; color: #111827; font-family: "WideState Calibri", Carlito, Calibri, Arial, sans-serif; font-size: 17.3px; line-height: 1.25; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .letter-paper-editor [data-template="ambey-allotment"],
  .letter-paper-editor [data-letter-template] { display: block; gap: 0; }
  .letter-paper-editor section[data-ambey-page],
  .letter-paper-editor section[data-letter-page] {
    width: 860px !important;
    height: 1216px !important;
    min-height: 1216px !important;
    max-width: none !important;
    margin: 0 !important;
    /* Keep the editor's one-pixel box model without printing its grey outline. This makes the
       printable content boundary byte-for-byte equivalent to both visual editors. */
    border: 1px solid transparent !important;
    box-shadow: none !important;
    overflow: hidden;
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
  return inlineLetterFonts(stripCssBlock(css.slice(start, end), "@media (max-width: 900px)"));
}

function inlineLetterFonts(css: string) {
  const fontDirectory = join(process.cwd(), "public/fonts/carlito");
  const names = [
    "Carlito-Regular.woff2",
    "Carlito-Italic.woff2",
    "Carlito-Bold.woff2",
    "Carlito-BoldItalic.woff2",
  ];
  let inlined = css;
  for (const name of names) {
    const path = join(fontDirectory, name);
    if (!existsSync(path)) {
      console.error(`[letter-pdf] bundled letter font missing: ${path}`);
      continue;
    }
    const dataUrl = `data:font/woff2;base64,${readFileSync(path).toString("base64")}`;
    inlined = inlined.replaceAll(`/fonts/carlito/${name}`, dataUrl);
  }
  return inlined;
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

// We intentionally do NOT pass `--single-process` / `--no-zygote`: they shrink memory but crash
// Chromium during printToPDF on complex documents ("Target closed"). The standard multi-process
// headless config is stable; `--disable-dev-shm-usage` keeps it safe inside Docker's tiny /dev/shm.
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
      // Reduce memory footprint on small servers
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-translate",
      "--no-first-run",
      "--hide-scrollbars",
      "--mute-audio",
    ],
    ...(executablePath ? { executablePath } : {}),
  };
}

// Hard ceiling on a single render. Without this, a Chromium crash (e.g. OOM on a small server)
// leaves renderOnce hanging forever — and because renders are serialized, the whole queue deadlocks.
const RENDER_DEADLINE_MS = 60_000;
const EDITOR_PAGE_WIDTH_PX = 860;
const EDITOR_PAGE_HEIGHT_PX = 1216;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const POINTS_PER_MM = 72 / 25.4;
const A4_WIDTH_PT = A4_WIDTH_MM * POINTS_PER_MM;
const A4_HEIGHT_PT = A4_HEIGHT_MM * POINTS_PER_MM;
const CSS_PX_TO_MM = 25.4 / 96;
const A4_RENDER_SCALE = A4_WIDTH_MM / (EDITOR_PAGE_WIDTH_PX * CSS_PX_TO_MM);

function withDeadline<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer)) as Promise<T>;
}

// browser.close() itself can hang if Chromium is already dead (the OOM case). A hung close
// re-deadlocks the queue. Give it 5s then SIGKILL the child process directly.
async function closeBrowserSafely(browser: Browser): Promise<void> {
  const proc = browser.process();
  let killed = false;
  const guard = new Promise<void>((resolve) => setTimeout(() => { killed = true; resolve(); }, 5000));
  await Promise.race([browser.close().catch(() => undefined), guard]);
  if (killed) {
    try { proc?.kill("SIGKILL"); } catch { /* already gone */ }
  }
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
    return await withDeadline(renderWithBrowser(browser, bodyHtml), RENDER_DEADLINE_MS, "PDF render");
  } finally {
    if (browser) await closeBrowserSafely(browser);
  }
}

async function renderWithBrowser(browser: Browser, bodyHtml: string): Promise<Buffer> {
    const page = await browser.newPage();
    await page.setViewport({ width: 860, height: 1110 });
    await page.setContent(wrapDocument(bodyHtml), { waitUntil: "load", timeout: 30000 });

    // Pagination is font-metric-sensitive. Wait for the bundled Calibri-compatible family before
    // measuring any section; otherwise a Linux server can paginate once with Liberation Sans and
    // print later with Carlito, making Edit Draft and the final PDF disagree.
    await page.evaluate(() => document.fonts.ready);

    // Images are inlined as data URIs but decode asynchronously — wait so heights are correct.
    // Cap each image at 5s so a broken URL can't hang the whole render.
    await page.evaluate(() => Promise.all(
      Array.from(document.images).map((img) =>
        img.complete ? null : new Promise<void>((resolve) => {
          img.onload = img.onerror = () => resolve();
          setTimeout(resolve, 5000);
        })),
    ));

    // Each <section> is one editor sheet. The editor already repaginates while the user works, so
    // rendering must preserve those saved sheets exactly. Repacking here can make the PDF drift from
    // the approved draft, for example showing 13 downloaded pages for a 16-page editor draft.
    const measureSections = () => page.evaluate(() => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>("section[data-ambey-page], section[data-letter-page]"));
      return sections.map((el, index) => {
        const pageRect = el.getBoundingClientRect();
        const paddingBottom = Number.parseFloat(getComputedStyle(el).paddingBottom) || 0;
        const children = Array.from(el.children).map((child) => {
          const rect = child.getBoundingClientRect();
          const position = getComputedStyle(child).position;
          return {
            tag: child.tagName,
            className: child.className,
            outOfFlow: position === "absolute" || position === "fixed",
            top: Math.round(rect.top - pageRect.top),
            bottom: Math.round(rect.bottom - pageRect.top),
          };
        });
        const contentBottom = children.reduce((bottom, child) => child.outOfFlow ? bottom : Math.max(bottom, child.bottom), 0);
        return {
          index,
          height: Math.ceil(pageRect.height),
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
          contentBottom,
          contentLimit: Math.floor(el.clientHeight - paddingBottom),
          children,
        };
      });
    });
    let sections = await measureSections();
    const sectionOverflows = (section: (typeof sections)[number]) => section.contentBottom > section.contentLimit + 1;

    // Preserve every valid saved sheet exactly. Only legacy/stale drafts with real overflow are
    // normalized, using the same paginator as both browser editors. This repairs direct API saves and
    // old drafts without re-packing intentional blank/manual pages that already fit on A4.
    if (sections.some(sectionOverflows)) {
      // The visual editors reflow once immediately and again after the browser's next layout frame
      // (fonts/images and moved blocks can alter wrapping). Mirror that settle cycle here. A single
      // synchronous pass could move the final controls to page 6, then measure page 5 before its
      // paragraph geometry had settled, producing a false extra-page/overflow result.
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await page.evaluate(
          `${reflowPagesBrowserSource}(document.querySelector(".letter-paper-editor"), { pageHeight: 1216 })`,
        );
        await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        sections = await measureSections();
        if (sections.every((section) => !sectionOverflows(section))) break;
      }
    }

    // Fallback for letters that aren't section-based: let Chromium paginate the body on A4.
    if (!sections.length) {
      const pdf = await page.pdf({
        width: `${A4_WIDTH_MM}mm`,
        height: `${A4_HEIGHT_MM}mm`,
        scale: A4_RENDER_SCALE,
        printBackground: true,
        preferCSSPageSize: false,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      return Buffer.from(pdf);
    }

    const overflowing = sections.find(sectionOverflows);
    if (overflowing) {
      console.error("[letter-pdf] A4 layout overflow", JSON.stringify({
        page: overflowing.index + 1,
        pageCount: sections.length,
        clientHeight: overflowing.clientHeight,
        scrollHeight: overflowing.scrollHeight,
        contentBottom: overflowing.contentBottom,
        contentLimit: overflowing.contentLimit,
        children: overflowing.children,
      }));
      throw new Error(
        `A4 layout overflow on editor page ${overflowing.index + 1} `
          + `(content reaches ${overflowing.contentBottom}px; printable limit ${overflowing.contentLimit}px). `
          + "Return to Edit Draft, let the pages finish arranging, and generate the PDF again.",
      );
    }

    // Render each editor section at its native 860x1216 CSS-pixel canvas. Chromium calculates print
    // pagination before applying page.pdf's scale option; asking it to print directly on 210x297mm
    // could therefore split one otherwise valid editor sheet into two pages. We keep the native
    // vector page here, then scale that vector page to physical A4 with pdf-lib below.
    const merged = await PDFDocument.create();
    for (let i = 0; i < sections.length; i++) {
      await page.evaluate((visibleIndex) => {
        const sections = Array.from(document.querySelectorAll<HTMLElement>("section[data-ambey-page], section[data-letter-page]"));
        sections.forEach((el, index) => {
          el.style.display = index === visibleIndex ? "" : "none";
          if (index === visibleIndex) {
            el.style.setProperty("break-after", "auto", "important");
            el.style.setProperty("page-break-after", "auto", "important");
          }
        });
      }, i);
      // Switching sheets changes both grid layout and paint visibility. Waiting for two frames
      // prevents Chromium from capturing a recently unhidden page before its text has painted,
      // which otherwise appears as an intermittent blank page in the merged PDF.
      await page.evaluate(() => new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }));
      const pdf = await page.pdf({
        width: `${EDITOR_PAGE_WIDTH_PX}px`,
        height: `${EDITOR_PAGE_HEIGHT_PX}px`,
        scale: 1,
        printBackground: true,
        preferCSSPageSize: false,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      const sectionPdf = Buffer.from(pdf);
      const sectionDocument = await PDFDocument.load(sectionPdf);
      if (sectionDocument.getPageCount() !== 1) {
        throw new Error(
          `A4 layout overflow on editor page ${i + 1}: Chromium produced `
            + `${sectionDocument.getPageCount()} physical pages for one editor sheet.`,
        );
      }
      const embedded = await merged.embedPage(sectionDocument.getPage(0));
      const a4Page = merged.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
      a4Page.drawPage(embedded, { x: 0, y: 0, width: A4_WIDTH_PT, height: A4_HEIGHT_PT });
    }
    return Buffer.from(await merged.save());
}
