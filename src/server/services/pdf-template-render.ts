import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";

export type PdfTemplateField = {
  id: string;
  label: string;
  sourceText?: string;
  mapping: string | null;
  rects?: Array<{
    pageNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
};

export async function buildPdfFromExactTemplate(input: {
  bytes: Buffer;
  fields: PdfTemplateField[];
  values: Record<string, string>;
}) {
  const pdf = await PDFDocument.load(input.bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();

  for (const field of input.fields) {
    const value = input.values[`field.${field.id}`] ?? "";
    if (!value.trim() || (!field.mapping && field.sourceText && normalizedText(value) === normalizedText(field.sourceText))) {
      continue;
    }
    const rects = field.rects ?? [];
    const pageRects = rects.flatMap((rect) => {
      const page = pages[rect.pageNumber - 1];
      if (!page) return [];
      const { width: pageWidth, height: pageHeight } = page.getSize();
      return [{
        page,
        x: rect.x * pageWidth,
        y: pageHeight - ((rect.y + rect.height) * pageHeight),
        width: rect.width * pageWidth,
        height: rect.height * pageHeight,
      }];
    });
    for (const rect of pageRects) {
      const pad = Math.max(1.2, rect.height * 0.12);
      rect.page.drawRectangle({
        x: rect.x - pad,
        y: rect.y - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        color: rgb(1, 1, 1),
      });
    }
    if (!pageRects.length) continue;

    const ordered = [...pageRects].sort((first, second) => second.y - first.y || first.x - second.x);
    const fontSize = fittedFontSize(value, ordered, font);
    const lines = wrapIntoRects(value, ordered, font, fontSize);
    for (const { text, rect } of lines) {
      rect.page.drawText(text, {
        x: rect.x,
        y: rect.y + Math.max(1, (rect.height - fontSize) / 2),
        size: fontSize,
        font,
        color: rgb(0.05, 0.05, 0.05),
      });
      rect.page.drawLine({
        start: { x: rect.x, y: rect.y + 0.8 },
        end: { x: Math.min(rect.x + rect.width, rect.x + font.widthOfTextAtSize(text, fontSize)), y: rect.y + 0.8 },
        thickness: Math.max(0.35, fontSize * 0.045),
        color: rgb(0.05, 0.05, 0.05),
      });
    }
  }

  return Buffer.from(await pdf.save());
}

function normalizedText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

type DrawRect = {
  page: ReturnType<PDFDocument["getPages"]>[number];
  x: number;
  y: number;
  width: number;
  height: number;
};

function fittedFontSize(value: string, rects: DrawRect[], font: PDFFont) {
  const minHeight = Math.min(...rects.map((rect) => rect.height));
  let size = Math.max(6, Math.min(13.5, minHeight * 0.68));
  if (rects.length === 1) {
    while (size > 6 && font.widthOfTextAtSize(value, size) > rects[0].width) size -= 0.5;
  }
  return size;
}

function wrapIntoRects(value: string, rects: DrawRect[], font: PDFFont, size: number) {
  const explicitLines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const words = explicitLines.length > 1 ? explicitLines : value.trim().split(/\s+/);
  const output: Array<{ text: string; rect: DrawRect }> = [];
  let cursor = 0;
  for (const rect of rects) {
    if (cursor >= words.length) break;
    if (explicitLines.length > 1) {
      output.push({ text: fitText(words[cursor++], rect.width, font, size), rect });
      continue;
    }
    let line = words[cursor++] ?? "";
    while (cursor < words.length) {
      const next = `${line} ${words[cursor]}`;
      if (font.widthOfTextAtSize(next, size) > rect.width) break;
      line = next;
      cursor += 1;
    }
    output.push({ text: fitText(line, rect.width, font, size), rect });
  }
  if (cursor < words.length && output.length) {
    const last = output[output.length - 1];
    last.text = fitText(`${last.text} ${words.slice(cursor).join(" ")}`, last.rect.width, font, size);
  }
  return output;
}

function fitText(value: string, width: number, font: PDFFont, size: number) {
  if (font.widthOfTextAtSize(value, size) <= width) return value;
  let output = value;
  while (output.length > 1 && font.widthOfTextAtSize(`${output}...`, size) > width) {
    output = output.slice(0, -1).trimEnd();
  }
  return `${output}...`;
}
