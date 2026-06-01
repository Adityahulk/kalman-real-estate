#!/usr/bin/env python3
import json
import math
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
    entities = []
    for page_index, page in enumerate(doc):
        for drawing in page.get_drawings():
            rect = drawing.get("rect")
            if rect:
                entities.append({
                    "layer": f"page-{page_index + 1}",
                    "label": "PDF vector path",
                    "type": "UNKNOWN",
                    "confidence": 0.35,
                    "geometry": {"type": "rect", "points": [[rect.x0, rect.y0], [rect.x1, rect.y1]]},
                    "measurements": {},
                    "status": "SUGGESTED",
                })
        for block in page.get_text("blocks"):
            text = str(block[4]).strip()
            if text:
                entities.append({
                    "layer": f"page-{page_index + 1}",
                    "label": text[:80],
                    "type": classify(text),
                    "confidence": 0.55,
                    "geometry": {"type": "text", "point": [block[0], block[1]], "text": text},
                    "measurements": {},
                    "status": "SUGGESTED",
                })
    return {"layers": [f"page-{idx + 1}" for idx in range(len(doc))], "entities": entities}


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
