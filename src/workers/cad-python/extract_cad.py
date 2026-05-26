#!/usr/bin/env python3
import json
import math
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
    return "UNKNOWN"


def area(points):
    if len(points) < 3:
        return 0
    total = 0
    for idx, point in enumerate(points):
        nxt = points[(idx + 1) % len(points)]
        total += point[0] * nxt[1] - nxt[0] * point[1]
    return abs(total / 2)


def dxf(path):
    try:
        import ezdxf
    except Exception as exc:
        raise RuntimeError("Python package ezdxf is required for DXF extraction") from exc

    doc = ezdxf.readfile(path)
    entities = []
    layers = set()
    for entity in doc.modelspace():
        layer = entity.dxf.layer if hasattr(entity.dxf, "layer") else "0"
        layers.add(layer)
        label = layer
        geometry = {"type": entity.dxftype()}
        measurements = {}
        if entity.dxftype() in ["LWPOLYLINE", "POLYLINE"]:
            points = [(float(p[0]), float(p[1])) for p in entity.get_points()]
            closed = bool(entity.closed)
            geometry = {"type": "polyline", "points": points, "closed": closed}
            if closed:
                measurements["areaSqft"] = area(points)
        elif entity.dxftype() == "LINE":
            start = entity.dxf.start
            end = entity.dxf.end
            geometry = {"type": "line", "points": [[start.x, start.y], [end.x, end.y]]}
            measurements["length"] = math.dist([start.x, start.y], [end.x, end.y])
        elif entity.dxftype() in ["TEXT", "MTEXT"]:
            label = entity.dxf.text if entity.dxftype() == "TEXT" else entity.text
            point = entity.dxf.insert
            geometry = {"type": "text", "point": [point.x, point.y], "text": label}
        kind = classify(f"{layer} {label}")
        entities.append({
            "layer": layer,
            "label": label,
            "type": kind,
            "confidence": 0.78 if kind != "UNKNOWN" else 0.35,
            "geometry": geometry,
            "measurements": measurements,
            "status": "CONFIRMED" if kind != "UNKNOWN" else "SUGGESTED",
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
