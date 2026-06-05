import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

type RenderContext = {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  y: number;
};

const PAGE_WIDTH = 595.32;
const PAGE_HEIGHT = 841.92;
const LEFT = 72;
const RIGHT = 72;
const TEXT_WIDTH = PAGE_WIDTH - LEFT - RIGHT;
const BODY_SIZE = 10.4;
const LINE_HEIGHT = 14.4;

export function isLetterStudioHtml(html: string) {
  return /data-template=["']ambey-allotment["']/i.test(html) || /data-letter-template=["'][^"']+["']/i.test(html);
}

export async function buildLetterStudioPdfFromHtml(html: string) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const sections = extractSections(html);

  for (const section of sections) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const context: RenderContext = {
      page,
      font,
      bold,
      italic,
      y: Number(section.attrs["data-top"] ?? 790),
    };
    renderSection(context, section.html);
  }

  return Buffer.from(await pdf.save());
}

function extractSections(html: string) {
  const sections: Array<{ attrs: Record<string, string>; html: string }> = [];
  const pattern = /<section\b([^>]*)(?:data-ambey-page|data-letter-page)=["'][^"']+["']([^>]*)>([\s\S]*?)<\/section>/gi;
  for (const match of html.matchAll(pattern)) {
    sections.push({ attrs: parseAttrs(`${match[1]} ${match[2]}`), html: match[3] });
  }
  return sections.length ? sections : [{ attrs: { "data-top": "790" }, html }];
}

function renderSection(context: RenderContext, html: string) {
  const blockPattern = /<(h1|h2|p|table|div)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  for (const match of html.matchAll(blockPattern)) {
    const tag = match[1].toLowerCase();
    const attrs = parseAttrs(match[2]);
    const body = match[3];
    if (tag === "h1" || tag === "h2") {
      drawHeading(context, body, tag === "h1" ? 14 : 11.2);
    } else if (tag === "p") {
      drawParagraph(context, body, attrs);
    } else if (tag === "table") {
      drawTable(context, body, attrs);
    } else if (tag === "div") {
      drawSpecialBox(context, body, attrs);
    }
  }
}

function drawHeading(context: RenderContext, html: string, size: number) {
  const lines = textFromHtml(html).split("\n").map((line) => line.trim()).filter(Boolean);
  context.y -= 4;
  for (const line of lines) {
    const width = context.bold.widthOfTextAtSize(line, size);
    const x = (PAGE_WIDTH - width) / 2;
    context.page.drawText(line, { x, y: context.y, size, font: context.bold, color: rgb(0.12, 0.15, 0.18) });
    if (html.includes("<u>")) {
      context.page.drawLine({ start: { x, y: context.y - 2 }, end: { x: x + width, y: context.y - 2 }, thickness: 0.8, color: rgb(0.12, 0.15, 0.18) });
    }
    context.y -= size + 6;
  }
  context.y -= 8;
}

function drawParagraph(context: RenderContext, html: string, attrs: Record<string, string>) {
  if (html.includes("right-inline")) {
    const [leftHtml, rightHtml = ""] = html.split(/<span\b[^>]*right-inline[^>]*>/i);
    const rightClean = rightHtml.replace(/<\/span>/i, "");
    drawSingleLine(context, textFromHtml(leftHtml), "left", html.includes("<strong>"));
    drawSingleLine(context, textFromHtml(rightClean), "right", html.includes("<strong>"));
    context.y -= 16;
    return;
  }

  const className = attrs.class ?? "";
  const align = className.includes("right") ? "right" : className.includes("center") ? "center" : "left";
  const useBold = className.includes("bold");
  const useItalic = html.includes("<em>");
  const chunks = textFromHtml(html).split("\n");
  for (const chunk of chunks) {
    const raw = chunk.trim();
    if (!raw) {
      context.y -= LINE_HEIGHT;
      continue;
    }
    const lines = wrapText(raw, useItalic ? context.italic : useBold ? context.bold : context.font, BODY_SIZE, TEXT_WIDTH);
    for (const line of lines) drawSingleLine(context, line, align, useBold, useItalic);
  }
  context.y -= 8;
}

function drawSingleLine(context: RenderContext, text: string, align: "left" | "center" | "right", bold = false, italic = false) {
  const font = italic ? context.italic : bold ? context.bold : context.font;
  const width = font.widthOfTextAtSize(text, BODY_SIZE);
  const x = align === "right" ? PAGE_WIDTH - RIGHT - width : align === "center" ? (PAGE_WIDTH - width) / 2 : LEFT;
  context.page.drawText(text, { x, y: context.y, size: BODY_SIZE, font, color: rgb(0.12, 0.15, 0.18) });
  context.y -= LINE_HEIGHT;
}

function drawTable(context: RenderContext, html: string, attrs: Record<string, string>) {
  const rows = parseRows(html);
  if (!rows.length) return;
  const className = attrs.class ?? "";
  if (className.includes("plain")) {
    const widths = className.includes("side-table") ? [100, 105, 160] : [140, 160, 150];
    for (const row of rows) {
      let x = LEFT;
      const rowHeight = 23;
      row.forEach((cell, index) => {
        context.page.drawText(cell.text, { x, y: context.y, size: BODY_SIZE, font: cell.header ? context.bold : context.font, color: rgb(0.12, 0.15, 0.18) });
        x += widths[index] ?? 120;
      });
      context.y -= rowHeight;
    }
    context.y -= 10;
    return;
  }

  const widths = className.includes("payments") ? [120, 120, 95, 116] : [140, TEXT_WIDTH - 140];
  const tableX = LEFT;
  let y = context.y;
  for (const row of rows) {
    const wrapped = row.map((cell, index) => wrapText(cell.text, cell.header ? context.bold : context.font, BODY_SIZE, (widths[index] ?? 120) - 10));
    const rowHeight = Math.max(28, Math.max(...wrapped.map((lines) => lines.length)) * 13 + 10);
    let x = tableX;
    row.forEach((cell, index) => {
      const width = widths[index] ?? 120;
      context.page.drawRectangle({ x, y: y - rowHeight + 4, width, height: rowHeight, borderColor: rgb(0.35, 0.35, 0.35), borderWidth: 0.6 });
      let textY = y - 10;
      for (const line of wrapped[index]) {
        context.page.drawText(line, { x: x + 6, y: textY, size: BODY_SIZE, font: cell.header ? context.bold : context.font, color: rgb(0.12, 0.15, 0.18) });
        textY -= 13;
      }
      x += width;
    });
    y -= rowHeight;
  }
  context.y = y - 18;
}

function drawSpecialBox(context: RenderContext, html: string, attrs: Record<string, string>) {
  const className = attrs.class ?? "";
  if (className.includes("site-plan-box")) {
    const x = 365;
    const y = 330;
    context.page.drawRectangle({ x, y, width: 150, height: 150, borderWidth: 1.4, borderColor: rgb(0.12, 0.15, 0.18) });
    const label = textFromHtml(html);
    const labelWidth = context.bold.widthOfTextAtSize(label, BODY_SIZE);
    context.page.drawText(label, { x: x + (150 - labelWidth) / 2, y: y - 38, size: BODY_SIZE, font: context.bold });
    drawCompass(context.page, context.font, x + 75, y - 105);
    context.y = Math.min(context.y, 145);
    return;
  }

  if (className.includes("photo-box")) {
    const bottomLeft = className.includes("bottom-left");
    const rightMid = className.includes("right-mid");
    const box = bottomLeft
      ? { x: 80, y: 130, width: 88, height: 96 }
      : rightMid
        ? { x: 430, y: 395, width: 100, height: 135 }
        : { x: LEFT, y: context.y - 95, width: 90, height: 90 };
    context.page.drawRectangle({ ...box, borderWidth: 0.8, borderColor: rgb(0.35, 0.35, 0.35) });
    const inner = { x: box.x + 8, y: box.y + 18, width: box.width - 16, height: box.height - 36 };
    context.page.drawRectangle({ ...inner, borderWidth: 0.5, borderColor: rgb(0.55, 0.55, 0.55) });
    const lines = textFromHtml(html).split("\n").map((line) => line.trim()).filter(Boolean);
    let textY = inner.y + inner.height - 18;
    for (const line of lines) {
      const width = context.font.widthOfTextAtSize(line, 8);
      context.page.drawText(line, { x: inner.x + (inner.width - width) / 2, y: textY, size: 8, font: context.font });
      textY -= 12;
    }
  }
}

function drawCompass(page: PDFPage, font: PDFFont, cx: number, cy: number) {
  page.drawCircle({ x: cx, y: cy, size: 25, borderColor: rgb(0.45, 0.45, 0.45), borderWidth: 0.6 });
  page.drawCircle({ x: cx, y: cy, size: 6, borderColor: rgb(0.1, 0.1, 0.1), borderWidth: 1 });
  page.drawLine({ start: { x: cx, y: cy + 32 }, end: { x: cx, y: cy - 32 }, thickness: 0.8 });
  page.drawLine({ start: { x: cx - 32, y: cy }, end: { x: cx + 32, y: cy }, thickness: 0.8 });
  page.drawText("N", { x: cx - 3, y: cy + 38, size: 7, font });
  page.drawText("S", { x: cx - 3, y: cy - 46, size: 7, font });
  page.drawText("W", { x: cx - 45, y: cy - 3, size: 7, font });
  page.drawText("E", { x: cx + 39, y: cy - 3, size: 7, font });
}

function parseRows(html: string) {
  const rows: Array<Array<{ text: string; header: boolean }>> = [];
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells: Array<{ text: string; header: boolean }> = [];
    for (const cellMatch of rowMatch[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
      cells.push({ text: textFromHtml(cellMatch[2]).replace(/\n/g, " ").trim(), header: cellMatch[1].toLowerCase() === "th" });
    }
    if (cells.length) rows.push(cells);
  }
  return rows;
}

function wrapText(text: string, font: PDFFont, size: number, width: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function textFromHtml(html: string) {
  return decodeHtml(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function parseAttrs(raw: string) {
  const attrs: Record<string, string> = {};
  for (const match of raw.matchAll(/([\w-]+)=["']([^"']*)["']/g)) attrs[match[1]] = match[2];
  return attrs;
}

function decodeHtml(text: string) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
