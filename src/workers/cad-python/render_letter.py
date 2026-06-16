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
  2. Extracts embedded fonts from the source PDF for reuse
  3. For each replacement, detects the font from the original text at that location
  4. Redacts the original text area (clean removal)
  5. Inserts the new text using the ORIGINAL embedded font (not built-in approximations)
  6. Saves the result
"""

import json
import os
import sys
import tempfile
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


def extract_embedded_fonts(doc, tmp_dir):
    """Extract all embedded fonts from the PDF and save as temp files.

    Returns a dict mapping font base name (lowercase) to file path.
    E.g. {"calibri": "/tmp/.../calibri.ttf", "calibri,bold": "/tmp/.../calibri_bold.ttf"}
    """
    font_files = {}
    seen_xrefs = set()

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        for font_info in page.get_fonts(full=True):
            xref = font_info[0]
            if xref in seen_xrefs:
                continue
            seen_xrefs.add(xref)

            basefont = font_info[3]  # e.g. "ABCDEE+Calibri" or "ABCDEE+Calibri,Bold"
            try:
                name, ext, _subtype, content = doc.extract_font(xref)
            except Exception:
                continue

            if not content or ext not in ("ttf", "otf", "cff"):
                continue

            # Strip subset prefix (e.g. "ABCDEE+Calibri" -> "Calibri")
            clean_name = name
            if "+" in clean_name:
                clean_name = clean_name.split("+", 1)[1]

            font_path = os.path.join(tmp_dir, f"{clean_name.replace(',', '_').replace(' ', '_')}.{ext}")
            with open(font_path, "wb") as f:
                f.write(content)

            font_files[clean_name.lower()] = font_path

            # Also store basefont version
            clean_base = basefont
            if "+" in clean_base:
                clean_base = clean_base.split("+", 1)[1]
            font_files[clean_base.lower()] = font_path

    return font_files


def find_font_file(detected_font_name, is_bold, is_italic, font_files):
    """Find the best matching extracted font file for a detected font name."""
    if not font_files or not detected_font_name:
        return None

    name = detected_font_name.lower()
    # Strip subset prefix
    if "+" in name:
        name = name.split("+", 1)[1]

    # Try exact match first
    if name in font_files:
        return font_files[name]

    # Try with bold/italic suffix
    if is_bold and not is_italic:
        bold_name = f"{name},bold"
        if bold_name in font_files:
            return font_files[bold_name]
        bold_name = f"{name}-bold"
        if bold_name in font_files:
            return font_files[bold_name]

    if is_italic and not is_bold:
        italic_name = f"{name},italic"
        if italic_name in font_files:
            return font_files[italic_name]

    if is_bold and is_italic:
        bi_name = f"{name},bolditalic"
        if bi_name in font_files:
            return font_files[bi_name]

    # Try base name without style suffix (e.g. "calibri" from "calibri,bold")
    base = name.split(",")[0].split("-")[0].strip()
    if is_bold:
        for key, path in font_files.items():
            if base in key and ("bold" in key):
                return path
    if is_italic:
        for key, path in font_files.items():
            if base in key and ("italic" in key or "oblique" in key):
                return path

    # Fallback: any font with the same base family
    for key, path in font_files.items():
        if base in key:
            return path

    return None


def fitz_font_name(font_str, bold=False, italic=False):
    """Map a font description to a fitz built-in font name (fallback only)."""
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


def find_text_rects(page, source_text):
    """Find all rects where source_text appears on the page."""
    rects = []
    if not source_text or not source_text.strip():
        return rects
    for line in source_text.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        hits = page.search_for(line, quads=False)
        rects.extend(hits)
    if not rects:
        words = source_text.strip().split()
        for word in words:
            if len(word) < 2:
                continue
            hits = page.search_for(word, quads=False)
            rects.extend(hits)
    return rects


def normalize_one_rect(page, r):
    """Convert a single normalized 0-1 rect dict/list to PDF points."""
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


def line_redaction_rects(page, repl, bounding_rect, source_text):
    """Return a list of tight rects to redact — one per selected line when available."""
    per_line = repl.get("rects")
    rects = []
    if isinstance(per_line, list) and per_line:
        for r in per_line:
            fr = normalize_one_rect(page, r)
            if fr and not fr.is_empty:
                rects.append(fitz.Rect(fr.x0 - 0.5, fr.y0 - 1.5, fr.x1 + 0.5, fr.y1 + 1.5))
    if rects:
        return rects
    candidates = [bounding_rect]
    candidates.extend(find_text_rects(page, source_text))
    x0 = min(r.x0 for r in candidates)
    y0 = min(r.y0 for r in candidates)
    x1 = max(r.x1 for r in candidates)
    y1 = max(r.y1 for r in candidates)
    return [fitz.Rect(x0 - 2, y0 - 2, x1 + 2, y1 + 2)]


def insertion_rect(page, bounding_rect, font_size, new_text=""):
    """Build an insertion box sized to the replacement text."""
    pw = page.rect.width
    ph = page.rect.height
    new_line_count = max(1, len(new_text.strip().splitlines()))
    line_height = font_size * 1.35
    needed_height = new_line_count * line_height + font_size * 0.3
    orig_height = bounding_rect.y1 - bounding_rect.y0
    is_single_line = orig_height < font_size * 1.8

    if is_single_line:
        right = min(pw - 36, max(bounding_rect.x1, bounding_rect.x0 + (bounding_rect.x1 - bounding_rect.x0) * 1.6))
        bottom = bounding_rect.y0 + max(needed_height, font_size * 1.5)
    else:
        right = max(bounding_rect.x1, pw * 0.75)
        bottom = bounding_rect.y0 + max(needed_height, orig_height)
    return fitz.Rect(bounding_rect.x0, bounding_rect.y0, min(right, pw - 36), min(bottom, ph - 36))


def apply_replacement(page, repl, font_files, registered_fonts):
    """Apply a single text replacement on a page."""
    rect = normalize_rect(page, repl)
    if not rect or rect.is_empty:
        return False

    new_text = repl.get("text", "")
    if not new_text.strip():
        return False

    source_text = repl.get("sourceText", "")

    # Detect original font from the area
    detected = detect_font_at_rect(page, rect)
    if not detected:
        per_line = repl.get("rects")
        if isinstance(per_line, list):
            for r in per_line:
                fr = normalize_one_rect(page, r)
                if fr and not fr.is_empty:
                    detected = detect_font_at_rect(page, fr)
                    if detected:
                        break
    if not detected:
        hits = find_text_rects(page, source_text)
        for hr in hits:
            detected = detect_font_at_rect(page, hr)
            if detected:
                break

    req_bold = repl.get("fontWeight", 400) >= 600
    req_italic = repl.get("italic", False)

    if detected:
        flags = detected["flags"]
        is_bold = bool(flags & (1 << 4)) or req_bold
        is_italic = bool(flags & (1 << 1)) or req_italic
        base_font = detected["font"]
        font_size = detected["size"] or repl.get("fontSize", 12)
        color = detected["color"]
    else:
        is_bold = req_bold
        is_italic = req_italic
        base_font = "helv"
        font_size = repl.get("fontSize", 12)
        color = (0.07, 0.09, 0.14)

    if isinstance(color, (list, tuple)) and len(color) == 3:
        color = tuple(color)
    else:
        color = (0.07, 0.09, 0.14)

    # Try to use the actual embedded font from the source PDF
    font_file = find_font_file(base_font, is_bold, is_italic, font_files)

    if font_file:
        # Register the font on this page if not already done
        font_key = font_file  # use path as unique key
        if font_key not in registered_fonts:
            # Generate a short unique name for this font
            font_tag = f"F{len(registered_fonts)}"
            page.insert_font(fontname=font_tag, fontfile=font_file)
            registered_fonts[font_key] = font_tag
        use_fontname = registered_fonts[font_key]
        use_fontfile = font_file
    else:
        use_fontname = fitz_font_name(base_font, is_bold, is_italic)
        use_fontfile = None

    # Redact original text
    for rr in line_redaction_rects(page, repl, rect, source_text):
        page.add_redact_annot(rr, text="", fill=(1, 1, 1))
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

    # Determine alignment
    align_str = repl.get("align", "left").lower()
    align = fitz.TEXT_ALIGN_LEFT
    if align_str == "center":
        align = fitz.TEXT_ALIGN_CENTER
    elif align_str == "right":
        align = fitz.TEXT_ALIGN_RIGHT

    # Insert replacement text
    insert_box = insertion_rect(page, rect, font_size, new_text)

    insert_kwargs = dict(
        fontsize=font_size,
        fontname=use_fontname,
        color=color,
        align=align,
    )
    if use_fontfile:
        insert_kwargs["fontfile"] = use_fontfile

    rc = page.insert_textbox(insert_box, new_text, **insert_kwargs)

    if rc < 0:
        for shrink in range(1, 30):
            smaller = max(4, font_size - shrink * 0.5)
            insert_kwargs["fontsize"] = smaller
            rc = page.insert_textbox(insert_box, new_text, **insert_kwargs)
            if rc >= 0 or smaller <= 4:
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

    # Extract embedded fonts from the source PDF into temp files
    tmp_dir = tempfile.mkdtemp(prefix="letter-fonts-")
    try:
        font_files = extract_embedded_fonts(doc, tmp_dir)

        # Track which fonts have been registered on which pages
        # Key: page_idx -> dict of font_file_path -> registered_fontname
        page_font_registry = {}

        by_page = {}
        for repl in replacements:
            page_num = repl.get("pageNumber", 1) - 1
            by_page.setdefault(page_num, []).append(repl)

        applied = 0
        for page_idx, page_repls in sorted(by_page.items()):
            if page_idx < 0 or page_idx >= len(doc):
                continue
            page = doc[page_idx]
            if page_idx not in page_font_registry:
                page_font_registry[page_idx] = {}
            for repl in page_repls:
                if apply_replacement(page, repl, font_files, page_font_registry[page_idx]):
                    applied += 1

        doc.save(output_path, garbage=4, deflate=True)
        doc.close()
    finally:
        # Clean up temp font files
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)

    result = {"success": True, "applied": applied, "total": len(replacements)}
    print(json.dumps(result))


if __name__ == "__main__":
    main()
