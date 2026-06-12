#!/usr/bin/env python3
"""Render a PDF page to a PNG image using PyMuPDF.

Usage: python3 render_pdf.py <pdf_path> <page_number> <scale> <output_path>

Outputs JSON metadata to stdout: {width, height, pageWidth, pageHeight, rect}
"""
import json
import sys
from pathlib import Path

import fitz


def main():
    pdf_path = sys.argv[1]
    page_number = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    scale = float(sys.argv[3]) if len(sys.argv) > 3 else 2.0
    output_path = sys.argv[4] if len(sys.argv) > 4 else str(Path(pdf_path).with_suffix(".png"))

    doc = fitz.open(pdf_path)
    if doc.needs_pass:
        raise RuntimeError("Password-protected PDF")

    page = doc[max(0, page_number - 1)]
    mat = fitz.Matrix(scale, scale)
    pixmap = page.get_pixmap(matrix=mat, alpha=False)
    pixmap.pil_save(output_path, format="PNG")

    images = page.get_images(full=True)
    largest_image = None
    for img in images:
        xref = img[0]
        extracted = doc.extract_image(xref)
        area = int(extracted.get("width", 0)) * int(extracted.get("height", 0))
        rects = page.get_image_rects(xref)
        if largest_image is None or area > largest_image["area"]:
            largest_image = {
                "xref": xref,
                "area": area,
                "width": extracted.get("width"),
                "height": extracted.get("height"),
                "rect": list(rects[0]) if rects else [0, 0, page.rect.width, page.rect.height],
            }

    print(json.dumps({
        "width": pixmap.width,
        "height": pixmap.height,
        "pageWidth": float(page.rect.width),
        "pageHeight": float(page.rect.height),
        "pageCount": len(doc),
        "vectorPathCount": len(page.get_drawings()),
        "imageCount": len(images),
        "textSpanCount": sum(
            len(line.get("spans", []))
            for block in page.get_text("dict").get("blocks", [])
            if block.get("type") == 0
            for line in block.get("lines", [])
        ),
        "pageText": page.get_text("text")[:4000],
        "largestImage": largest_image,
        "rect": [0, 0, float(page.rect.width), float(page.rect.height)],
    }))


if __name__ == "__main__":
    main()
