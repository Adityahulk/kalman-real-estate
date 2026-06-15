"use client";

import Link from "next/link";
import { ArrowRight, MapPinned } from "lucide-react";
import { useMemo, useState } from "react";
import { CadMap } from "../../../cad/[id]/cad-map";

type PlotMapItem = {
  id: string;
  code: string;
  status: string;
  areaSqft: number | null;
  ownerName: string | null;
  geometry: unknown;
};

export function ProjectOperationalMap({
  projectId,
  plots,
}: {
  projectId: string;
  plots: PlotMapItem[];
}) {
  const drawable = useMemo(() => plots.filter((plot) => hasPoints(plot.geometry)), [plots]);
  const [selectedId, setSelectedId] = useState(drawable[0]?.id ?? "");
  const selected = plots.find((plot) => plot.id === selectedId) ?? null;
  const bounds = useMemo(() => geometryBounds(drawable.map((plot) => plot.geometry)), [drawable]);

  if (!drawable.length) {
    return (
      <div className="flex min-h-72 items-center justify-center border-b border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        Publish reviewed plot boundaries to open the interactive project map.
      </div>
    );
  }

  return (
    <section className="grid min-h-[520px] border-b border-slate-200 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-h-[420px] bg-slate-100">
        <CadMap
          cadFileId={`project-${projectId}`}
          entities={drawable.map((plot) => ({
            id: plot.id,
            layerId: null,
            type: "PLOT",
            label: plot.code,
            status: plot.status,
            geometry: plot.geometry as Record<string, unknown>,
          }))}
          bounds={bounds}
          showPreview={false}
          hiddenLayerIds={new Set()}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
      <aside className="border-l border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <MapPinned size={15} />
          Selected plot
        </div>
        {selected ? (
          <div className="mt-4">
            <h3 className="text-2xl font-semibold">{selected.code}</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <Fact label="Status" value={selected.status.replaceAll("_", " ")} />
              <Fact label="Owner" value={selected.ownerName ?? "Company inventory"} />
              <Fact label="Area" value={selected.areaSqft ? `${selected.areaSqft.toLocaleString("en-IN")} sq ft` : "Not recorded"} />
            </dl>
            <Link className="btn-primary mt-6 w-full justify-center" href={`/app/projects/${projectId}/plots/${selected.id}`}>
              Open plot workspace
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Click a plot on the map to open its ownership workspace.</p>
        )}
      </aside>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>;
}

function hasPoints(value: unknown) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value)
    && Array.isArray((value as Record<string, unknown>).points));
}

function geometryBounds(values: unknown[]) {
  const points = values.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const raw = (value as Record<string, unknown>).points;
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((point) => Array.isArray(point)
      && typeof point[0] === "number"
      && typeof point[1] === "number"
      ? [[point[0], point[1]] as [number, number]]
      : []);
  });
  if (!points.length) return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  return {
    minX: Math.min(...points.map((point) => point[0])),
    minY: Math.min(...points.map((point) => point[1])),
    maxX: Math.max(...points.map((point) => point[0])),
    maxY: Math.max(...points.map((point) => point[1])),
  };
}
