#!/usr/bin/env python3
"""Safe CAD/PDF inspection and candidate extraction.

The script deliberately separates raw drawing primitives from publishable
business candidates. It emits only strict plot candidates and classified site
or electrical assets; everything else remains inspection metadata.
"""

import json
import math
import os
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path


PLOT_LABEL = re.compile(
    r"^(?:PLOT\s*(?:NO\.?)?\s*)?((?:[A-Z]{1,4}[-/]?\d{1,4})|(?:\d{1,4}))$",
    re.I,
)
REJECTED_PLOT_WORDS = {
    "PLOT",
    "PLOTS",
    "PLOTTING",
    "PLOT NO",
    "PLOT NO.",
    "LAYOUT",
    "LAYOUT PLAN",
}


def safe_json(path):
    if not path or not Path(path).exists():
        return {}
    text = Path(path).read_text(encoding="utf-8").strip()
    return json.loads(text) if text else {}


def normalize_plot_label(value, expected_total=None):
    text = re.sub(r"\s+", " ", str(value or "").strip()).upper()
    text = text.replace("–", "-").replace("—", "-")
    if text in REJECTED_PLOT_WORDS or text.startswith("\\"):
        return None
    match = PLOT_LABEL.match(text)
    if not match:
        return None
    label = re.sub(r"\s+", "", match.group(1))
    numeric = re.search(r"(\d+)$", label)
    if not numeric or int(numeric.group(1)) <= 0:
        return None
    if label.isdigit() and expected_total and int(label) > int(expected_total):
        return None
    prefix = label[:numeric.start()]
    if prefix and "-" not in label and "/" not in label and prefix not in {"C", "COM", "EWS", "R", "RES"}:
        return None
    return label


def plot_label_score(label, item, expected_total):
    numeric = int(re.search(r"(\d+)$", label).group(1))
    score = float(item.get("confidence", 0))
    if label.isdigit():
        if expected_total and numeric <= int(expected_total):
            score += 4.0
        elif len(label) <= 3:
            score += 1.0
        else:
            score -= 5.0
    else:
        score += 3.0 if "-" in label or "/" in label or label.startswith("EWS") else 1.0
    return score


def polygon_area(points):
    if len(points) < 3:
        return 0.0
    total = 0.0
    for index, point in enumerate(points):
        nxt = points[(index + 1) % len(points)]
        total += point[0] * nxt[1] - nxt[0] * point[1]
    return abs(total / 2.0)


def line_length(points):
    return sum(math.dist(points[index], points[index + 1]) for index in range(len(points) - 1))


def bounds_for_points(points):
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return [min(xs), min(ys), max(xs), max(ys)]


def normalized_region(region):
    value = region or {}
    x = max(0.0, min(1.0, float(value.get("x", 0))))
    y = max(0.0, min(1.0, float(value.get("y", 0))))
    width = max(0.01, min(1.0 - x, float(value.get("width", 1))))
    height = max(0.01, min(1.0 - y, float(value.get("height", 1))))
    return {"x": x, "y": y, "width": width, "height": height}


def infer_discipline(layer_names, image_count=0):
    text = " ".join(layer_names).lower()
    electrical = any(token in text for token in ("cable", "mpb", "rmu", "transformer", "kva", "elect"))
    site = any(token in text for token in ("plot", "road", "park", "layout", "boundary"))
    if electrical and (site or image_count):
        return "MIXED"
    if electrical:
        return "ELECTRICAL"
    if site:
        return "SITE_LAYOUT"
    return "AUTO"


def expected_counts_from_text(text):
    normalized = re.sub(r"\s+", " ", text.upper())
    patterns = {
        "total": r"TOTAL\s+NO\.?\s+OF\s+PLOTS\D{0,20}(\d{1,5})",
        "residential": r"RESIDENTIAL\D{0,20}(\d{1,5})",
        "commercial": r"COMMERCIAL\D{0,20}(\d{1,5})",
        "ews": r"\bEWS\D{0,20}(\d{1,5})",
    }
    result = {}
    for key, pattern in patterns.items():
        match = re.search(pattern, normalized)
        if match:
            result[key] = int(match.group(1))
    return result


def validated_expected_counts(counts):
    total = counts.get("total")
    if not isinstance(total, int) or total < 1 or total > 10000:
        return {}
    result = {"total": total}
    categories = [counts.get("residential"), counts.get("commercial"), counts.get("ews")]
    if all(isinstance(value, int) and 0 <= value <= total for value in categories):
        if sum(categories) == total:
            result.update({
                "residential": categories[0],
                "commercial": categories[1],
                "ews": categories[2],
            })
    return result


def inspect_pdf(source, artifact_dir):
    import fitz
    from PIL import Image

    doc = fitz.open(source)
    if doc.needs_pass:
        raise RuntimeError("Password-protected PDFs are not supported. Upload an unlocked PDF.")

    page_summaries = []
    largest_image = None
    all_text = []
    ocgs = doc.get_ocgs()
    ocg_names = [str(value.get("name", "")) for value in ocgs.values()]

    for page_index, page in enumerate(doc):
        page_text = page.get_text("text")
        all_text.append(page_text)
        drawings = page.get_drawings()
        images = page.get_images(full=True)
        page_summary = {
            "page": page_index + 1,
            "width": float(page.rect.width),
            "height": float(page.rect.height),
            "vectorPathCount": len(drawings),
            "imageCount": len(images),
            "textSpanCount": sum(
                len(line.get("spans", []))
                for block in page.get_text("dict").get("blocks", [])
                if block.get("type") == 0
                for line in block.get("lines", [])
            ),
        }
        page_summaries.append(page_summary)
        for image in images:
            xref = image[0]
            extracted = doc.extract_image(xref)
            area = int(extracted.get("width", 0)) * int(extracted.get("height", 0))
            rects = page.get_image_rects(xref)
            candidate = {
                "xref": xref,
                "page": page_index + 1,
                "area": area,
                "width": extracted.get("width"),
                "height": extracted.get("height"),
                "ext": extracted.get("ext", "png"),
                "bytes": extracted.get("image"),
                "rect": list(rects[0]) if rects else [0, 0, page.rect.width, page.rect.height],
            }
            if largest_image is None or candidate["area"] > largest_image["area"]:
                largest_image = candidate

    preview_name = None
    source_kind = "VECTOR_PDF"
    image_metadata = None
    recognition_image = None
    preview_image = None
    if page_summaries:
        preview_name = "preview.jpg"
        render_scale = float(os.environ.get("CAD_PDF_RENDER_SCALE", "2"))
        render_page = doc[(largest_image["page"] if largest_image else 1) - 1]
        pixmap = render_page.get_pixmap(matrix=fitz.Matrix(render_scale, render_scale), alpha=False)
        pixmap.pil_save(str(Path(artifact_dir, preview_name)), format="JPEG", quality=92)
        preview_image = {
            "page": largest_image["page"] if largest_image else 1,
            "width": pixmap.width,
            "height": pixmap.height,
            "rect": [0, 0, float(render_page.rect.width), float(render_page.rect.height)],
            "renderScale": render_scale,
        }
    if largest_image and largest_image["bytes"]:
        source_kind = "MIXED_RASTER_VECTOR" if sum(item["vectorPathCount"] for item in page_summaries) else "RASTER_PDF"
        image_page = doc[largest_image["page"] - 1]
        display_rect = fitz.Rect(largest_image["rect"]) * image_page.rotation_matrix
        rotated_width = largest_image["height"] if image_page.rotation in (90, 270) else largest_image["width"]
        rotated_height = largest_image["width"] if image_page.rotation in (90, 270) else largest_image["height"]
        image_metadata = {
            key: largest_image[key]
            for key in ("xref", "page", "width", "height", "ext", "rect")
        }
        recognition_image = {
            "source": "embedded-image",
            "xref": largest_image["xref"],
            "page": largest_image["page"],
            "width": rotated_width,
            "height": rotated_height,
            "rect": list(display_rect),
            "pageRotation": image_page.rotation,
        }
    else:
        recognition_image = preview_image

    page = page_summaries[0] if page_summaries else {"width": 1, "height": 1}
    proposed = {"x": 0.25, "y": 0.08, "width": 0.68, "height": 0.66} if largest_image else {"x": 0, "y": 0, "width": 1, "height": 1}
    excluded = [
        {"label": "Area schedules", "x": 0.0, "y": 0.0, "width": 0.25, "height": 1.0},
        {"label": "General notes / count schedule", "x": 0.64, "y": 0.04, "width": 0.29, "height": 0.29},
        {"label": "Title block / approvals", "x": 0.25, "y": 0.74, "width": 0.68, "height": 0.26},
    ] if largest_image else []
    expected = expected_counts_from_text("\n".join(all_text))
    if preview_name and not expected:
        preview = Image.open(Path(artifact_dir, preview_name))
        schedule = preview.crop((int(preview.width * 0.64), 0, preview.width, int(preview.height * 0.48)))
        schedule_path = Path(artifact_dir, "schedule-region.png")
        schedule.save(schedule_path)
        schedule_ocr = ocr_with_tesseract(schedule_path)
        expected = expected_counts_from_text(" ".join(item["text"] for item in schedule_ocr))
    expected = validated_expected_counts(expected)
    discipline = infer_discipline(ocg_names, 1 if largest_image else 0)

    return {
        "analysis": {
            "discipline": discipline,
            "sourceKind": source_kind,
            "pageNumber": largest_image["page"] if largest_image else 1,
            "proposedRegion": proposed,
            "excludedRegions": excluded,
            "expectedCounts": expected,
            "inspection": {
                "pageCount": len(doc),
                "pages": page_summaries,
                "optionalLayers": ocg_names,
                "largestImage": image_metadata,
                "recognitionImage": recognition_image,
                "previewImage": preview_image,
                "pageBounds": [0, 0, page["width"], page["height"]],
                "requiresRasterRecognition": bool(largest_image),
                "requiresVectorExtraction": sum(item["vectorPathCount"] for item in page_summaries) > 0,
            },
            "previewArtifact": preview_name,
        },
        "layers": [],
        "entities": [],
    }


def inspect_dxf(source):
    import ezdxf
    from ezdxf import bbox

    doc = ezdxf.readfile(source)
    msp = doc.modelspace()
    layer_names = [layer.dxf.name for layer in doc.layers]
    try:
        extents = bbox.extents(msp, fast=True)
        drawing_bounds = [
            float(extents.extmin.x),
            float(extents.extmin.y),
            float(extents.extmax.x),
            float(extents.extmax.y),
        ]
    except Exception:
        drawing_bounds = [0, 0, 1, 1]
    units = int(doc.header.get("$INSUNITS", 0) or 0)
    drawing_units_per_foot = {
        1: 12.0,
        2: 1.0,
        4: 304.8,
        5: 30.48,
        6: 0.3048,
    }.get(units)
    return {
        "analysis": {
            "discipline": infer_discipline(layer_names),
            "sourceKind": "VECTOR_DXF",
            "pageNumber": 1,
            "proposedRegion": {"x": 0, "y": 0, "width": 1, "height": 1},
            "excludedRegions": [],
            "expectedCounts": {},
            "scaleCalibration": {
                "source": "DXF_UNITS",
                "drawingUnitsPerFoot": drawing_units_per_foot,
                "insunits": units,
            } if drawing_units_per_foot else None,
            "calibrationConfirmed": bool(drawing_units_per_foot),
            "inspection": {
                "layers": layer_names,
                "entityCount": len(msp),
                "blockCount": len(doc.blocks),
                "insunits": units,
                "drawingBounds": drawing_bounds,
                "requiresRasterRecognition": False,
                "requiresVectorExtraction": True,
            },
        },
        "layers": [],
        "entities": [],
    }


def create_paddle_engine():
    try:
        from paddleocr import PaddleOCR
    except Exception:
        return None
    try:
        return PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    except TypeError:
        return PaddleOCR(use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=True, lang="en")
    except Exception:
        return None


def ocr_with_paddle(image, engine=None):
    ocr = engine or create_paddle_engine()
    if ocr is None:
        return []
    try:
        result = ocr.ocr(image, cls=True)
    except TypeError:
        result = ocr.predict(image)
    except Exception:
        return []
    items = []
    for page in result or []:
        for item in page or []:
            if isinstance(item, dict):
                texts = item.get("rec_texts", [])
                scores = item.get("rec_scores", [])
                boxes = item.get("rec_polys", [])
                for text, score, box in zip(texts, scores, boxes):
                    items.append({"text": text, "confidence": float(score), "box": [[float(x), float(y)] for x, y in box]})
            elif len(item) >= 2:
                box, recognition = item[0], item[1]
                items.append({
                    "text": recognition[0],
                    "confidence": float(recognition[1]),
                    "box": [[float(x), float(y)] for x, y in box],
                })
    return items


def inverse_rotated_point(point, rotation, original_width, original_height):
    x, y = point
    if rotation == 90:
        return [float(y), float(original_height - 1 - x)]
    if rotation == 180:
        return [float(original_width - 1 - x), float(original_height - 1 - y)]
    if rotation == 270:
        return [float(original_width - 1 - y), float(x)]
    return [float(x), float(y)]


def deduplicate_ocr(items):
    result = []
    for item in sorted(items, key=lambda value: float(value.get("confidence", 0)), reverse=True):
        center = [
            sum(point[0] for point in item["box"]) / len(item["box"]),
            sum(point[1] for point in item["box"]) / len(item["box"]),
        ]
        duplicate = False
        for existing in result:
            existing_center = [
                sum(point[0] for point in existing["box"]) / len(existing["box"]),
                sum(point[1] for point in existing["box"]) / len(existing["box"]),
            ]
            if str(existing["text"]).strip().upper() == str(item["text"]).strip().upper() and math.dist(center, existing_center) < 8:
                duplicate = True
                break
        if not duplicate:
            result.append(item)
    return result


def ocr_with_rotations(image, artifact_dir):
    import cv2

    engine = create_paddle_engine()
    all_items = []
    engines_used = []
    height, width = image.shape[:2]
    for rotation in (0, 90):
        rotated = image if rotation == 0 else cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
        items = ocr_with_paddle(rotated, engine)
        engine_name = "paddleocr"
        if not items:
            path = Path(artifact_dir, f"ocr-{rotation}.png")
            cv2.imwrite(str(path), rotated)
            items = ocr_with_tesseract(path)
            engine_name = "tesseract"
        engines_used.append(engine_name)
        for item in items:
            item = {**item, "box": [
                inverse_rotated_point(point, rotation, width, height)
                for point in item["box"]
            ]}
            all_items.append(item)
    return deduplicate_ocr(all_items), "+".join(sorted(set(engines_used))), engine


def enrich_unlabelled_cells_with_paddle(image, cells, ocr_items, engine, expected_total):
    if engine is None:
        return ocr_items
    import cv2

    occupied = set()
    for item in ocr_items:
        if not normalize_plot_label(item.get("text"), expected_total):
            continue
        center = [
            sum(point[0] for point in item["box"]) / len(item["box"]),
            sum(point[1] for point in item["box"]) / len(item["box"]),
        ]
        containing = [(index, cell) for index, cell in enumerate(cells) if point_in_bbox(center, cell["bbox"], padding=3)]
        if containing:
            occupied.add(min(containing, key=lambda value: value[1]["area"])[0])
    page_area = image.shape[0] * image.shape[1]
    occupied_areas = sorted(cells[index]["area"] for index in occupied)
    median_area = occupied_areas[len(occupied_areas) // 2] if occupied_areas else None
    unresolved = [
        (index, cell)
        for index, cell in enumerate(cells)
        if index not in occupied
        and page_area * 0.00002 <= cell["area"] <= page_area * 0.0025
        and (
            median_area is None
            or 0.35 <= cell["area"] / max(median_area, 1) <= 2.8
        )
    ]
    if median_area:
        unresolved.sort(key=lambda value: abs(math.log(max(value[1]["area"] / median_area, 1e-9))))
    configured_limit = int(os.environ.get("CAD_CELL_OCR_LIMIT", "700"))
    recovery_target = max(100, (int(expected_total) - len(occupied) if expected_total else 0) + 100)
    unresolved = unresolved[:min(configured_limit, recovery_target)]
    enriched = list(ocr_items)
    for _, cell in unresolved:
        x0, y0, x1, y1 = cell["bbox"]
        padding = 4
        x0, y0 = max(0, x0 - padding), max(0, y0 - padding)
        x1, y1 = min(image.shape[1], x1 + padding), min(image.shape[0], y1 + padding)
        crop = image[y0:y1, x0:x1]
        if crop.size == 0:
            continue
        scale = max(2.0, min(4.0, 160 / max(crop.shape[0], crop.shape[1], 1)))
        enlarged = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        for item in ocr_with_paddle(enlarged, engine):
            enriched.append({
                **item,
                "box": [[x0 + point[0] / scale, y0 + point[1] / scale] for point in item["box"]],
            })
    return deduplicate_ocr(enriched)


def ocr_with_tesseract(image_path):
    command = [
        os.environ.get("TESSERACT_BIN", "tesseract"),
        str(image_path),
        "stdout",
        "--psm",
        "11",
        "tsv",
    ]
    try:
        output = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            timeout=int(os.environ.get("CAD_OCR_TIMEOUT_SECONDS", "600")),
        ).stdout
    except Exception:
        return []
    rows = output.splitlines()
    if not rows:
        return []
    header = rows[0].split("\t")
    result = []
    for row in rows[1:]:
        values = row.split("\t")
        if len(values) != len(header):
            continue
        item = dict(zip(header, values))
        text = item.get("text", "").strip()
        try:
            confidence = float(item.get("conf", "-1")) / 100.0
            x, y, width, height = (int(item[key]) for key in ("left", "top", "width", "height"))
        except Exception:
            continue
        if text and confidence > 0:
            result.append({
                "text": text,
                "confidence": confidence,
                "box": [[x, y], [x + width, y], [x + width, y + height], [x, y + height]],
            })
    return result


def contour_cells(image):
    import cv2
    import numpy as np

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
    binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 11)
    horizontal_size = max(12, image.shape[1] // 180)
    vertical_size = max(12, image.shape[0] // 180)
    horizontal = cv2.morphologyEx(binary, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (horizontal_size, 1)))
    vertical = cv2.morphologyEx(binary, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, vertical_size)))
    grid = cv2.bitwise_or(horizontal, vertical)
    grid = cv2.morphologyEx(grid, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    contours, _ = cv2.findContours(grid, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    page_area = image.shape[0] * image.shape[1]
    cells = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < page_area * 0.000015 or area > page_area * 0.01:
            continue
        perimeter = cv2.arcLength(contour, True)
        polygon = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(polygon) < 4 or len(polygon) > 10:
            continue
        x, y, width, height = cv2.boundingRect(polygon)
        if width < 12 or height < 12:
            continue
        if width * height > page_area * 0.012:
            continue
        aspect = max(width / max(height, 1), height / max(width, 1))
        if aspect > 10:
            continue
        points = [[float(point[0][0]), float(point[0][1])] for point in polygon]
        cells.append({"points": points, "bbox": [x, y, x + width, y + height], "area": area})
    return cells


def point_in_bbox(point, bbox, padding=0):
    return bbox[0] - padding <= point[0] <= bbox[2] + padding and bbox[1] - padding <= point[1] <= bbox[3] + padding


def bbox_overlap_ratio(first, second):
    x0 = max(first[0], second[0])
    y0 = max(first[1], second[1])
    x1 = min(first[2], second[2])
    y1 = min(first[3], second[3])
    intersection = max(0, x1 - x0) * max(0, y1 - y0)
    if intersection <= 0:
        return 0.0
    first_area = max(1, first[2] - first[0]) * max(1, first[3] - first[1])
    second_area = max(1, second[2] - second[0]) * max(1, second[3] - second[1])
    return intersection / min(first_area, second_area)


def image_point_to_page(point, crop, image_size, image_rect):
    full_x = crop[0] + point[0]
    full_y = crop[1] + point[1]
    x = image_rect[0] + (full_x / image_size[0]) * (image_rect[2] - image_rect[0])
    y = image_rect[1] + (full_y / image_size[1]) * (image_rect[3] - image_rect[1])
    return [float(x), float(y)]


def page_region_to_image_crop(region, page_rect, image_rect, image_size):
    value = normalized_region(region)
    page_x0 = value["x"] * page_rect.width
    page_y0 = value["y"] * page_rect.height
    page_x1 = (value["x"] + value["width"]) * page_rect.width
    page_y1 = (value["y"] + value["height"]) * page_rect.height
    rect_width = max(1e-9, image_rect[2] - image_rect[0])
    rect_height = max(1e-9, image_rect[3] - image_rect[1])
    x0 = int((page_x0 - image_rect[0]) / rect_width * image_size[0])
    y0 = int((page_y0 - image_rect[1]) / rect_height * image_size[1])
    x1 = int((page_x1 - image_rect[0]) / rect_width * image_size[0])
    y1 = int((page_y1 - image_rect[1]) / rect_height * image_size[1])
    return [
        max(0, min(image_size[0], x0)),
        max(0, min(image_size[1], y0)),
        max(0, min(image_size[0], x1)),
        max(0, min(image_size[1], y1)),
    ]


def load_recognition_image(doc, page, image_info):
    import cv2
    import fitz
    import numpy as np

    if image_info.get("source") == "embedded-image" and image_info.get("xref"):
        extracted = doc.extract_image(int(image_info["xref"]))
        image = cv2.imdecode(np.frombuffer(extracted["image"], dtype=np.uint8), cv2.IMREAD_COLOR)
        rotation = int(image_info.get("pageRotation") or page.rotation or 0)
        if rotation == 90:
            image = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
        elif rotation == 180:
            image = cv2.rotate(image, cv2.ROTATE_180)
        elif rotation == 270:
            image = cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
        return image

    render_scale = float(image_info.get("renderScale") or os.environ.get("CAD_PDF_RENDER_SCALE", "2"))
    pixmap = page.get_pixmap(matrix=fitz.Matrix(render_scale, render_scale), alpha=False)
    raw = np.frombuffer(pixmap.samples, dtype=np.uint8)
    image = raw.reshape((pixmap.height, pixmap.width, pixmap.n))
    if pixmap.n == 3:
        return cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    if pixmap.n == 4:
        return cv2.cvtColor(image, cv2.COLOR_RGBA2BGR)
    return image


def printed_area_near(label_item, ocr_items):
    center = [
        sum(point[0] for point in label_item["box"]) / len(label_item["box"]),
        sum(point[1] for point in label_item["box"]) / len(label_item["box"]),
    ]
    matches = []
    for item in ocr_items:
        text = item["text"].upper().replace(",", "")
        area_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:SQ\.?\s*YDS?|SQ\.?\s*FT)", text)
        if not area_match:
            continue
        item_center = [
            sum(point[0] for point in item["box"]) / len(item["box"]),
            sum(point[1] for point in item["box"]) / len(item["box"]),
        ]
        matches.append((math.dist(center, item_center), float(area_match.group(1)), "SQYD" if "YD" in text else "SQFT"))
    if not matches:
        return None
    _, value, unit = min(matches, key=lambda item: item[0])
    return {"value": value, "unit": unit, "areaSqft": value * 9 if unit == "SQYD" else value}


def extract_raster_plots(doc, page, analysis, artifact_dir):
    import cv2

    inspection = analysis.get("inspection") or {}
    image_info = inspection.get("recognitionImage") or {}
    image = load_recognition_image(doc, page, image_info)
    if image is None:
        return [], {"ocrCount": 0, "cellCount": 0, "reason": "PDF page could not be rendered"}

    region = normalized_region(analysis.get("confirmedRegion") or analysis.get("proposedRegion"))
    height, width = image.shape[:2]
    image_rect = image_info.get("rect") or [0, 0, page.rect.width, page.rect.height]
    x0, y0, x1, y1 = page_region_to_image_crop(region, page.rect, image_rect, [width, height])
    if x1 <= x0 or y1 <= y0:
        return [], {"ocrCount": 0, "cellCount": 0, "reason": "Confirmed drawing region does not intersect the raster site plan"}
    crop_image = image[y0:y1, x0:x1]
    for excluded in analysis.get("excludedRegions") or []:
        ex0, ey0, ex1, ey1 = page_region_to_image_crop(excluded, page.rect, image_rect, [width, height])
        ex0, ey0 = max(x0, ex0), max(y0, ey0)
        ex1, ey1 = min(x1, ex1), min(y1, ey1)
        if ex1 > ex0 and ey1 > ey0:
            crop_image[ey0 - y0:ey1 - y0, ex0 - x0:ex1 - x0] = 255
    crop_path = Path(artifact_dir, "recognition-region.png")
    cv2.imwrite(str(crop_path), crop_image)

    expected_total = (analysis.get("expectedCounts") or {}).get("total")
    cells = contour_cells(crop_image)
    ocr_items, ocr_engine, paddle_engine = ocr_with_rotations(crop_image, artifact_dir)
    ocr_items = enrich_unlabelled_cells_with_paddle(crop_image, cells, ocr_items, paddle_engine, expected_total)

    cell_candidates = defaultdict(list)
    for item in ocr_items:
        label = normalize_plot_label(item["text"], expected_total)
        if not label:
            continue
        center = [
            sum(point[0] for point in item["box"]) / len(item["box"]),
            sum(point[1] for point in item["box"]) / len(item["box"]),
        ]
        containing = [(index, cell) for index, cell in enumerate(cells) if point_in_bbox(center, cell["bbox"], padding=3)]
        if not containing:
            continue
        cell_index, cell = min(containing, key=lambda value: value[1]["area"])
        cell_candidates[cell_index].append({
            "item": item,
            "label": label,
            "center": center,
            "score": plot_label_score(label, item, expected_total),
        })

    label_frequency = defaultdict(int)
    for possible in cell_candidates.values():
        for label in {value["label"] for value in possible}:
            label_frequency[label] += 1

    candidates = []
    for cell_index, possible in cell_candidates.items():
        distinct_labels = {value["label"] for value in possible}
        if len(distinct_labels) > 4:
            continue
        selected = max(
            possible,
            key=lambda value: value["score"] - min(5.0, max(0, label_frequency[value["label"]] - 1) * 1.5),
        )
        item = selected["item"]
        label = selected["label"]
        center = selected["center"]
        cell = cells[cell_index]
        page_points = [
            image_point_to_page(point, [x0, y0, x1, y1], [width, height], image_rect)
            for point in cell["points"]
        ]
        if page_points[0] != page_points[-1]:
            page_points.append(page_points[0])
        printed = printed_area_near(item, ocr_items)
        validation = {
            "source": "raster-cell-ocr",
            "closed": True,
            "validPlotLabel": True,
            "ocrConfidence": item["confidence"],
            "cellTextCandidates": sorted(distinct_labels),
            "printedArea": printed,
            "blockingCodes": [],
        }
        measurements = {"areaPdfPoints": polygon_area(page_points)}
        if printed:
            measurements["printedAreaSqft"] = printed["areaSqft"]
        entity = {
            "layer": "Raster plot candidates",
            "label": label,
            "type": "PLOT",
            "confidence": min(0.94, max(0.45, float(item["confidence"]))),
            "geometry": {"type": "polygon", "points": page_points, "closed": True},
            "measurements": measurements,
            "validation": validation,
            "status": "SUGGESTED",
            "sourceHandle": f"ocr-cell:{cell_index}:{label}",
        }
        candidates.append(entity)

    if expected_total and len(candidates) < int(expected_total) and cell_candidates:
        labelled_indices = set(cell_candidates.keys())
        labelled_cells = [cells[index] for index in labelled_indices]
        labelled_areas = sorted(cell["area"] for cell in labelled_cells)
        median_area = labelled_areas[len(labelled_areas) // 2]
        possible_missing = []
        for index, cell in enumerate(cells):
            if index in labelled_indices or median_area <= 0:
                continue
            cell_width = max(1, cell["bbox"][2] - cell["bbox"][0])
            cell_height = max(1, cell["bbox"][3] - cell["bbox"][1])
            aspect = max(cell_width / cell_height, cell_height / cell_width)
            area_ratio = cell["area"] / median_area
            if not 0.35 <= area_ratio <= 2.8 or aspect > 5:
                continue
            if any(bbox_overlap_ratio(cell["bbox"], labelled["bbox"]) > 0.55 for labelled in labelled_cells):
                continue
            possible_missing.append((
                abs(math.log(max(area_ratio, 1e-9))) + max(0, aspect - 2) * 0.2,
                index,
                cell,
            ))
        selected_missing = []
        for _, cell_index, cell in sorted(possible_missing):
            if any(bbox_overlap_ratio(cell["bbox"], selected["bbox"]) > 0.55 for selected in selected_missing):
                continue
            selected_missing.append(cell)
            page_points = [
                image_point_to_page(point, [x0, y0, x1, y1], [width, height], image_rect)
                for point in cell["points"]
            ]
            if page_points[0] != page_points[-1]:
                page_points.append(page_points[0])
            candidates.append({
                "layer": "Raster plot candidates",
                "label": None,
                "type": "PLOT",
                "confidence": 0.25,
                "geometry": {"type": "polygon", "points": page_points, "closed": True},
                "measurements": {"areaPdfPoints": polygon_area(page_points)},
                "validation": {
                    "source": "raster-unlabelled-cell",
                    "closed": True,
                    "validPlotLabel": False,
                    "blockingCodes": [],
                },
                "status": "SUGGESTED",
                "sourceHandle": f"unlabelled-cell:{cell_index}",
            })
            if len(candidates) >= int(expected_total):
                break

    duplicates = defaultdict(int)
    for entity in candidates:
        duplicates[entity["label"]] += 1
    for entity in candidates:
        label = entity["label"]
        if duplicates[label] > 1:
            entity["validation"]["blockingCodes"].append("DUPLICATE_OCR_LABEL")
            entity["confidence"] = min(entity["confidence"], 0.55)

    return candidates, {
        "ocrEngine": ocr_engine,
        "ocrCount": len(ocr_items),
        "cellCount": len(cells),
        "candidateCount": len(candidates),
        "recognitionArtifact": crop_path.name,
    }


def pdf_drawing_points(drawing):
    points = []

    def add(point):
        value = [float(point.x), float(point.y)]
        if not points or math.dist(points[-1], value) > 0.001:
            points.append(value)

    for item in drawing.get("items", []):
        if item[0] == "l":
            add(item[1])
            add(item[2])
        elif item[0] == "re":
            rect = item[1]
            for point in (
                type("Point", (), {"x": rect.x0, "y": rect.y0}),
                type("Point", (), {"x": rect.x1, "y": rect.y0}),
                type("Point", (), {"x": rect.x1, "y": rect.y1}),
                type("Point", (), {"x": rect.x0, "y": rect.y1}),
            ):
                add(point)
        elif item[0] == "qu":
            for point in (item[1].ul, item[1].ur, item[1].lr, item[1].ll):
                add(point)
    return points


def cluster_points(items, radius):
    clusters = []
    for item in items:
        center = item["center"]
        cluster = next(
            (value for value in clusters if math.dist(center, value["center"]) <= radius),
            None,
        )
        if cluster:
            cluster["items"].append(item)
            count = len(cluster["items"])
            cluster["center"] = [
                (cluster["center"][0] * (count - 1) + center[0]) / count,
                (cluster["center"][1] * (count - 1) + center[1]) / count,
            ]
        else:
            clusters.append({"center": center, "items": [item]})
    return clusters


def electrical_layer_type(layer):
    value = layer.upper()
    if "TF" in value or "TRANSFORMER" in value or "KVA" in value:
        return "TRANSFORMER"
    if "MPB" in value:
        return "MPB"
    if "RMU" in value:
        return "RMU"
    if "CABLE" in value or re.search(r"\(\d+\)", value):
        return "CABLE"
    return None


def extract_pdf_electrical(page):
    from shapely.geometry import LineString
    from shapely.ops import linemerge, unary_union

    by_layer = defaultdict(list)
    for drawing in page.get_drawings():
        layer = str(drawing.get("layer") or "PDF vectors")
        asset_type = electrical_layer_type(layer)
        if not asset_type:
            continue
        rect = drawing.get("rect")
        if rect and (rect.width > page.rect.width * 0.8 or rect.height > page.rect.height * 0.8):
            continue
        points = pdf_drawing_points(drawing)
        if len(points) < 2:
            continue
        by_layer[layer].append({
            "points": points,
            "center": [(rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2] if rect else points[0],
            "rect": list(rect) if rect else bounds_for_points(points),
            "color": drawing.get("color"),
            "assetType": asset_type,
        })

    entities = []
    layer_metadata = []
    for layer, items in by_layer.items():
        asset_type = items[0]["assetType"]
        color = items[0].get("color")
        layer_metadata.append({
            "name": layer,
            "purpose": "UTILITY",
            "metadata": {"electricalType": asset_type, "source": "pdf-optional-layer", "color": color},
        })
        if asset_type == "CABLE":
            lines = [LineString(item["points"]) for item in items if len(item["points"]) >= 2]
            try:
                merged = linemerge(unary_union(lines))
                geometries = list(merged.geoms) if hasattr(merged, "geoms") else [merged]
            except Exception:
                geometries = lines
            for index, geometry in enumerate(geometries):
                points = [[float(x), float(y)] for x, y in geometry.coords]
                if line_length(points) < 2:
                    continue
                entities.append({
                    "layer": layer,
                    "label": f"{layer} network {index + 1}",
                    "type": "UTILITY",
                    "confidence": 0.9,
                    "geometry": {"type": "polyline", "points": points, "closed": False},
                    "measurements": {"lengthPdfPoints": line_length(points), "electricalType": "CABLE"},
                    "validation": {"source": "pdf-vector-layer", "blockingCodes": []},
                    "status": "SUGGESTED",
                    "sourceHandle": f"{layer}:network:{index + 1}",
                })
        else:
            for index, cluster in enumerate(cluster_points(items, radius=12)):
                center = cluster["center"]
                label = f"{layer} {index + 1}"
                entities.append({
                    "layer": layer,
                    "label": label,
                    "type": "ELECTRICAL_POINT",
                    "confidence": 0.9,
                    "geometry": {"type": "point", "point": center},
                    "measurements": {"electricalType": asset_type, "symbolPartCount": len(cluster["items"])},
                    "validation": {"source": "pdf-vector-symbol", "blockingCodes": []},
                    "status": "SUGGESTED",
                    "sourceHandle": f"{layer}:symbol:{index + 1}",
                })
    return entities, layer_metadata


def extract_pdf(source, options, artifact_dir):
    import fitz

    doc = fitz.open(source)
    analysis = options.get("analysis") or {}
    page_number = max(1, int(analysis.get("pageNumber") or 1))
    page = doc[page_number - 1]
    plots, raster_metadata = extract_raster_plots(doc, page, analysis, artifact_dir)
    electrical, layer_metadata = extract_pdf_electrical(page)
    layers = [{"name": "Raster plot candidates", "purpose": "PLOT", "metadata": {"source": "raster-recognition"}}]
    layers.extend(layer_metadata)
    return {
        "analysis": {
            **analysis,
            "inspection": {
                **(analysis.get("inspection") or {}),
                "recognition": raster_metadata,
            },
            "recognitionArtifact": raster_metadata.get("recognitionArtifact"),
        },
        "layers": layers,
        "entities": plots + electrical,
    }


def dxf_text(entity):
    if entity.dxftype() == "TEXT":
        return str(entity.dxf.text)
    if entity.dxftype() == "MTEXT":
        return str(entity.plain_text())
    return ""


def dxf_point(entity):
    location = entity.dxf.insert
    return [float(location.x), float(location.y)]


def extract_dxf(source, options):
    import ezdxf
    from shapely.geometry import LineString, Point, Polygon
    from shapely.ops import polygonize, snap, unary_union

    doc = ezdxf.readfile(source)
    msp = doc.modelspace()
    analysis = options.get("analysis") or {}
    expected_total = (analysis.get("expectedCounts") or {}).get("total")
    scale = analysis.get("scaleCalibration") or {}
    units_per_foot = float(scale.get("drawingUnitsPerFoot", 0) or 0)
    texts = []
    linework = defaultdict(list)
    direct_polygons = []

    def consume(entity, source_handle=None):
        layer = str(getattr(entity.dxf, "layer", "0"))
        kind = entity.dxftype()
        handle = source_handle or getattr(entity.dxf, "handle", None)
        if kind in ("TEXT", "MTEXT"):
            texts.append({"text": dxf_text(entity), "point": dxf_point(entity), "layer": layer, "handle": handle})
        elif kind == "LINE":
            start, end = entity.dxf.start, entity.dxf.end
            linework[layer].append(LineString([(start.x, start.y), (end.x, end.y)]))
        elif kind == "LWPOLYLINE":
            points = [(float(point[0]), float(point[1])) for point in entity.get_points()]
            if len(points) >= 2:
                if entity.closed and points[0] != points[-1]:
                    points.append(points[0])
                line = LineString(points)
                linework[layer].append(line)
                if entity.closed and len(points) >= 4:
                    direct_polygons.append((layer, Polygon(points), handle))
        elif kind == "POLYLINE":
            points = [(float(vertex.dxf.location.x), float(vertex.dxf.location.y)) for vertex in entity.vertices]
            if len(points) >= 2:
                if entity.is_closed and points[0] != points[-1]:
                    points.append(points[0])
                linework[layer].append(LineString(points))
                if entity.is_closed and len(points) >= 4:
                    direct_polygons.append((layer, Polygon(points), handle))
        elif kind == "INSERT":
            try:
                for child in entity.virtual_entities():
                    consume(child, handle)
            except Exception:
                pass

    for entity in msp:
        consume(entity)

    tolerance = float(options.get("snapTolerance") or 0.01)
    polygons = list(direct_polygons)
    for layer, lines in linework.items():
        try:
            merged = unary_union(lines)
            snapped = snap(merged, merged, tolerance)
            polygons.extend((layer, polygon, None) for polygon in polygonize(snapped))
        except Exception:
            continue

    candidates = []
    seen_geometry = set()
    for layer, polygon, handle in polygons:
        if polygon.is_empty or not polygon.is_valid or polygon.area <= 0:
            continue
        key = tuple(round(value, 3) for value in polygon.bounds)
        if key in seen_geometry:
            continue
        seen_geometry.add(key)
        inside = [
            text for text in texts
            if polygon.buffer(max(tolerance, 0.01)).contains(Point(text["point"]))
        ]
        labels = [
            (normalize_plot_label(text["text"], expected_total), text)
            for text in inside
        ]
        labels = [(label, text) for label, text in labels if label]
        if not labels:
            continue
        label, matched = max(labels, key=lambda item: len(item[0]))
        points = [[float(x), float(y)] for x, y in polygon.exterior.coords]
        measurements = {"areaCadUnits": float(polygon.area)}
        if units_per_foot > 0:
            measurements["areaSqft"] = float(polygon.area) / (units_per_foot ** 2)
        candidates.append({
            "layer": layer,
            "label": label,
            "type": "PLOT",
            "confidence": 0.88,
            "geometry": {"type": "polygon", "points": points, "closed": True},
            "measurements": measurements,
            "validation": {
                "source": "dxf-topology",
                "closed": True,
                "validPlotLabel": True,
                "matchedTextHandle": matched.get("handle"),
                "blockingCodes": [] if units_per_foot > 0 else ["SCALE_REQUIRED"],
            },
            "status": "SUGGESTED",
            "sourceHandle": handle,
        })

    layers = [
        {"name": layer, "purpose": "PLOT" if any(entity["layer"] == layer for entity in candidates) else "UNKNOWN", "metadata": {"source": "dxf-layer"}}
        for layer in sorted(linework.keys())
    ]
    return {
        "analysis": analysis,
        "layers": layers,
        "entities": candidates,
    }


def main():
    source = Path(sys.argv[1])
    fmt = sys.argv[2]
    mode = sys.argv[3] if len(sys.argv) > 3 else "extract"
    options = safe_json(sys.argv[4] if len(sys.argv) > 4 else None)
    artifact_dir = sys.argv[5] if len(sys.argv) > 5 else str(source.parent)
    Path(artifact_dir).mkdir(parents=True, exist_ok=True)

    if mode == "inspect":
        result = inspect_pdf(source, artifact_dir) if fmt == "VECTOR_PDF" else inspect_dxf(source)
    elif mode == "extract":
        result = extract_pdf(source, options, artifact_dir) if fmt == "VECTOR_PDF" else extract_dxf(source, options)
    else:
        raise RuntimeError(f"Unsupported CAD intelligence mode: {mode}")
    print(json.dumps(result))


if __name__ == "__main__":
    main()
