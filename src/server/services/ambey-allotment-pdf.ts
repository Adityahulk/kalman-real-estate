import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

type RenderContext = {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
  y: number;
};

const PAGE_WIDTH = 595.32;
const PAGE_HEIGHT = 841.92;
const LEFT = 72;
const RIGHT = 72;
const TEXT_WIDTH = PAGE_WIDTH - LEFT - RIGHT;
const BODY_SIZE = 10.4;
const LINE_HEIGHT = 14.4;
const INK = rgb(0.12, 0.15, 0.18);

// One contiguous run of identically-styled characters within a word.
type StyledRun = { text: string; b: boolean; i: boolean; u: boolean };
// A space-delimited word, possibly containing several differently-styled runs.
type Word = StyledRun[];

export function isLetterStudioHtml(html: string) {
  return /data-template=["']ambey-allotment["']/i.test(html) || /data-letter-template=["'][^"']+["']/i.test(html);
}

export async function buildLetterStudioPdfFromHtml(html: string) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const boldItalic = await pdf.embedFont(StandardFonts.HelveticaBoldOblique);
  const sections = extractSections(html);

  for (const section of sections) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const context: RenderContext = {
      pdf,
      page,
      font,
      bold,
      italic,
      boldItalic,
      y: Number(section.attrs["data-top"] ?? 790),
    };
    await renderSection(context, section.html);
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

async function renderSection(context: RenderContext, html: string) {
  const blockPattern = /<(h1|h2|p|table|div)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  for (const match of html.matchAll(blockPattern)) {
    const tag = match[1].toLowerCase();
    const attrs = parseAttrs(match[2]);
    const body = match[3];
    if (tag === "h1" || tag === "h2") {
      drawHeading(context, body, tag === "h1" ? 14 : 11.2);
    } else if (tag === "p") {
      await drawParagraph(context, body, attrs);
    } else if (tag === "table") {
      drawTable(context, body, attrs);
    } else if (tag === "div") {
      await drawSpecialBox(context, body, attrs);
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

async function drawParagraph(context: RenderContext, html: string, attrs: Record<string, string>) {
  // A pasted/inserted image lives inside a paragraph as <img src="data:...">. Render it as an image
  // (text around it, if any, is rendered as plain lines).
  if (/<img\b/i.test(html)) {
    for (const part of html.split(/(<img\b[^>]*>)/i)) {
      const imgMatch = part.match(/<img\b[^>]*src=["']([^"']+)["']/i);
      if (imgMatch) {
        await drawImage(context, imgMatch[1]);
        continue;
      }
      const text = textFromHtml(part).trim();
      if (text) for (const line of wrapText(text, context.font, BODY_SIZE, TEXT_WIDTH)) drawSingleLine(context, line, "left");
    }
    context.y -= 8;
    return;
  }
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
  const forceBold = className.includes("bold");
  // Each <br> starts a new hard line; words inside carry their own bold/italic/underline styling.
  for (const hardLine of parseStyledLines(html)) {
    if (!hardLine.length) {
      context.y -= LINE_HEIGHT;
      continue;
    }
    for (const visualLine of wrapWords(context, hardLine, BODY_SIZE, TEXT_WIDTH)) {
      drawWordLine(context, visualLine, align, forceBold);
    }
  }
  context.y -= 8;
}

function fontFor(context: RenderContext, bold: boolean, italic: boolean) {
  if (bold && italic) return context.boldItalic;
  if (bold) return context.bold;
  if (italic) return context.italic;
  return context.font;
}

function runWidth(context: RenderContext, run: StyledRun, size: number) {
  return fontFor(context, run.b, run.i).widthOfTextAtSize(run.text, size);
}

function wordWidth(context: RenderContext, word: Word, size: number) {
  return word.reduce((sum, run) => sum + runWidth(context, run, size), 0);
}

// Parse a paragraph's inner HTML into hard lines (split on <br>) of space-delimited
// words, tracking nested <b>/<strong>, <i>/<em> and <u> styling per character.
function parseStyledLines(html: string): Word[][] {
  const lines: Word[][] = [];
  let words: Word[] = [];
  let word: Word = [];
  let bold = 0, italic = 0, underline = 0;

  const flushWord = () => { if (word.length) { words.push(word); word = []; } };
  const flushLine = () => { flushWord(); lines.push(words); words = []; };
  const appendText = (text: string) => {
    for (const ch of text) {
      if (ch === " " || ch === "\t" || ch === "\n") { flushWord(); continue; }
      const b = bold > 0, i = italic > 0, u = underline > 0;
      const last = word[word.length - 1];
      if (last && last.b === b && last.i === i && last.u === u) last.text += ch;
      else word.push({ text: ch, b, i, u });
    }
  };

  for (const match of html.matchAll(/<[^>]+>|[^<]+/g)) {
    const token = match[0];
    if (token[0] === "<") {
      const closing = token.startsWith("</");
      const tag = token.replace(/[<>/]/g, "").trim().split(/\s/)[0].toLowerCase();
      if (tag === "br") { flushLine(); continue; }
      const delta = closing ? -1 : 1;
      if (tag === "b" || tag === "strong") bold = Math.max(0, bold + delta);
      else if (tag === "i" || tag === "em") italic = Math.max(0, italic + delta);
      else if (tag === "u") underline = Math.max(0, underline + delta);
    } else {
      appendText(decodeHtml(token));
    }
  }
  flushLine();
  return lines;
}

// Greedily wrap words into visual lines that fit within maxWidth.
function wrapWords(context: RenderContext, words: Word[], size: number, maxWidth: number): Word[][] {
  const spaceW = context.font.widthOfTextAtSize(" ", size);
  const lines: Word[][] = [];
  let line: Word[] = [];
  let width = 0;
  for (const word of words) {
    const ww = wordWidth(context, word, size);
    const add = line.length ? spaceW + ww : ww;
    if (line.length && width + add > maxWidth) {
      lines.push(line);
      line = [word];
      width = ww;
    } else {
      line.push(word);
      width += add;
    }
  }
  if (line.length) lines.push(line);
  return lines.length ? lines : [[]];
}

function drawWordLine(context: RenderContext, words: Word[], align: "left" | "center" | "right", forceBold: boolean) {
  const size = BODY_SIZE;
  const spaceW = context.font.widthOfTextAtSize(" ", size);
  const total = words.reduce((sum, word, index) => sum + wordWidth(context, word, size) + (index ? spaceW : 0), 0);
  const y = context.y;
  let x = align === "right" ? PAGE_WIDTH - RIGHT - total : align === "center" ? (PAGE_WIDTH - total) / 2 : LEFT;

  words.forEach((word, wi) => {
    if (wi) {
      // Keep the underline continuous across a space when both neighbouring runs are underlined.
      const prevUnderlined = words[wi - 1][words[wi - 1].length - 1]?.u;
      const nextUnderlined = word[0]?.u;
      if (prevUnderlined && nextUnderlined) {
        context.page.drawLine({ start: { x, y: y - 2 }, end: { x: x + spaceW, y: y - 2 }, thickness: 0.6, color: INK });
      }
      x += spaceW;
    }
    for (const run of word) {
      const font = fontFor(context, run.b || forceBold, run.i);
      const w = font.widthOfTextAtSize(run.text, size);
      context.page.drawText(run.text, { x, y, size, font, color: INK });
      if (run.u) context.page.drawLine({ start: { x, y: y - 2 }, end: { x: x + w, y: y - 2 }, thickness: 0.6, color: INK });
      x += w;
    }
  });
  context.y -= LINE_HEIGHT;
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
        context.page.drawText(cell.text, { x, y: context.y, size: BODY_SIZE, font: cell.header || cell.bold ? context.bold : context.font, color: rgb(0.12, 0.15, 0.18) });
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
    const wrapped = row.map((cell, index) => wrapText(cell.text, cell.header || cell.bold ? context.bold : context.font, BODY_SIZE, (widths[index] ?? 120) - 10));
    const rowHeight = Math.max(28, Math.max(...wrapped.map((lines) => lines.length)) * 13 + 10);
    let x = tableX;
    row.forEach((cell, index) => {
      const width = widths[index] ?? 120;
      context.page.drawRectangle({ x, y: y - rowHeight + 4, width, height: rowHeight, borderColor: rgb(0.35, 0.35, 0.35), borderWidth: 0.6 });
      let textY = y - 10;
      for (const line of wrapped[index]) {
        context.page.drawText(line, { x: x + 6, y: textY, size: BODY_SIZE, font: cell.header || cell.bold ? context.bold : context.font, color: rgb(0.12, 0.15, 0.18) });
        textY -= 13;
      }
      x += width;
    });
    y -= rowHeight;
  }
  context.y = y - 18;
}

async function drawSpecialBox(context: RenderContext, html: string, attrs: Record<string, string>) {
  const className = attrs.class ?? "";
  if (className.includes("attachment-block")) {
    await drawAttachmentBlock(context, html);
    return;
  }
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

  // photo-box: the source document simply leaves a blank space to physically affix a photo.
  // Reserve that space (no border, no placeholder text). The boxes are positioned absolutely
  // so they don't consume flow — drawing nothing leaves clean empty space.
}

// Render a data-URL image centred at a modest size so multiple images can share a page.
async function drawImage(context: RenderContext, dataUrl: string, maxHeight = 170) {
  const imageBytes = decodeDataUrl(dataUrl);
  if (!imageBytes) return;
  const image = imageBytes.mimeType === "image/png"
    ? await context.pdf.embedPng(imageBytes.bytes)
    : await context.pdf.embedJpg(imageBytes.bytes);
  const scale = Math.min(TEXT_WIDTH / image.width, maxHeight / image.height, 1);
  const width = image.width * scale;
  const height = image.height * scale;
  context.page.drawImage(image, { x: (PAGE_WIDTH - width) / 2, y: context.y - height, width, height });
  context.y -= height + 12;
}

async function drawAttachmentBlock(context: RenderContext, html: string) {
  const srcMatch = html.match(/<img\b[^>]*src=["']([^"']+)["']/i);
  if (srcMatch) {
    await drawImage(context, srcMatch[1]);
    return;
  }
  // Non-image fallback (e.g. "could not be loaded"): render its text only, no box.
  const text = textFromHtml(html).trim();
  if (text) {
    drawSingleLine(context, text, "center");
    context.y -= 6;
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
  const rows: Array<Array<{ text: string; header: boolean; bold: boolean }>> = [];
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells: Array<{ text: string; header: boolean; bold: boolean }> = [];
    for (const cellMatch of rowMatch[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
      cells.push({
        text: textFromHtml(cellMatch[2]).replace(/\n/g, " ").trim(),
        header: cellMatch[1].toLowerCase() === "th",
        bold: /<(strong|b)\b/i.test(cellMatch[2]),
      });
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

function decodeDataUrl(value: string) {
  const match = value.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/i);
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase(),
    bytes: Buffer.from(match[2], "base64"),
  };
}
