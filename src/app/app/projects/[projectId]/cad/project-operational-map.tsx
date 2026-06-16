"use client";

import { CadEntityType } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, MapPinned, Pencil, X } from "lucide-react";
import { useMemo, useState } from "react";
import { CadMap } from "../../../cad/[id]/cad-map";

type PlotItem = {
  id: string;
  code: string;
  status: string;
  areaSqft: number | null;
  ownerName: string | null;
  geometry: unknown;
};

type AssetItem = {
  id: string;
  name: string;
  type: string;
  status: string;
  progressPct: number;
  geometry: unknown;
};

type MapItem = {
  id: string;
  source: "plot" | "asset";
  type: string;
  label: string;
  status: string;
  areaSqft: number | null;
  ownerName: string | null;
  progressPct: number;
  geometry: unknown;
};

const ENTITY_COLORS: Record<string, string> = {
  PLOT: "#d4a72c",
  ROAD: "#64748b",
  PARK: "#15803d",
  UTILITY: "#0284c7",
  ELECTRICAL_POINT: "#dc2626",
  BOUNDARY: "#0f172a",
  GATE: "#7c3aed",
  CLUBHOUSE: "#db2777",
  DRAINAGE: "#0891b2",
  PARKING: "#6366f1",
  GARDEN: "#16a34a",
  UNKNOWN: "#f97316",
};

function entityColor(type: string) {
  return ENTITY_COLORS[type] ?? ENTITY_COLORS.UNKNOWN;
}

function entityLabel(type: string) {
  return type.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function ProjectOperationalMap({
  projectId,
  plots,
  siteAssets = [],
}: {
  projectId: string;
  plots: PlotItem[];
  siteAssets?: AssetItem[];
}) {
  const router = useRouter();
  const items: MapItem[] = useMemo(() => {
    const plotItems: MapItem[] = plots
      .filter((p) => hasPoints(p.geometry))
      .map((p) => ({ id: p.id, source: "plot" as const, type: "PLOT", label: p.code, status: p.status, areaSqft: p.areaSqft, ownerName: p.ownerName, progressPct: 0, geometry: p.geometry }));
    const assetItems: MapItem[] = siteAssets
      .filter((a) => hasPoints(a.geometry))
      .map((a) => ({ id: a.id, source: "asset" as const, type: a.type, label: a.name, status: a.status, areaSqft: null, ownerName: null, progressPct: a.progressPct, geometry: a.geometry }));
    return [...plotItems, ...assetItems];
  }, [plots, siteAssets]);

  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const bounds = useMemo(() => geometryBounds(items.map((item) => item.geometry)), [items]);

  const presentTypes = useMemo(() => {
    const types = new Set(items.map((item) => item.type));
    return [...types].sort();
  }, [items]);

  if (!items.length) {
    return (
      <div className="flex min-h-72 items-center justify-center border-b border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        Publish reviewed boundaries to open the interactive project map.
      </div>
    );
  }

  return (
    <section className="border-b border-slate-200">
      <div className="grid min-h-[520px] lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-h-[420px] bg-slate-100">
          <CadMap
            cadFileId={`project-${projectId}`}
            entities={items.map((item) => ({
              id: item.id,
              layerId: null,
              type: item.type,
              label: item.label,
              status: "CONFIRMED",
              geometry: item.geometry as Record<string, unknown>,
            }))}
            bounds={bounds}
            showPreview={false}
            hiddenLayerIds={new Set()}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <aside className="border-l border-slate-200 bg-white">
          <EntityDetailPanel
            projectId={projectId}
            selected={selected}
            onSaved={() => router.refresh()}
          />
        </aside>
      </div>
      {presentTypes.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-white px-4 py-2.5">
          <span className="text-xs font-medium text-slate-500">Legend</span>
          {presentTypes.map((type) => (
            <span key={type} className="flex items-center gap-1.5 text-xs text-slate-700">
              <span className="inline-block h-3 w-3 rounded-sm border border-slate-200" style={{ backgroundColor: entityColor(type) + "33", borderColor: entityColor(type) }} />
              {entityLabel(type)}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function EntityDetailPanel({
  projectId,
  selected,
  onSaved,
}: {
  projectId: string;
  selected: MapItem | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftType, setDraftType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function startEdit() {
    if (!selected) return;
    setDraftLabel(selected.label);
    setDraftType(selected.type);
    setError("");
    setSuccess("");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError("");
    setSuccess("");
  }

  async function saveEdit() {
    if (!selected) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/map-entities/${selected.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: selected.source,
          label: draftLabel.trim(),
          type: draftType,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? "Update failed.");
        setSaving(false);
        return;
      }
      setSuccess("Saved successfully.");
      setEditing(false);
      setSaving(false);
      onSaved();
    } catch {
      setError("Network error.");
      setSaving(false);
    }
  }

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-center text-sm text-slate-500">Click a boundary on the map to view its details.</p>
      </div>
    );
  }

  const typeCrossing = editing && (
    (selected.source === "plot" && draftType !== "PLOT") ||
    (selected.source === "asset" && draftType === "PLOT")
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <MapPinned size={15} />
            Selected {entityLabel(selected.type).toLowerCase()}
          </div>
          {!editing && (
            <button type="button" className="btn-ghost h-7 w-7 px-0" onClick={startEdit} title="Edit">
              <Pencil size={14} />
            </button>
          )}
        </div>

        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entityColor(selected.type) }} />
          <span className="text-xs font-medium" style={{ color: entityColor(selected.type) }}>{entityLabel(selected.type)}</span>
        </div>

        {editing ? (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Label / name</span>
              <input
                className="input mt-1"
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Category</span>
              <select className="input mt-1" value={draftType} onChange={(e) => setDraftType(e.target.value)}>
                {Object.values(CadEntityType).map((t) => (
                  <option key={t} value={t}>{t.replaceAll("_", " ")}</option>
                ))}
              </select>
            </label>
            {typeCrossing && (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {draftType === "PLOT"
                  ? "Changing to PLOT will create a new plot record in ownership."
                  : "Changing from PLOT will archive this plot. Plots with ownership or documents cannot be converted."}
              </div>
            )}
            {error && <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
            {success && <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</div>}
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary h-8 flex-1 justify-center text-xs"
                onClick={saveEdit}
                disabled={saving || !draftLabel.trim()}
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                Save
              </button>
              <button
                type="button"
                className="btn-outline h-8 flex-1 justify-center text-xs"
                onClick={cancelEdit}
                disabled={saving}
              >
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <h3 className="text-2xl font-semibold">{selected.label}</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <Fact label="Status" value={selected.status.replaceAll("_", " ")} />
              {selected.source === "plot" && (
                <>
                  <Fact label="Owner" value={selected.ownerName ?? "Company inventory"} />
                  <Fact label="Area" value={selected.areaSqft ? `${selected.areaSqft.toLocaleString("en-IN")} sq ft` : "Not recorded"} />
                </>
              )}
              {selected.source === "asset" && (
                <Fact label="Progress" value={`${selected.progressPct}%`} />
              )}
            </dl>
            {error && <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
            {success && <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</div>}
          </div>
        )}
      </div>

      {!editing && selected.source === "plot" && (
        <div className="shrink-0 border-t border-slate-200 p-4">
          <Link className="btn-primary w-full justify-center" href={`/app/projects/${projectId}/plots/${selected.id}`}>
            Open plot workspace
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
      {!editing && selected.source === "asset" && (
        <div className="shrink-0 border-t border-slate-200 p-4">
          <Link className="btn-outline w-full justify-center" href={`/app/projects/${projectId}/development`}>
            Open development workspace
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>;
}

function hasPoints(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const geo = value as Record<string, unknown>;
  return Array.isArray(geo.points) || (Array.isArray(geo.point) && typeof geo.point[0] === "number");
}

function geometryBounds(values: unknown[]) {
  const points = values.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const geo = value as Record<string, unknown>;
    if (Array.isArray(geo.points)) {
      return geo.points.flatMap((point) => Array.isArray(point)
        && typeof point[0] === "number"
        && typeof point[1] === "number"
        ? [[point[0], point[1]] as [number, number]]
        : []);
    }
    if (Array.isArray(geo.point) && typeof geo.point[0] === "number" && typeof geo.point[1] === "number") {
      return [[geo.point[0], geo.point[1]] as [number, number]];
    }
    return [];
  });
  if (!points.length) return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  return {
    minX: Math.min(...points.map((point) => point[0])),
    minY: Math.min(...points.map((point) => point[1])),
    maxX: Math.max(...points.map((point) => point[0])),
    maxY: Math.max(...points.map((point) => point[1])),
  };
}
