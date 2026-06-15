import { degrees, PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import {
  PdfLayoutBlock,
  PdfLayoutDocument,
  PdfTextStyle,
  pdfLayoutBlockingIssues,
  pdfLayoutDocumentSchema,
} from "@/lib/pdf-layout";

export type PdfTemplateField = {
  id: string;
  label: string;
  sourceText?: string;
  mapping: string | null;
  rects?: Array<{ pageNumber: number; x: number; y: number; width: number; height: number }>;
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
    if (!value.trim() || value.trim() === field.sourceText?.trim()) continue;
    for (const rect of field.rects ?? []) {
      const page = pages[rect.pageNumber - 1];
      if (!page) continue;
      const pageSize = page.getSize();
      const x = rect.x * pageSize.width;
      const y = pageSize.height - ((rect.y + rect.height) * pageSize.height);
      const width = rect.width * pageSize.width;
      const height = rect.height * pageSize.height;
      page.drawRectangle({ x: x - 1, y: y - 1, width: width + 2, height: height + 2, color: rgb(1, 1, 1) });
      let size = Math.max(5, Math.min(13, height * 0.7));
      while (size > 5 && font.widthOfTextAtSize(value, size) > width) size -= 0.25;
      page.drawText(value, { x, y: y + Math.max(1, (height - size) / 2), size, font, color: rgb(0.05, 0.05, 0.05) });
    }
  }
  return Buffer.from(await pdf.save());
}

export async function buildPdfFromLayout(input: {
  bytes: Buffer;
  layout: PdfLayoutDocument;
}) {
  const layout = pdfLayoutDocumentSchema.parse(input.layout);
  const blockingIssues = pdfLayoutBlockingIssues(layout);
  if (blockingIssues.length) {
    const error = new Error(blockingIssues.join(". "));
    error.name = "BadRequestError";
    throw error;
  }

  const pdf = await PDFDocument.load(input.bytes);
  const pages = pdf.getPages();
  const fonts = await embedStandardFonts(pdf);

  for (const layoutPage of layout.pages) {
    const page = pages[layoutPage.pageNumber - 1];
    if (!page) continue;
    for (const block of layoutPage.blocks) {
      if (!block.changed && block.text === block.originalText) continue;
      drawChangedBlock(page, block, fonts);
    }
  }
  return Buffer.from(await pdf.save());
}

type EmbeddedFonts = Awaited<ReturnType<typeof embedStandardFonts>>;

async function embedStandardFonts(pdf: PDFDocument) {
  const [helvetica, helveticaBold, helveticaOblique, helveticaBoldOblique, times, timesBold, timesItalic, timesBoldItalic, courier, courierBold] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
    pdf.embedFont(StandardFonts.HelveticaOblique),
    pdf.embedFont(StandardFonts.HelveticaBoldOblique),
    pdf.embedFont(StandardFonts.TimesRoman),
    pdf.embedFont(StandardFonts.TimesRomanBold),
    pdf.embedFont(StandardFonts.TimesRomanItalic),
    pdf.embedFont(StandardFonts.TimesRomanBoldItalic),
    pdf.embedFont(StandardFonts.Courier),
    pdf.embedFont(StandardFonts.CourierBold),
  ]);
  return { helvetica, helveticaBold, helveticaOblique, helveticaBoldOblique, times, timesBold, timesItalic, timesBoldItalic, courier, courierBold };
}

function drawChangedBlock(page: PDFPage, block: PdfLayoutBlock, fonts: EmbeddedFonts) {
  const pageSize = page.getSize();
  const rect = {
    x: block.rect.x * pageSize.width,
    y: pageSize.height - ((block.rect.y + block.rect.height) * pageSize.height),
    width: block.rect.width * pageSize.width,
    height: block.rect.height * pageSize.height,
  };
  const padding = Math.max(0.8, Math.min(2.5, rect.height * 0.06));
  page.drawRectangle({
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
    color: rgb(1, 1, 1),
  });

  const font = chooseFont(block.style, fonts);
  const availableWidth = Math.max(1, rect.width);
  const availableHeight = Math.max(1, rect.height);
  const fitted = fitText(block.text, block.style.fontSize, availableWidth, availableHeight, font, block.style.lineHeight);
  if (!fitted) {
    const error = new Error(`Text does not fit on page ${block.pageNumber}`);
    error.name = "BadRequestError";
    throw error;
  }
  const color = parseHexColor(block.style.color);
  const lineHeight = fitted.size * Math.max(1.05, block.style.lineHeight / Math.max(1, block.style.fontSize));
  let y = rect.y + rect.height - fitted.size;
  for (const line of fitted.lines) {
    const width = font.widthOfTextAtSize(line, fitted.size);
    const x = block.style.align === "center"
      ? rect.x + Math.max(0, (rect.width - width) / 2)
      : block.style.align === "right"
        ? rect.x + Math.max(0, rect.width - width)
        : rect.x;
    page.drawText(line, {
      x,
      y,
      size: fitted.size,
      font,
      color,
      rotate: block.style.rotation ? degrees(block.style.rotation) : undefined,
    });
    if (block.style.underline) {
      page.drawLine({
        start: { x, y: y - 1 },
        end: { x: x + width, y: y - 1 },
        thickness: Math.max(0.4, fitted.size * 0.045),
        color,
      });
    }
    y -= lineHeight;
  }
}

function chooseFont(style: PdfTextStyle, fonts: EmbeddedFonts): PDFFont {
  const name = `${style.fontName} ${style.fontFamily}`.toLowerCase();
  const bold = style.fontWeight >= 600 || /bold|black|semibold/.test(name);
  const italic = style.italic || /italic|oblique/.test(name);
  if (/times|serif|roman/.test(name)) {
    if (bold && italic) return fonts.timesBoldItalic;
    if (bold) return fonts.timesBold;
    if (italic) return fonts.timesItalic;
    return fonts.times;
  }
  if (/courier|mono/.test(name)) return bold ? fonts.courierBold : fonts.courier;
  if (bold && italic) return fonts.helveticaBoldOblique;
  if (bold) return fonts.helveticaBold;
  if (italic) return fonts.helveticaOblique;
  return fonts.helvetica;
}

function fitText(text: string, desiredSize: number, width: number, height: number, font: PDFFont, sourceLineHeight: number) {
  for (let size = Math.min(72, desiredSize); size >= Math.max(5, desiredSize * 0.62); size -= 0.25) {
    const lines = wrapText(text, width, font, size);
    const lineHeight = size * Math.max(1.05, sourceLineHeight / Math.max(1, desiredSize));
    if (lines.length * lineHeight <= height + size * 0.2) return { size, lines };
  }
  return null;
}

function wrapText(text: string, width: number, font: PDFFont, size: number) {
  const paragraphs = text.replace(/\r/g, "").split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = words.shift() ?? "";
    for (const word of words) {
      const next = `${line} ${word}`;
      if (font.widthOfTextAtSize(next, size) <= width) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

function parseHexColor(value: string) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (!match) return rgb(0.07, 0.09, 0.14);
  return rgb(parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255);
}
