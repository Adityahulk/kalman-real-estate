import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { degrees, PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import {
  PdfLayoutBlock,
  PdfLayoutDocument,
  PdfLayoutField,
  PdfTextStyle,
  pdfLayoutBlockingIssues,
  pdfLayoutDocumentSchema,
} from "@/lib/pdf-layout";

const execFileAsync = promisify(execFile);

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

function hexToFloats(value: string): [number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (!match) return [0.07, 0.09, 0.14];
  return [parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255];
}

type FieldReplacement = {
  pageNumber: number;
  rect: { x: number; y: number; width: number; height: number };
  sourceText: string;
  text: string;
  fontSize: number;
  fontName: string;
  fontWeight: number;
  italic: boolean;
  color: [number, number, number];
  align: string;
};

function buildReplacementsFromLayout(layout: PdfLayoutDocument): FieldReplacement[] {
  const replacements: FieldReplacement[] = [];
  for (const page of layout.pages) {
    for (const block of page.blocks) {
      if (!block.changed && block.text === block.originalText) continue;
      replacements.push({
        pageNumber: page.pageNumber,
        rect: block.rect,
        sourceText: block.originalText,
        text: block.text,
        fontSize: block.style.fontSize,
        fontName: block.style.fontName,
        fontWeight: block.style.fontWeight,
        italic: block.style.italic,
        color: hexToFloats(block.style.color),
        align: block.style.align,
      });
    }
  }
  return replacements;
}

function buildReplacementsFromFields(
  fields: Array<PdfLayoutField & { rect: { x: number; y: number; width: number; height: number }; pageNumber: number; style: PdfTextStyle }>,
  values: Record<string, string>,
): FieldReplacement[] {
  return fields
    .filter((field) => {
      const value = values[`field.${field.id}`];
      return value != null && value !== field.sourceText;
    })
    .map((field) => ({
      pageNumber: field.pageNumber,
      rect: field.rect,
      sourceText: field.sourceText,
      text: values[`field.${field.id}`] ?? field.sourceText,
      fontSize: field.style.fontSize,
      fontName: field.style.fontName,
      fontWeight: field.style.fontWeight,
      italic: field.style.italic,
      color: hexToFloats(field.style.color),
      align: field.style.align,
    }));
}

const RENDER_LETTER_SCRIPT = join(process.cwd(), "src/workers/cad-python/render_letter.py");

export async function buildPdfWithPyMuPdf(input: {
  bytes: Buffer;
  replacements: FieldReplacement[];
}): Promise<Buffer> {
  const directory = await mkdtemp(join(tmpdir(), "letter-render-"));
  const inputPath = join(directory, "input.pdf");
  const outputPath = join(directory, "output.pdf");
  const replacementsPath = join(directory, "replacements.json");
  try {
    await writeFile(inputPath, input.bytes);
    await writeFile(replacementsPath, JSON.stringify(input.replacements));
    const { stdout, stderr } = await execFileAsync(
      "python3",
      [RENDER_LETTER_SCRIPT, inputPath, outputPath, replacementsPath],
      { timeout: 30_000 },
    );
    if (stderr) console.warn("[render_letter.py]", stderr);
    let result: { success: boolean; applied: number };
    try {
      result = JSON.parse(stdout);
    } catch {
      throw new Error(`render_letter.py produced invalid output: ${stdout.slice(0, 200)}`);
    }
    if (!result.success) {
      throw new Error("render_letter.py failed");
    }
    return await readFile(outputPath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function buildPdfFromLayoutV2(input: {
  bytes: Buffer;
  layout: PdfLayoutDocument;
}): Promise<Buffer> {
  const layout = pdfLayoutDocumentSchema.parse(input.layout);
  const blockingIssues = pdfLayoutBlockingIssues(layout);
  if (blockingIssues.length) {
    const error = new Error(blockingIssues.join(". "));
    error.name = "BadRequestError";
    throw error;
  }

  const blockReplacements = buildReplacementsFromLayout(layout);

  const fieldReplacements: FieldReplacement[] = layout.fields
    .filter((f): f is PdfLayoutField & { rect: NonNullable<PdfLayoutField["rect"]>; pageNumber: number; style: NonNullable<PdfLayoutField["style"]> } =>
      Boolean(f.rect && f.pageNumber && f.style),
    )
    .filter((f) => {
      const resolved = (f as unknown as { resolvedValue?: string }).resolvedValue;
      return resolved != null && resolved !== f.sourceText;
    })
    .map((f) => ({
      pageNumber: f.pageNumber,
      rect: f.rect,
      sourceText: f.sourceText,
      text: (f as unknown as { resolvedValue?: string }).resolvedValue ?? f.sourceText,
      fontSize: f.style.fontSize,
      fontName: f.style.fontName,
      fontWeight: f.style.fontWeight,
      italic: f.style.italic,
      color: hexToFloats(f.style.color),
      align: f.style.align,
    }));

  const replacements = [...blockReplacements, ...fieldReplacements];
  if (!replacements.length) {
    return input.bytes;
  }
  return buildPdfWithPyMuPdf({ bytes: input.bytes, replacements });
}
