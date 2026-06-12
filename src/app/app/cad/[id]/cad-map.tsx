"use client";

import Feature from "ol/Feature";
import type { FeatureLike } from "ol/Feature";
import Map from "ol/Map";
import View from "ol/View";
import Collection from "ol/Collection";
import Modify from "ol/interaction/Modify";
import ImageLayer from "ol/layer/Image";
import VectorLayer from "ol/layer/Vector";
import Projection from "ol/proj/Projection";
import ImageStatic from "ol/source/ImageStatic";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style, Circle as CircleStyle } from "ol/style";
import { LineString, Point, Polygon } from "ol/geom";
import { defaults as defaultControls } from "ol/control/defaults";
import { useCallback, useEffect, useRef } from "react";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

export type CadMapEntity = {
  id: string;
  layerId: string | null;
  type: string;
  label: string | null;
  status: string;
  geometry: Json;
};

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

const COLORS: Record<string, { stroke: string; fill: string }> = {
  PLOT: { stroke: "#d4a72c", fill: "rgba(244,197,66,0.20)" },
  ROAD: { stroke: "#64748b", fill: "rgba(148,163,184,0.18)" },
  PARK: { stroke: "#15803d", fill: "rgba(34,197,94,0.18)" },
  UTILITY: { stroke: "#0284c7", fill: "rgba(14,165,233,0.14)" },
  ELECTRICAL_POINT: { stroke: "#dc2626", fill: "rgba(239,68,68,0.3)" },
  BOUNDARY: { stroke: "#0f172a", fill: "rgba(15,23,42,0.05)" },
  UNKNOWN: { stroke: "#f97316", fill: "rgba(249,115,22,0.12)" },
};

export function CadMap({
  cadFileId,
  entities,
  bounds,
  imageRect,
  showPreview,
  hiddenLayerIds,
  selectedId,
  onSelect,
  onCalibrationPoints,
  editable = false,
  onGeometryChange,
}: {
  cadFileId: string;
  entities: CadMapEntity[];
  bounds: Bounds;
  imageRect?: number[] | null;
  showPreview: boolean;
  hiddenLayerIds: Set<string>;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onCalibrationPoints?: (points: Array<[number, number]>) => void;
  editable?: boolean;
  onGeometryChange?: (entityId: string, geometry: Record<string, unknown>) => void;
}) {
  const target = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const modifyRef = useRef<Modify | null>(null);
  const selectedIdRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const onCalibrationPointsRef = useRef(onCalibrationPoints);
  const onGeometryChangeRef = useRef(onGeometryChange);
  const calibrationPointsRef = useRef<Array<[number, number]>>([]);
  const axisMaxYRef = useRef(0);

  selectedIdRef.current = selectedId;
  onSelectRef.current = onSelect;
  onCalibrationPointsRef.current = onCalibrationPoints;
  onGeometryChangeRef.current = onGeometryChange;

  useEffect(() => {
    if (!target.current) return;
    const sourceBounds = combinedBounds(bounds, showPreview ? imageRect : null);
    const axisMaxY = sourceBounds.maxY;
    axisMaxYRef.current = axisMaxY;
    const extent: [number, number, number, number] = [
      sourceBounds.minX,
      axisMaxY - sourceBounds.maxY,
      sourceBounds.maxX,
      axisMaxY - sourceBounds.minY,
    ];
    const projection = new Projection({ code: `Map-${cadFileId}`, units: "pixels", extent });
    const layers = [];
    if (showPreview && imageRect?.length === 4) {
      const rect = imageExtent(imageRect, axisMaxY);
      layers.push(new ImageLayer({
        source: new ImageStatic({
          url: `/api/v1/cad/${cadFileId}/preview`,
          projection,
          imageExtent: rect,
        }),
        opacity: 0.92,
      }));
    }

    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;
    const vector = new VectorLayer({
      source: vectorSource,
      style: (feature) => styleForFeature(feature, feature.get("id") === selectedIdRef.current),
      declutter: true,
    });
    layers.push(vector);

    const map = new Map({
      target: target.current,
      layers,
      controls: defaultControls({ attribution: false, rotate: false }),
      view: new View({ projection, center: [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2], zoom: 2, minZoom: 0, maxZoom: 20 }),
    });
    map.getView().fit(extent, { padding: [28, 28, 28, 28], duration: 0 });

    map.on("singleclick", (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (value) => value);
      if (feature && onSelectRef.current) {
        onSelectRef.current(String(feature.get("id")));
        return;
      }
      if (onCalibrationPointsRef.current) {
        const pts = calibrationPointsRef.current;
        pts.push([event.coordinate[0], axisMaxYRef.current - event.coordinate[1]]);
        if (pts.length > 2) pts.shift();
        onCalibrationPointsRef.current([...pts]);
      }
    });

    mapRef.current = map;
    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      vectorSourceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadFileId, bounds.minX, bounds.minY, bounds.maxX, bounds.maxY, showPreview, imageRect?.[0], imageRect?.[1], imageRect?.[2], imageRect?.[3]]);

  useEffect(() => {
    const source = vectorSourceRef.current;
    const map = mapRef.current;
    if (!source || !map) return;
    const axisMaxY = axisMaxYRef.current;

    source.clear();
    const features = entities
      .filter((entity) => !entity.layerId || !hiddenLayerIds.has(entity.layerId))
      .flatMap((entity) => {
        const feature = featureFromEntity(entity, axisMaxY);
        return feature ? [feature] : [];
      });
    source.addFeatures(features);

    if (features.length) {
      const candidateExtent: [number, number, number, number] = [
        bounds.minX,
        axisMaxY - bounds.maxY,
        bounds.maxX,
        axisMaxY - bounds.minY,
      ];
      map.getView().fit(candidateExtent, { padding: [28, 28, 28, 28], duration: 300 });
    }
  }, [entities, hiddenLayerIds, bounds.minX, bounds.minY, bounds.maxX, bounds.maxY]);

  useEffect(() => {
    const source = vectorSourceRef.current;
    if (source) source.changed();
  }, [selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const source = vectorSourceRef.current;
    if (!map || !source) return;

    if (modifyRef.current) {
      map.removeInteraction(modifyRef.current);
      modifyRef.current = null;
    }

    if (!editable || !selectedId) return;

    const feature = source.getFeatures().find((f) => f.get("id") === selectedId);
    if (!feature) return;

    const axisMaxY = axisMaxYRef.current;
    const modify = new Modify({ features: new Collection([feature]) });
    modify.on("modifyend", () => {
      const geometry = feature.getGeometry();
      if (!onGeometryChangeRef.current) return;
      if (geometry instanceof Polygon) {
        const points = geometry.getCoordinates()[0].map((p) => [p[0], axisMaxY - p[1]]);
        onGeometryChangeRef.current(String(feature.get("id")), { type: "polygon", points, closed: true });
      } else if (geometry instanceof LineString) {
        const points = geometry.getCoordinates().map((p) => [p[0], axisMaxY - p[1]]);
        onGeometryChangeRef.current(String(feature.get("id")), { type: "polyline", points, closed: false });
      } else if (geometry instanceof Point) {
        const p = geometry.getCoordinates();
        onGeometryChangeRef.current(String(feature.get("id")), { type: "point", point: [p[0], axisMaxY - p[1]] });
      }
    });
    map.addInteraction(modify);
    modifyRef.current = modify;

    return () => {
      if (map && modifyRef.current) {
        map.removeInteraction(modifyRef.current);
        modifyRef.current = null;
      }
    };
  }, [editable, selectedId]);

  return <div ref={target} className="h-full min-h-[560px] w-full bg-slate-100 xl:min-h-0" />;
}

function featureFromEntity(entity: CadMapEntity, axisMaxY: number) {
  if (!entity.geometry || typeof entity.geometry !== "object" || Array.isArray(entity.geometry)) return null;
  const geometry = entity.geometry as Record<string, unknown>;
  let shape;
  if (Array.isArray(geometry.points)) {
    const points = (geometry.points as unknown[])
      .filter((point): point is [number, number] => Array.isArray(point) && typeof point[0] === "number" && typeof point[1] === "number")
      .map((point) => [point[0], axisMaxY - point[1]]);
    if (points.length < 2) return null;
    shape = geometry.closed === true ? new Polygon([points]) : new LineString(points);
  } else if (Array.isArray(geometry.point) && typeof geometry.point[0] === "number" && typeof geometry.point[1] === "number") {
    shape = new Point([geometry.point[0], axisMaxY - geometry.point[1]]);
  } else {
    return null;
  }
  const feature = new Feature({ geometry: shape });
  feature.setProperties({ id: entity.id, type: entity.type, label: entity.label, status: entity.status });
  return feature;
}

function styleForFeature(feature: FeatureLike, selected: boolean) {
  const type = String(feature.get("type") ?? "UNKNOWN");
  const status = String(feature.get("status") ?? "SUGGESTED");
  const colors = COLORS[type] ?? COLORS.UNKNOWN;
  const stroke = status === "REJECTED" ? "#94a3b8" : colors.stroke;
  const width = selected ? 4 : type === "UTILITY" ? 2.5 : 2;
  return new Style({
    stroke: new Stroke({ color: stroke, width, lineDash: status === "SUGGESTED" ? [7, 5] : undefined }),
    fill: new Fill({ color: status === "REJECTED" ? "rgba(148,163,184,0.08)" : colors.fill }),
    image: new CircleStyle({
      radius: selected ? 7 : 5,
      fill: new Fill({ color: colors.fill }),
      stroke: new Stroke({ color: stroke, width }),
    }),
  });
}

function combinedBounds(bounds: Bounds, imageRect?: number[] | null): Bounds {
  if (!imageRect || imageRect.length !== 4) return bounds;
  return {
    minX: Math.min(bounds.minX, imageRect[0]),
    minY: Math.min(bounds.minY, imageRect[1]),
    maxX: Math.max(bounds.maxX, imageRect[2]),
    maxY: Math.max(bounds.maxY, imageRect[3]),
  };
}

function imageExtent(rect: number[], axisMaxY: number): [number, number, number, number] {
  return [rect[0], axisMaxY - rect[3], rect[2], axisMaxY - rect[1]];
}
