#!/usr/bin/env python3
"""Replace text regions in a PDF using PyMuPDF (fitz).

Usage:
    python3 render_letter.py <input.pdf> <output.pdf> <replacements.json>

replacements.json is an array of objects:
  {
    "pageNumber": 1,            # 1-based
    "rect": [x0, y0, x1, y1],  # PDF points (origin = bottom-left in pdf-lib, but fitz uses top-left)
    "sourceText": "original",   # text to search for (fallback if rect misses)
    "text": "replacement",      # new text to insert
    "fontSize": 12,
    "fontName": "helv",         # fitz built-in: helv, tiro, cour, or path to .ttf
    "fontWeight": 400,          # 700 = bold
    "italic": false,
    "color": [0.07, 0.09, 0.14],
    "align": "left"             # left | center | right
  }

The script:
  1. Opens the original PDF
  2. For each replacement, detects the font from the original text at that location
  3. Redacts the original text area (clean removal)
  4. Inserts the new text with the detected (or specified) font
  5. Saves the result
"""

import json
import sys
import fitz  # PyMuPDF


def detect_font_at_rect(page, rect):
    """Extract font info from text spans overlapping the given rect."""
    blocks = page.get_text("dict", clip=rect)["blocks"]
    for block in blocks:
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                return {
                    "font": span.get("font", ""),
                    "size": span.get("size", 12),
                    "color": int_to_rgb(span.get("color", 0)),
                    "flags": span.get("flags", 0),
                }
    return None


def int_to_rgb(color_int):
    """Convert fitz integer color to (r, g, b) tuple with 0-1 range."""
    if isinstance(color_int, (list, tuple)):
        return tuple(color_int)
    r = ((color_int >> 16) & 0xFF) / 255.0
    g = ((color_int >> 8) & 0xFF) / 255.0
    b = (color_int & 0xFF) / 255.0
    return (r, g, b)


def fitz_font_name(font_str, bold=False, italic=False):
    """Map a font description to a fitz built-in font name."""
    lower = font_str.lower()
    if any(k in lower for k in ("times", "serif", "roman", "tiro")):
        if bold and italic:
            return "tibi"
        if bold:
            return "tibo"
        if italic:
            return "tiit"
        return "tiro"
    if any(k in lower for k in ("courier", "mono", "cour")):
        if bold and italic:
            return "cobi"
        if bold:
            return "cobo"
        if italic:
            return "coit"
        return "cour"
    # Default to Helvetica
    if bold and italic:
        return "hebi"
    if bold:
        return "hebo"
    if italic:
        return "heit"
    return "helv"


def normalize_rect(page, repl):
    """Convert a normalized 0-1 rect to PDF points, or use absolute coords."""
    r = repl.get("rect")
    if not r:
        return None

    page_rect = page.rect
    pw = page_rect.width
    ph = page_rect.height

    if isinstance(r, dict):
        x = r.get("x", 0)
        y = r.get("y", 0)
        w = r.get("width", 0)
        h = r.get("height", 0)
        if all(0 <= v <= 1.01 for v in [x, y, w, h]):
            return fitz.Rect(x * pw, y * ph, (x + w) * pw, (y + h) * ph)
        return fitz.Rect(x, y, x + w, y + h)

    if isinstance(r, (list, tuple)) and len(r) == 4:
        x0, y0, x1, y1 = r
        if all(0 <= v <= 1.01 for v in [x0, y0, x1, y1]):
            return fitz.Rect(x0 * pw, y0 * ph, x1 * pw, y1 * ph)
        return fitz.Rect(x0, y0, x1, y1)

    return None


def apply_replacement(page, repl):
    """Apply a single text replacement on a page."""
    rect = normalize_rect(page, repl)
    if not rect or rect.is_empty:
        return False

    new_text = repl.get("text", "")
    if not new_text.strip():
        return False

    # Detect original font from the area
    detected = detect_font_at_rect(page, rect)

    # Determine font parameters
    req_bold = repl.get("fontWeight", 400) >= 600
    req_italic = repl.get("italic", False)
    req_font_name = repl.get("fontName", "")

    if detected:
        flags = detected["flags"]
        is_bold = bool(flags & (1 << 4)) or req_bold
        is_italic = bool(flags & (1 << 1)) or req_italic
        base_font = detected["font"] if detected["font"] else req_font_name
        font_size = repl.get("fontSize") or detected["size"]
        color = repl.get("color") or detected["color"]
    else:
        is_bold = req_bold
        is_italic = req_italic
        base_font = req_font_name or "helv"
        font_size = repl.get("fontSize", 12)
        color = repl.get("color", (0.07, 0.09, 0.14))

    font_name = fitz_font_name(base_font, is_bold, is_italic)

    if isinstance(color, (list, tuple)) and len(color) == 3:
        color = tuple(color)
    else:
        color = (0.07, 0.09, 0.14)

    # Pad rect slightly to fully cover the original text
    pad = max(0.5, font_size * 0.05)
    redact_rect = fitz.Rect(
        rect.x0 - pad, rect.y0 - pad,
        rect.x1 + pad, rect.y1 + pad
    )

    # Redact original text (clean removal with white fill)
    page.add_redact_annot(redact_rect, text="", fill=(1, 1, 1))
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

    # Determine alignment
    align_str = repl.get("align", "left").lower()
    align = fitz.TEXT_ALIGN_LEFT
    if align_str == "center":
        align = fitz.TEXT_ALIGN_CENTER
    elif align_str == "right":
        align = fitz.TEXT_ALIGN_RIGHT

    # Insert replacement text using textbox for automatic wrapping/fitting
    rc = page.insert_textbox(
        rect,
        new_text,
        fontsize=font_size,
        fontname=font_name,
        color=color,
        align=align,
    )

    # If text didn't fit (rc < 0), try shrinking font size
    if rc < 0:
        for shrink in range(1, 20):
            smaller = max(5, font_size - shrink * 0.5)
            page.add_redact_annot(redact_rect, text="", fill=(1, 1, 1))
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
            rc = page.insert_textbox(
                rect,
                new_text,
                fontsize=smaller,
                fontname=font_name,
                color=color,
                align=align,
            )
            if rc >= 0:
                break

    return True


def main():
    if len(sys.argv) != 4:
        print(f"Usage: {sys.argv[0]} <input.pdf> <output.pdf> <replacements.json>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    replacements_path = sys.argv[3]

    with open(replacements_path, "r") as f:
        replacements = json.load(f)

    doc = fitz.open(input_path)

    # Group replacements by page
    by_page = {}
    for repl in replacements:
        page_num = repl.get("pageNumber", 1) - 1  # Convert to 0-based
        by_page.setdefault(page_num, []).append(repl)

    applied = 0
    for page_idx, page_repls in sorted(by_page.items()):
        if page_idx < 0 or page_idx >= len(doc):
            continue
        page = doc[page_idx]
        for repl in page_repls:
            if apply_replacement(page, repl):
                applied += 1

    doc.save(output_path, garbage=4, deflate=True)
    doc.close()

    result = {"success": True, "applied": applied, "total": len(replacements)}
    print(json.dumps(result))


if __name__ == "__main__":
    main()
