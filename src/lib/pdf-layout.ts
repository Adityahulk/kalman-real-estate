import { z } from "zod";

export const pdfTextStyleSchema = z.object({
  fontName: z.string().default("Helvetica"),
  fontFamily: z.string().default("Arial"),
  fontSize: z.number().positive(),
  fontWeight: z.number().int().min(100).max(900).default(400),
  italic: z.boolean().default(false),
  underline: z.boolean().default(false),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).default("#111827"),
  align: z.enum(["left", "center", "right"]).default("left"),
  letterSpacing: z.number().default(0),
  wordSpacing: z.number().default(0),
  lineHeight: z.number().positive(),
  rotation: z.number().default(0),
});

export const pdfLayoutRectSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
});

export const pdfLayoutFieldSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  label: z.string().min(1),
  blockId: z.string().default(""),
  start: z.number().int().min(0).default(0),
  end: z.number().int().min(0).default(0),
  sourceText: z.string(),
  resolvedValue: z.string().optional(),
  mapping: z.string().nullable(),
  pageNumber: z.number().int().positive().optional(),
  rect: pdfLayoutRectSchema.optional(),
  rects: z.array(pdfLayoutRectSchema).optional(),
  style: pdfTextStyleSchema.optional(),
});

export const pdfLayoutBlockSchema = z.object({
  id: z.string().min(1),
  pageNumber: z.number().int().positive(),
  text: z.string(),
  originalText: z.string(),
  rect: pdfLayoutRectSchema,
  style: pdfTextStyleSchema,
  source: z.enum(["PDF_TEXT", "OCR"]).default("PDF_TEXT"),
  confidence: z.number().min(0).max(1).default(1),
  confirmed: z.boolean().default(true),
  changed: z.boolean().default(false),
  overflow: z.boolean().default(false),
});

export const pdfLayoutPageSchema = z.object({
  pageNumber: z.number().int().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0),
  blocks: z.array(pdfLayoutBlockSchema),
});

export const pdfLayoutDocumentSchema = z.object({
  version: z.literal(1),
  sourceFileId: z.string().min(1),
  pageCount: z.number().int().positive(),
  pages: z.array(pdfLayoutPageSchema),
  fields: z.array(pdfLayoutFieldSchema).default([]),
  warnings: z.array(z.string()).default([]),
});

export type PdfTextStyle = z.infer<typeof pdfTextStyleSchema>;
export type PdfLayoutField = z.infer<typeof pdfLayoutFieldSchema>;
export type PdfLayoutBlock = z.infer<typeof pdfLayoutBlockSchema>;
export type PdfLayoutPage = z.infer<typeof pdfLayoutPageSchema>;
export type PdfLayoutDocument = z.infer<typeof pdfLayoutDocumentSchema>;

export function resolvePdfLayoutFields(layout: PdfLayoutDocument, variables: Record<string, string>) {
  const hasV2Fields = layout.fields.some((f) => f.rect && f.pageNumber);
  if (hasV2Fields) {
    const resolvedFields = layout.fields.map((field) => ({
      ...field,
      resolvedValue: field.mapping
        ? variables[field.mapping] || variables[`field.${field.id}`] || field.sourceText
        : variables[`field.${field.id}`] || field.sourceText,
    }));
    return { ...layout, fields: resolvedFields };
  }
  const pages = layout.pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => {
      const fields = layout.fields
        .filter((field) => field.blockId === block.id)
        .sort((first, second) => second.start - first.start);
      let text = block.text;
      for (const field of fields) {
        const value = variables[`field.${field.id}`] ?? field.sourceText;
        text = `${text.slice(0, field.start)}${value}${text.slice(field.end)}`;
      }
      return { ...block, text, changed: text !== block.originalText };
    }),
  }));
  return { ...layout, pages };
}

export function pdfLayoutBlockingIssues(layout: PdfLayoutDocument) {
  const issues: string[] = [];
  for (const page of layout.pages) {
    for (const block of page.blocks) {
      if (block.source === "OCR" && !block.confirmed) issues.push(`Confirm OCR text on page ${page.pageNumber}`);
      if (block.overflow) issues.push(`Text does not fit on page ${page.pageNumber}`);
    }
  }
  return [...new Set(issues)];
}
