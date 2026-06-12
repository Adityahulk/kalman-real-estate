import { readFile, writeFile } from "node:fs/promises";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";

export type PdfRenderMeta = {
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
  pageCount: number;
  vectorPathCount: number;
  imageCount: number;
  textSpanCount: number;
  pageText: string;
  largestImage: { xref: number; area: number; width: number; height: number; rect: number[] } | null;
  rect: number[];
};

export async function renderPdfPage(
  pdfPath: string,
  pageNumber: number,
  scale: number,
  outputPath: string,
): Promise<PdfRenderMeta> {
  const data = new Uint8Array(await readFile(pdfPath));
  const doc = await getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  }).promise;

  const safePage = Math.max(1, Math.min(pageNumber, doc.numPages));
  const page = await doc.getPage(safePage);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");

  await page.render({
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  await writeFile(outputPath, await canvas.encode("png"));

  const textContent = await page.getTextContent();
  const pageText = textContent.items
    .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
  const textSpanCount = textContent.items.filter((item) => "str" in item && typeof item.str === "string").length;

  const operatorList = await page.getOperatorList();
  let vectorPathCount = 0;
  let imageCount = 0;
  for (const fn of operatorList.fnArray) {
    if (fn === OPS.constructPath || fn === OPS.stroke || fn === OPS.fill || fn === OPS.eoFill) {
      vectorPathCount += 1;
    }
    if (fn === OPS.paintImageXObject || fn === OPS.paintXObject || fn === OPS.paintInlineImageXObject) {
      imageCount += 1;
    }
  }

  const pageWidth = viewport.width / scale;
  const pageHeight = viewport.height / scale;
  const largestImage = imageCount > 0
    ? {
        xref: 0,
        area: Math.round(pageWidth * pageHeight),
        width: Math.round(pageWidth),
        height: Math.round(pageHeight),
        rect: [0, 0, pageWidth, pageHeight],
      }
    : null;

  return {
    width: Math.ceil(viewport.width),
    height: Math.ceil(viewport.height),
    pageWidth,
    pageHeight,
    pageCount: doc.numPages,
    vectorPathCount,
    imageCount,
    textSpanCount,
    pageText,
    largestImage,
    rect: [0, 0, pageWidth, pageHeight],
  };
}

export async function cropPng(inputPath: string, x: number, y: number, w: number, h: number, outputPath: string) {
  const safeW = Math.max(1, w);
  const safeH = Math.max(1, h);
  await sharp(inputPath)
    .extract({
      left: Math.max(0, x),
      top: Math.max(0, y),
      width: safeW,
      height: safeH,
    })
    .png()
    .toFile(outputPath);
}
