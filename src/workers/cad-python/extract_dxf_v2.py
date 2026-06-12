#!/usr/bin/env python3
"""DXF extractor using ezdxf + shapely.

Usage: python3 extract_dxf_v2.py <dxf_path> <mode> [options_json_path]

Modes:
  inspect  - Return layer info, bounds, units, discipline
  extract  - Return plot candidates with geometry + labels
"""
import json
import math
import re
import sys
from collections import defaultdict
from pathlib import Path

# ---------------------------------------------------------------------------
# Label normalisation
# ---------------------------------------------------------------------------

REJECTED_LABELS = {
    "PLOT", "PLOTS", "PLOTTING", "PLOT NO", "PLOT NO.", "PLOT NUMBER",
    "LAYOUT", "LAYOUT PLAN", "SITE PLAN", "MASTER PLAN", "KEY PLAN",
    "INDEX", "LEGEND", "SCHEDULE", "TABLE", "NOTES", "NOTE",
    "TOTAL", "AREA", "ROAD", "ROAD WIDENING", "STREET",
}

ENTITY_PATTERNS = [
    (re.compile(r"^EWS\s*[-–—.]?\s*(\d+)$", re.I), "PLOT", lambda m: "EWS-" + m.group(1)),
    (re.compile(r"^PARK\s*\(?([A-Z]?\s*-?\s*\d+)\)?$", re.I), "PARK",
     lambda m: "PARK-" + re.sub(r"\s+", "", m.group(1))),
    (re.compile(r"^GREEN\s*(?:STRIP|STRIPE|BELT)\s*[-–—.]?\s*(\d+)$", re.I), "PARK",
     lambda m: "GREEN-" + m.group(1)),
    (re.compile(r"^PARKING\s*[-–—.]?\s*(\d+)$", re.I), "PARK",
     lambda m: "PARKING-" + m.group(1)),
    (re.compile(r"^(?:COMMERCIAL|SHOP|SCO)\s*[-–—.]?\s*(\d+)$", re.I), "PLOT",
     lambda m: "COM-" + m.group(1)),
    (re.compile(r"^(?:OPEN\s*SPACE|OS)\s*[-–—.]?\s*(\d+)$", re.I), "PARK",
     lambda m: "OS-" + m.group(1)),
]

PLOT_LABEL_RE = re.compile(
    r"^(?:PLOT\s*(?:NO\.?)?\s*)?([A-Z]{0,4}[-/]?\d{1,5}[A-Z]?)$",
    re.I,
)

DIMENSION_RE = re.compile(
    r"^\d+['\"]|^\d+\.\d+\s*['\"]|^\d+'-\d|^\d+\.\d+\s*[mM]$|^%%[cCdDpP]|\\A|\\P|\\f",
)

VALID_PREFIXES = {"C", "COM", "EWS", "R", "RES", "A", "B", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "S", "T"}


def normalize_entity_label(value, expected_total=None):
    """Returns (label, entity_type) or (None, None)."""
    raw = str(value or "").strip()
    text = re.sub(r"[\s\n\r]+", " ", raw).upper()
    text = text.replace("–", "-").replace("—", "-").rstrip(".")

    if text in REJECTED_LABELS or raw.startswith("\\"):
        return None, None
    if DIMENSION_RE.search(raw):
        return None, None

    for pattern, etype, formatter in ENTITY_PATTERNS:
        m = pattern.match(text)
        if m:
            return formatter(m), etype

    match = PLOT_LABEL_RE.match(text)
    if not match:
        return None, None
    label = re.sub(r"\s+", "", match.group(1)).upper()
    numeric = re.search(r"(\d+)", label)
    if not numeric or int(numeric.group(1)) <= 0:
        return None, None
    if label.isdigit() and expected_total and int(label) > int(expected_total) * 1.1:
        return None, None
    prefix = label[:numeric.start()].rstrip("-/")
    if prefix and "-" not in label and "/" not in label and prefix not in VALID_PREFIXES:
        return None, None
    return label, "PLOT"


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

SKIP_LAYERS_RE = re.compile(
    r"defpoints|dimension|dim[-_ ]|hatch|title|border|frame|viewport|"
    r"annotation|xref|ref[-_ ]|grid|center[-_ ]?line|hidden|phantom|"
    r"furniture|fixture|plumbing|hvac|mep|sanit",
    re.I,
)

ARC_SEGMENTS = 16


def arc_points(center_x, center_y, radius, start_deg, end_deg, segments=ARC_SEGMENTS):
    """Discretize an arc into line segments."""
    pts = []
    if end_deg < start_deg:
        end_deg += 360.0
    step = (end_deg - start_deg) / segments
    for i in range(segments + 1):
        angle = math.radians(start_deg + step * i)
        pts.append((center_x + radius * math.cos(angle), center_y + radius * math.sin(angle)))
    return pts


def ellipse_points(entity, segments=ARC_SEGMENTS * 2):
    """Discretize an ELLIPSE entity into line segments."""
    try:
        center = entity.dxf.center
        major = entity.dxf.major_axis
        ratio = entity.dxf.ratio
        start = entity.dxf.start_param
        end = entity.dxf.end_param
        if abs(end - start) < 1e-6:
            end = start + math.tau
        a = math.sqrt(major.x ** 2 + major.y ** 2)
        b = a * ratio
        rotation = math.atan2(major.y, major.x)
        pts = []
        step = (end - start) / segments
        for i in range(segments + 1):
            t = start + step * i
            x = a * math.cos(t)
            y = b * math.sin(t)
            rx = center.x + x * math.cos(rotation) - y * math.sin(rotation)
            ry = center.y + x * math.sin(rotation) + y * math.cos(rotation)
            pts.append((rx, ry))
        return pts
    except Exception:
        return []


def adaptive_tolerance(drawing_bounds):
    """Choose snap tolerance based on drawing extent."""
    if not drawing_bounds or len(drawing_bounds) < 4:
        return 0.5
    dx = abs(drawing_bounds[2] - drawing_bounds[0])
    dy = abs(drawing_bounds[3] - drawing_bounds[1])
    extent = max(dx, dy)
    if extent <= 0:
        return 0.5
    return max(0.01, min(2.0, extent * 0.00002))


# ---------------------------------------------------------------------------
# Inspect mode
# ---------------------------------------------------------------------------

def inspect(source):
    import ezdxf
    from ezdxf import bbox

    doc = ezdxf.readfile(source)
    msp = doc.modelspace()
    layer_names = [layer.dxf.name for layer in doc.layers]
    try:
        extents = bbox.extents(msp, fast=True)
        drawing_bounds = [
            float(extents.extmin.x), float(extents.extmin.y),
            float(extents.extmax.x), float(extents.extmax.y),
        ]
    except Exception:
        drawing_bounds = [0, 0, 1, 1]
    units = int(doc.header.get("$INSUNITS", 0) or 0)
    units_per_foot = {1: 12.0, 2: 1.0, 4: 304.8, 5: 30.48, 6: 0.3048}.get(units)

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
                "drawingUnitsPerFoot": units_per_foot,
                "insunits": units,
            }
            if units_per_foot
            else None,
            "calibrationConfirmed": bool(units_per_foot),
            "inspection": {
                "layers": layer_names,
                "entityCount": len(list(msp)),
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


def infer_discipline(layer_names):
    text = " ".join(layer_names).lower()
    electrical = any(t in text for t in ("cable", "mpb", "rmu", "transformer", "kva", "elect"))
    site = any(t in text for t in ("plot", "road", "park", "layout", "boundary"))
    if electrical and site:
        return "MIXED"
    if electrical:
        return "ELECTRICAL"
    if site:
        return "SITE_LAYOUT"
    return "AUTO"


# ---------------------------------------------------------------------------
# Extract mode
# ---------------------------------------------------------------------------

MAX_LINES_FOR_GLOBAL_POLYGONIZE = 8000


def extract(source, options):
    import ezdxf
    from shapely.geometry import LineString, Point, Polygon
    from shapely.ops import polygonize, snap, unary_union
    from shapely.validation import make_valid

    doc = ezdxf.readfile(source)
    msp = doc.modelspace()
    analysis = options.get("analysis") or {}
    expected_total = (analysis.get("expectedCounts") or {}).get("total")
    scale = analysis.get("scaleCalibration") or {}
    units_per_foot = float(scale.get("drawingUnitsPerFoot", 0) or 0)

    texts = []
    linework = defaultdict(list)
    direct_polygons = []
    drawing_bounds = (analysis.get("inspection") or {}).get("drawingBounds")

    def consume(entity, source_handle=None, depth=0):
        if depth > 5:
            return
        layer = str(getattr(entity.dxf, "layer", "0"))
        kind = entity.dxftype()
        handle = source_handle or getattr(entity.dxf, "handle", None)

        if kind in ("TEXT", "MTEXT"):
            text = str(entity.dxf.text) if kind == "TEXT" else str(entity.plain_text())
            try:
                loc = entity.dxf.insert
                texts.append({
                    "text": text, "point": [float(loc.x), float(loc.y)],
                    "layer": layer, "handle": handle,
                })
            except Exception:
                pass

        elif kind == "LINE":
            s, e = entity.dxf.start, entity.dxf.end
            linework[layer].append(LineString([(s.x, s.y), (e.x, e.y)]))

        elif kind == "LWPOLYLINE":
            pts = [(float(p[0]), float(p[1])) for p in entity.get_points()]
            if len(pts) >= 2:
                if entity.closed and pts[0] != pts[-1]:
                    pts.append(pts[0])
                linework[layer].append(LineString(pts))
                if entity.closed and len(pts) >= 4:
                    try:
                        poly = Polygon(pts)
                        if poly.is_valid and poly.area > 0:
                            direct_polygons.append((layer, poly, handle))
                    except Exception:
                        pass

        elif kind == "POLYLINE":
            try:
                pts = [(float(v.dxf.location.x), float(v.dxf.location.y)) for v in entity.vertices]
            except Exception:
                pts = []
            if len(pts) >= 2:
                if entity.is_closed and pts[0] != pts[-1]:
                    pts.append(pts[0])
                linework[layer].append(LineString(pts))
                if entity.is_closed and len(pts) >= 4:
                    try:
                        poly = Polygon(pts)
                        if poly.is_valid and poly.area > 0:
                            direct_polygons.append((layer, poly, handle))
                    except Exception:
                        pass

        elif kind == "ARC":
            try:
                c = entity.dxf.center
                pts = arc_points(c.x, c.y, entity.dxf.radius,
                                 entity.dxf.start_angle, entity.dxf.end_angle)
                if len(pts) >= 2:
                    linework[layer].append(LineString(pts))
            except Exception:
                pass

        elif kind == "CIRCLE":
            try:
                c = entity.dxf.center
                pts = arc_points(c.x, c.y, entity.dxf.radius, 0, 360)
                pts.append(pts[0])
                linework[layer].append(LineString(pts))
                if len(pts) >= 4:
                    try:
                        poly = Polygon(pts)
                        if poly.is_valid:
                            direct_polygons.append((layer, poly, handle))
                    except Exception:
                        pass
            except Exception:
                pass

        elif kind == "ELLIPSE":
            pts = ellipse_points(entity)
            if len(pts) >= 4:
                linework[layer].append(LineString(pts))
                if abs(entity.dxf.end_param - entity.dxf.start_param - math.tau) < 0.1:
                    pts_closed = list(pts) + [pts[0]]
                    try:
                        poly = Polygon(pts_closed)
                        if poly.is_valid:
                            direct_polygons.append((layer, poly, handle))
                    except Exception:
                        pass

        elif kind == "SPLINE":
            try:
                pts = [(float(p.x), float(p.y)) for p in entity.control_points]
                if len(pts) >= 2:
                    linework[layer].append(LineString(pts))
                    if entity.closed and len(pts) >= 4:
                        pts_c = list(pts) + [pts[0]]
                        try:
                            poly = Polygon(pts_c)
                            if poly.is_valid and poly.area > 0:
                                direct_polygons.append((layer, poly, handle))
                        except Exception:
                            pass
            except Exception:
                pass

        elif kind == "HATCH":
            try:
                for path in entity.paths:
                    pts = []
                    if hasattr(path, "vertices"):
                        pts = [(float(v[0]), float(v[1])) for v in path.vertices]
                    elif hasattr(path, "edges"):
                        for edge in path.edges:
                            if hasattr(edge, "start") and hasattr(edge, "end"):
                                pts.append((float(edge.start.x), float(edge.start.y)))
                        if path.edges and hasattr(path.edges[-1], "end"):
                            pts.append((float(path.edges[-1].end.x), float(path.edges[-1].end.y)))
                    if len(pts) >= 3:
                        if pts[0] != pts[-1]:
                            pts.append(pts[0])
                        try:
                            poly = Polygon(pts)
                            if not poly.is_valid:
                                poly = make_valid(poly)
                            if not poly.is_empty and poly.area > 0:
                                direct_polygons.append((layer, poly, handle))
                        except Exception:
                            pass
            except Exception:
                pass

        elif kind == "INSERT":
            try:
                for attrib in entity.attribs:
                    tag = str(attrib.dxf.tag).upper()
                    text_val = str(attrib.dxf.text).strip()
                    try:
                        loc = attrib.dxf.insert
                        texts.append({
                            "text": text_val, "point": [float(loc.x), float(loc.y)],
                            "layer": layer, "handle": handle,
                            "attrib_tag": tag,
                        })
                    except Exception:
                        pass
            except Exception:
                pass
            try:
                for child in entity.virtual_entities():
                    consume(child, handle, depth + 1)
            except Exception:
                pass

    for entity in msp:
        consume(entity)

    # --- Determine snap tolerance adaptively ---
    if not drawing_bounds:
        all_pts_x, all_pts_y = [], []
        for lines in linework.values():
            for line in lines[:200]:
                coords = list(line.coords)
                for x, y in coords:
                    all_pts_x.append(x)
                    all_pts_y.append(y)
        if all_pts_x:
            drawing_bounds = [min(all_pts_x), min(all_pts_y), max(all_pts_x), max(all_pts_y)]

    tolerance = float(options.get("snapTolerance") or adaptive_tolerance(drawing_bounds))

    # --- Build polygon set ---
    # Collect lines, excluding layers that are clearly not plot boundaries
    boundary_lines = []
    boundary_layers = set()
    for layer, lines in linework.items():
        if SKIP_LAYERS_RE.search(layer):
            continue
        boundary_lines.extend(lines)
        boundary_layers.add(layer)

    polygons = list(direct_polygons)
    seen_bounds = set()
    for _, poly, _ in direct_polygons:
        if not poly.is_empty:
            seen_bounds.add(tuple(round(v, 1) for v in poly.bounds))

    # Cross-layer polygonization
    if boundary_lines and len(boundary_lines) <= MAX_LINES_FOR_GLOBAL_POLYGONIZE:
        try:
            merged = unary_union(boundary_lines)
            snapped = snap(merged, merged, tolerance)
            for poly in polygonize(snapped):
                if poly.is_empty or not poly.is_valid or poly.area <= 0:
                    continue
                key = tuple(round(v, 1) for v in poly.bounds)
                if key not in seen_bounds:
                    polygons.append(("_combined", poly, None))
                    seen_bounds.add(key)
        except Exception:
            pass
    elif boundary_lines:
        # Too many lines for global — polygonize per layer
        for layer in boundary_layers:
            lines = linework[layer]
            if not lines:
                continue
            try:
                merged = unary_union(lines)
                snapped = snap(merged, merged, tolerance)
                for poly in polygonize(snapped):
                    if poly.is_empty or not poly.is_valid or poly.area <= 0:
                        continue
                    key = tuple(round(v, 1) for v in poly.bounds)
                    if key not in seen_bounds:
                        polygons.append((layer, poly, None))
                        seen_bounds.add(key)
            except Exception:
                continue

    # --- Build spatial index for text points ---
    text_points = [Point(t["point"]) for t in texts]

    # --- Filter out drawing border polygons ---
    if drawing_bounds and len(drawing_bounds) == 4:
        dx = abs(drawing_bounds[2] - drawing_bounds[0])
        dy = abs(drawing_bounds[3] - drawing_bounds[1])
        drawing_area = dx * dy
        if drawing_area > 0:
            polygons = [
                (layer, poly, handle) for layer, poly, handle in polygons
                if poly.area < drawing_area * 0.85
            ]

    # --- Match labels to polygons (smallest first → most specific match) ---
    polygons.sort(key=lambda item: item[1].area if not item[1].is_empty else float("inf"))
    candidates = []
    seen = set()
    used_labels = set()
    used_text_indices = set()

    for layer, poly, handle in polygons:
        if poly.is_empty or not poly.is_valid or poly.area <= 0:
            continue
        key = tuple(round(v, 1) for v in poly.bounds)
        if key in seen:
            continue
        seen.add(key)

        # Find text inside (or very near) this polygon
        buffered = poly.buffer(max(tolerance, 0.5))
        inside = []
        for i, t in enumerate(texts):
            if i in used_text_indices:
                continue
            if buffered.contains(text_points[i]):
                inside.append((i, t))

        labels = []
        for idx, t in inside:
            label, etype = normalize_entity_label(t["text"], expected_total)
            if label and label not in used_labels:
                labels.append((label, etype, t, idx))

        if not labels:
            continue

        # Prefer labels with more specific type, then longest label
        label, entity_type, matched, matched_idx = max(
            labels, key=lambda item: (len(item[0]), item[1] != "PLOT")
        )
        used_labels.add(label)
        used_text_indices.add(matched_idx)

        points = [[float(x), float(y)] for x, y in poly.exterior.coords]
        measurements = {"areaCadUnits": float(poly.area)}
        if units_per_foot > 0:
            measurements["areaSqft"] = float(poly.area) / (units_per_foot ** 2)

        candidates.append({
            "layer": layer,
            "label": label,
            "type": entity_type,
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

    # --- Post-processing: remove oversized non-plot entities ---
    plot_areas = [c["measurements"]["areaCadUnits"] for c in candidates if c["type"] == "PLOT"]
    if plot_areas:
        median_plot = sorted(plot_areas)[len(plot_areas) // 2]
        max_park_area = max(median_plot * 50, 500_000)
        candidates = [
            c for c in candidates
            if c["type"] == "PLOT" or c["measurements"]["areaCadUnits"] <= max_park_area
        ]

    # --- Build layer list ---
    all_layer_names = set(linework.keys())
    for _, _, _ in direct_polygons:
        pass  # layers already captured
    layers = [
        {
            "name": layer_name,
            "purpose": "PLOT" if any(e["layer"] == layer_name for e in candidates) else "UNKNOWN",
            "metadata": {"source": "dxf-layer"},
        }
        for layer_name in sorted(all_layer_names)
    ]
    return {"analysis": analysis, "layers": layers, "entities": candidates}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    source = Path(sys.argv[1])
    mode = sys.argv[2] if len(sys.argv) > 2 else "extract"
    options_path = sys.argv[3] if len(sys.argv) > 3 else None
    options = {}
    if options_path and Path(options_path).exists():
        options = json.loads(Path(options_path).read_text())

    if mode == "inspect":
        result = inspect(str(source))
    elif mode == "extract":
        result = extract(str(source), options)
    else:
        raise RuntimeError(f"Unsupported mode: {mode}")

    print(json.dumps(result))


if __name__ == "__main__":
    main()
