#!/usr/bin/env python3
import json
import math
import os
import re
import sys
from pathlib import Path


def classify(text):
    hay = (text or "").lower()
    if "plot" in hay or "khasra" in hay:
        return "PLOT"
    if "road" in hay or "street" in hay:
        return "ROAD"
    if "bound" in hay:
        return "BOUNDARY"
    if "park" in hay:
        return "PARK"
    if "gate" in hay:
        return "GATE"
    if "club" in hay or "community" in hay:
        return "CLUBHOUSE"
    if "drain" in hay:
        return "DRAINAGE"
    if "electric" in hay or "pole" in hay:
        return "UTILITY"
    if "water" in hay or "sewer" in hay:
        return "UTILITY"
    if "bath" in hay:
        return "BATHROOM"
    if "kitchen" in hay:
        return "KITCHEN"
    if "garden" in hay:
        return "GARDEN"
    if "room" in hay or "bed" in hay:
        return "ROOM"
    if "wall" in hay:
        return "WALL"
    if "door" in hay:
        return "DOOR"
    if "window" in hay:
        return "WINDOW"
    if "stair" in hay:
        return "STAIRCASE"
    if "parking" in hay or "garage" in hay:
        return "PARKING"
    return "UNKNOWN"


def looks_like_plot_label(text):
    value = (text or "").strip()
    if not value:
        return False
    return bool(re.match(r"^(plot\s*)?[a-z]?\s*[-/]?\s*\d{1,4}[a-z]?$", value, re.I))


def area(points):
    if len(points) < 3:
        return 0
    total = 0
    for idx, point in enumerate(points):
        nxt = points[(idx + 1) % len(points)]
        total += point[0] * nxt[1] - nxt[0] * point[1]
    return abs(total / 2)


def length(points):
    if len(points) < 2:
        return 0
    return sum(math.dist(points[idx], points[idx + 1]) for idx in range(len(points) - 1))


def centroid(points):
    if not points:
        return [0, 0]
    return [sum(point[0] for point in points) / len(points), sum(point[1] for point in points) / len(points)]


def point_in_polygon(point, polygon):
    if len(polygon) < 3:
        return False
    x, y = point
    inside = False
    j = len(polygon) - 1
    for i in range(len(polygon)):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        intersects = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi)
        if intersects:
            inside = not inside
        j = i
    return inside


def nearest_text(point, texts, max_distance=None):
    best = None
    best_distance = None
    for text in texts:
        distance = math.dist(point, text["point"])
        if max_distance is not None and distance > max_distance:
            continue
        if best_distance is None or distance < best_distance:
            best = text
            best_distance = distance
    return best


def entity_confidence(kind, label, layer):
    if kind == "UNKNOWN":
        return 0.35
    if label and layer and label.strip().lower() != layer.strip().lower():
        return 0.86
    return 0.72


def dxf(path):
    try:
        import ezdxf
    except Exception as exc:
        raise RuntimeError("Python package ezdxf is required for DXF extraction") from exc

    doc = ezdxf.readfile(path)
    raw_shapes = []
    text_entities = []
    layers = set()
    for entity in doc.modelspace():
        layer = entity.dxf.layer if hasattr(entity.dxf, "layer") else "0"
        layers.add(layer)
        label = layer
        geometry = {"type": entity.dxftype()}
        measurements = {}
        if entity.dxftype() in ["LWPOLYLINE", "POLYLINE"]:
            if entity.dxftype() == "LWPOLYLINE":
                points = [(float(p[0]), float(p[1])) for p in entity.get_points()]
            else:
                points = [(float(vertex.dxf.location.x), float(vertex.dxf.location.y)) for vertex in entity.vertices]
            closed = bool(entity.closed)
            geometry = {"type": "polyline", "points": points, "closed": closed}
            if closed:
                measurements["areaSqft"] = area(points)
            else:
                measurements["length"] = length(points)
        elif entity.dxftype() == "LINE":
            start = entity.dxf.start
            end = entity.dxf.end
            geometry = {"type": "line", "points": [[start.x, start.y], [end.x, end.y]]}
            measurements["length"] = math.dist([start.x, start.y], [end.x, end.y])
        elif entity.dxftype() in ["TEXT", "MTEXT"]:
            label = entity.dxf.text if entity.dxftype() == "TEXT" else entity.text
            point = entity.dxf.insert
            text_entities.append({"layer": layer, "label": label, "point": [point.x, point.y]})
            continue
        raw_shapes.append({
            "layer": layer,
            "label": label,
            "dxftype": entity.dxftype(),
            "geometry": geometry,
            "measurements": measurements,
        })

    entities = []
    consumed_texts = set()
    for shape in raw_shapes:
        layer = shape["layer"]
        label = shape["label"]
        geometry = shape["geometry"]
        text_match = None

        if geometry.get("type") == "polyline" and geometry.get("closed") and geometry.get("points"):
            points = geometry["points"]
            inside_texts = [text for text in text_entities if point_in_polygon(text["point"], points)]
            if inside_texts:
                center = centroid(points)
                text_match = nearest_text(center, inside_texts)
            else:
                text_match = nearest_text(centroid(points), text_entities)
            if text_match and text_match.get("label"):
                label = text_match["label"].strip()
                consumed_texts.add(f"{text_match['point'][0]}:{text_match['point'][1]}:{text_match['label']}")

        kind = classify(f"{layer} {label}")
        if kind == "UNKNOWN" and geometry.get("type") == "polyline" and geometry.get("closed") and looks_like_plot_label(label):
            kind = "PLOT"

        confidence = entity_confidence(kind, label, layer)
        entities.append({
            "layer": layer,
            "label": label,
            "type": kind,
            "confidence": confidence,
            "geometry": geometry,
            "measurements": shape["measurements"],
            "status": "CONFIRMED" if confidence >= 0.7 else "SUGGESTED",
        })

    for text in text_entities:
        key = f"{text['point'][0]}:{text['point'][1]}:{text['label']}"
        if key in consumed_texts:
            continue
        kind = classify(f"{text['layer']} {text['label']}")
        entities.append({
            "layer": text["layer"],
            "label": text["label"][:80],
            "type": kind,
            "confidence": 0.55 if kind != "UNKNOWN" else 0.3,
            "geometry": {"type": "text", "point": text["point"], "text": text["label"]},
            "measurements": {},
            "status": "SUGGESTED",
        })
    return {"layers": list(layers), "entities": entities}


def vector_pdf(path):
    try:
        import fitz
    except Exception as exc:
        raise RuntimeError("Python package PyMuPDF is required for vector PDF extraction") from exc

    doc = fitz.open(path)
    if doc.needs_pass:
        raise RuntimeError("Password-protected PDFs are not supported. Upload an unlocked vector PDF.")

    entities = []
    layers = []
    page_offset_y = 0
    vector_path_count = 0
    image_count = 0
    max_entities = int(os.environ.get("MAX_PDF_CAD_ENTITIES", "25000"))

    for page_index, page in enumerate(doc):
        layer = f"page-{page_index + 1}"
        layers.append(layer)
        image_count += len(page.get_images(full=True))
        page_texts = []
        for block in page.get_text("dict").get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = str(span.get("text", "")).strip()
                    bbox = span.get("bbox")
                    if text and bbox:
                        page_texts.append({
                            "layer": layer,
                            "label": text,
                            "point": [
                                (float(bbox[0]) + float(bbox[2])) / 2,
                                (float(bbox[1]) + float(bbox[3])) / 2 + page_offset_y,
                            ],
                        })

        consumed_texts = set()
        for drawing_index, drawing in enumerate(page.get_drawings()):
            points, closed = pdf_drawing_points(drawing, page_offset_y)
            if len(points) < 2:
                continue
            vector_path_count += 1
            center = centroid(points)
            matching_texts = [text for text in page_texts if closed and point_in_polygon(text["point"], points)]
            text_match = nearest_text(center, matching_texts or page_texts, max_distance=max(page.rect.width, page.rect.height) * 0.15)
            label = text_match["label"].strip()[:80] if text_match else f"Vector path {drawing_index + 1}"
            if text_match:
                consumed_texts.add(f"{text_match['point'][0]}:{text_match['point'][1]}:{text_match['label']}")

            shape_area = area(points) if closed else 0
            page_area = float(page.rect.width * page.rect.height)
            kind = "BOUNDARY" if closed and page_area and shape_area / page_area >= 0.7 else classify(label)
            if kind == "BOUNDARY":
                label = "Site boundary"
            elif kind == "UNKNOWN" and closed and looks_like_plot_label(label):
                kind = "PLOT"
            confidence = 0.82 if kind != "UNKNOWN" and text_match else 0.42 if closed else 0.32
            measurements = {"lengthPdfPoints": length(points)}
            if closed:
                measurements["areaPdfPoints"] = shape_area
            entities.append({
                "layer": layer,
                "label": label,
                "type": kind,
                "confidence": confidence,
                "geometry": {"type": "polyline", "points": points, "closed": closed},
                "measurements": measurements,
                "status": "CONFIRMED" if confidence >= 0.7 else "SUGGESTED",
            })
            if len(entities) > max_entities:
                raise RuntimeError(f"Vector PDF contains more than {max_entities} extractable entities. Simplify or split the drawing before upload.")

        for text in page_texts:
            key = f"{text['point'][0]}:{text['point'][1]}:{text['label']}"
            if key in consumed_texts:
                continue
            kind = classify(text["label"])
            entities.append({
                "layer": layer,
                "label": text["label"][:80],
                "type": kind,
                "confidence": 0.55 if kind != "UNKNOWN" else 0.3,
                "geometry": {"type": "text", "point": text["point"], "text": text["label"]},
                "measurements": {},
                "status": "SUGGESTED",
            })
        page_offset_y += float(page.rect.height) + 40

    if vector_path_count == 0:
        if image_count:
            raise RuntimeError("This PDF contains scanned or raster pages, not editable vector geometry. Export the plan as a vector PDF or DXF and upload it again.")
        raise RuntimeError("No vector geometry was found in this PDF. Export the source drawing as a vector PDF or DXF and upload it again.")

    return {
        "layers": layers,
        "entities": entities,
        "metadata": {
            "pageCount": len(doc),
            "vectorPathCount": vector_path_count,
            "imageCount": image_count,
        },
    }


def pdf_drawing_points(drawing, page_offset_y):
    points = []
    closed = bool(drawing.get("closePath"))

    def add_xy(x, y):
        value = [float(x), float(y) + page_offset_y]
        if not points or math.dist(points[-1], value) > 0.001:
            points.append(value)

    def add_point(point):
        add_xy(point.x, point.y)

    for item in drawing.get("items", []):
        command = item[0]
        if command == "l":
            add_point(item[1])
            add_point(item[2])
        elif command == "re":
            rect = item[1]
            rect_points = [
                (rect.x0, rect.y0),
                (rect.x1, rect.y0),
                (rect.x1, rect.y1),
                (rect.x0, rect.y1),
            ]
            for x, y in rect_points:
                add_xy(x, y)
            closed = True
        elif command == "qu":
            quad = item[1]
            for point in [quad.ul, quad.ur, quad.lr, quad.ll]:
                add_point(point)
            closed = True
        elif command == "c":
            start, control1, control2, end = item[1], item[2], item[3], item[4]
            if not points:
                add_point(start)
            for step in range(1, 9):
                t = step / 8
                mt = 1 - t
                add_xy(
                    mt ** 3 * start.x + 3 * mt ** 2 * t * control1.x + 3 * mt * t ** 2 * control2.x + t ** 3 * end.x,
                    mt ** 3 * start.y + 3 * mt ** 2 * t * control1.y + 3 * mt * t ** 2 * control2.y + t ** 3 * end.y,
                )

    if len(points) > 2 and math.dist(points[0], points[-1]) <= 0.001:
        closed = True
    if closed and len(points) > 2 and math.dist(points[0], points[-1]) > 0.001:
        points.append(points[0])
    return points, closed


if __name__ == "__main__":
    source = Path(sys.argv[1])
    fmt = sys.argv[2]
    if fmt == "DXF":
        result = dxf(source)
    elif fmt == "VECTOR_PDF":
        result = vector_pdf(source)
    else:
        raise RuntimeError(f"Unsupported extractor format: {fmt}")
    print(json.dumps(result))
