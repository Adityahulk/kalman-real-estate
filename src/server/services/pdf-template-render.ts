import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";

export type PdfTemplateField = {
  id: string;
  label: string;
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
    const rects = field.rects ?? [];
    for (const [index, rect] of rects.entries()) {
      const page = pages[rect.pageNumber - 1];
      if (!page) continue;
      const { width: pageWidth, height: pageHeight } = page.getSize();
      const x = rect.x * pageWidth;
      const y = pageHeight - ((rect.y + rect.height) * pageHeight);
      const width = rect.width * pageWidth;
      const height = rect.height * pageHeight;

      page.drawRectangle({
        x: x - 1,
        y: y - 1,
        width: width + 2,
        height: height + 2,
        color: rgb(1, 1, 1),
      });

      if (index > 0 || !value.trim()) continue;
      const fontSize = fittedFontSize(value, width, height, font);
      page.drawText(value, {
        x,
        y: y + Math.max(1, (height - fontSize) / 2),
        size: fontSize,
        font,
        color: rgb(0.05, 0.05, 0.05),
      });
    }
  }

  return Buffer.from(await pdf.save());
}

function fittedFontSize(value: string, width: number, height: number, font: PDFFont) {
  let size = Math.max(6, Math.min(14, height * 0.72));
  while (size > 6 && font.widthOfTextAtSize(value, size) > width) size -= 0.5;
  return size;
}
