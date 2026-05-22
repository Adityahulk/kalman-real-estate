"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  Building2,
  CalendarClock,
  Camera,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Hammer,
  History,
  Landmark,
  Layers3,
  Map,
  MessageSquareText,
  PlayCircle,
  Plus,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRoundCheck,
  Users,
  Video,
  WalletCards
} from "lucide-react";
import { ASSETS, assetsByProject } from "@/data/assets";
import { AUDITS, auditsByPlot } from "@/data/audits";
import { CHECKLISTS, checklistFor } from "@/data/checklists";
import { plotsByProject } from "@/data/plots";
import { PROJECTS } from "@/data/projects";
import { PERSONAS } from "@/data/users";
import type { AssetType, Plot, Project, SiteAsset, VideoStatus } from "@/data/types";
import { dateShort, fullInr, inr, pct } from "@/lib/format";
import { cn } from "@/lib/cn";

type ViewMode = "ownership" | "development";

const VIDEO_TASKS = [
  {
    id: "v1",
    title: "Saldha Land Developers portfolio walkthrough",
    brief: "Vrinda Enclave entry, Ananta Enclaves roads, Ambey Homes sample plot and buyer walkthrough.",
    status: "Review" as VideoStatus,
    assignedTo: "Karan Sethi",
    editor: "Mehak Sharma",
    due: "2026-05-27",
    thumbnail:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=75",
    comments: [
      "Marketing: tighten first 12 seconds and add plot availability overlay.",
      "Editor: final color grade uploaded for approval."
    ]
  },
  {
    id: "v2",
    title: "ALP possession-ready campaign",
    brief: "Internal roads, sewerage completion, park works and plot availability clips for channel partners.",
    status: "Editing" as VideoStatus,
    assignedTo: "Karan Sethi",
    editor: "Mehak Sharma",
    due: "2026-05-30",
    thumbnail:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=75",
    comments: ["Head: include school-route map and garden closeups."]
  },
  {
    id: "v3",
    title: "Sushma Group regional launch teaser",
    brief: "Drone plates, Zirakpur access route, masterplan animation and booking CTA.",
    status: "Shooting" as VideoStatus,
    assignedTo: "Karan Sethi",
    due: "2026-06-03",
    thumbnail:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=75",
    comments: ["Videographer: raw drone footage 60% complete."]
  }
];

const COST_INSIGHTS = [
  {
    id: "c1",
    severity: "savings",
    title: "Bulk procurement window",
    body: "Tiles for 18 plots share the same finish package. Consolidating next purchase order can reduce landed cost by 7.8%.",
    impact: "₹1.84 Cr protected"
  },
  {
    id: "c2",
    severity: "warning",
    title: "Concrete overrun anomaly",
    body: "Block B raft quantities are trending 11% above BOQ against CAD-derived area. Requires site measurement validation.",
    impact: "₹69 L risk"
  },
  {
    id: "c3",
    severity: "info",
    title: "Idle crew detection",
    body: "Electrical rough-in team is waiting on three plumbing pressure tests. Resequencing avoids two idle crew days.",
    impact: "₹9.6 L avoidable cost"
  }
];

const CLIENT_QUOTES = [
  {
    builder: "Saldha Land Developers",
    projects: "Vrinda Enclave · Ananta Enclaves · Ambey Homes",
    quote: "One visual command centre for allotment, registry status, site progress and buyer-ready reporting."
  },
  {
    builder: "ALP - Agarwal Land Developers",
    projects: "Premium plotted township and row-house infrastructure",
    quote: "Engineering, ownership and marketing teams can work from the same live project record."
  },
  {
    builder: "Sushma Group",
    projects: "Zirakpur - Mohali regional portfolio",
    quote: "Cost variance, contractor progress and launch marketing can be reviewed without spreadsheet chasing."
  }
];

const IMPLEMENTATION_PHASES = [
  {
    title: "Foundation",
    time: "Weeks 1-3",
    items: ["Roles and permissions", "Project/CAD upload model", "Plot ledger", "Document vault"]
  },
  {
    title: "Spatial Engine",
    time: "Weeks 4-7",
    items: ["CAD to interactive map", "Plot and asset layers", "Progress markers", "Mobile site updates"]
  },
  {
    title: "Workflow Suite",
    time: "Weeks 8-11",
    items: ["Allotment and transfer letters", "Registry indicators", "Contractor tasks", "Marketing approvals"]
  },
  {
    title: "AI Cost Control",
    time: "Weeks 12-16",
    items: ["BOQ variance detection", "Wastage alerts", "Revenue leakage checks", "Executive dashboards"]
  }
];

const MODULES = [
  {
    title: "Ownership OS",
    href: "#demo",
    text: "Allot plots, upload letters, manage resale transfers, registry status and full legal audit history.",
    icon: Landmark
  },
  {
    title: "Site Development",
    href: "#demo",
    text: "CAD-style view of roads, boundaries, utilities, plantation, clubhouse and contractor progress.",
    icon: Route
  },
  {
    title: "Plot Development",
    href: "#plot",
    text: "Owner-visible villa or plot checklists for structure, plumbing, electricals, finishing and landscaping.",
    icon: Hammer
  },
  {
    title: "Marketing Studio",
    href: "#marketing",
    text: "Assign shoots, upload raw footage, review edits, comment and approve final campaign videos.",
    icon: Video
  },
  {
    title: "Real Estate CRM",
    href: "#ai",
    text: "Launch into the existing CRM for leads, brokers, bookings, collections and customer conversations.",
    icon: Users
  },
  {
    title: "AI Cost Intelligence",
    href: "#ai",
    text: "Detect wastage, BOQ overruns, procurement savings and cashflow risks before they become expensive.",
    icon: Bot
  }
];

function statusColor(status: Plot["status"]) {
  return {
    available: "fill-emerald-100 stroke-emerald-500 text-emerald-950",
    allotted: "fill-amber-100 stroke-amber-500 text-amber-950",
    sold: "fill-sky-100 stroke-sky-500 text-sky-950",
    company: "fill-slate-100 stroke-slate-500 text-slate-950",
    registry: "fill-violet-100 stroke-violet-500 text-violet-950"
  }[status];
}

function statusBadge(status: string) {
  const clean = status.replaceAll("_", " ");
  const tone =
    status === "complete" || status === "Approved" || status === "sold"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "delayed" || status === "warning"
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : status === "in_progress" || status === "Editing" || status === "Review"
          ? "bg-amber-50 text-amber-800 ring-amber-200"
          : "bg-slate-100 text-slate-700 ring-slate-200";
  return <span className={cn("chip capitalize ring-1", tone)}>{clean}</span>;
}

function assetColor(type: AssetType) {
  return {
    road: "#475569",
    boundary: "#0f172a",
    electrical: "#f59e0b",
    water: "#0ea5e9",
    plantation: "#16a34a",
    clubhouse: "#8b5cf6",
    pool: "#06b6d4",
    park: "#22c55e",
    gate: "#c9a227",
    mosque: "#14b8a6"
  }[type];
}

function assetIcon(type: AssetType) {
  if (type === "road") return Route;
  if (type === "electrical") return Sparkles;
  if (type === "water" || type === "pool") return Layers3;
  if (type === "clubhouse") return Building2;
  if (type === "gate") return ShieldCheck;
  return Map;
}

function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-slate-100", className)}>
      <div className="h-full rounded-full bg-gold-shine" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy-800">
        <Icon size={18} />
      </div>
      <div className="text-2xl font-semibold text-navy-950">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function SiteMap({
  project,
  plots,
  assets,
  selectedPlot,
  selectedAsset,
  viewMode,
  onPlot,
  onAsset
}: {
  project: Project;
  plots: Plot[];
  assets: SiteAsset[];
  selectedPlot?: Plot;
  selectedAsset?: SiteAsset;
  viewMode: ViewMode;
  onPlot: (plot: Plot) => void;
  onAsset: (asset: SiteAsset) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-[#f8faf7] shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-navy-950">{project.name} CAD Visualization</p>
          <p className="text-xs text-slate-500">Layered plot, ownership, site asset and progress map</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="chip bg-emerald-50 text-emerald-700">Available</span>
          <span className="chip bg-amber-50 text-amber-700">Allotted</span>
          <span className="chip bg-sky-50 text-sky-700">Sold</span>
          <span className="chip bg-slate-100 text-slate-700">Company</span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${project.viewBox.w} ${project.viewBox.h}`}
        className="aspect-[4/3] w-full touch-manipulation bg-[linear-gradient(90deg,rgba(148,163,184,.16)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,.16)_1px,transparent_1px)] bg-[length:48px_48px]"
        role="img"
        aria-label={`${project.name} map`}
      >
        {assets.map((asset) => {
          const color = assetColor(asset.type);
          const active = selectedAsset?.id === asset.id;
          if (asset.geometry.kind === "line") {
            const d = asset.geometry.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
            return (
              <path
                key={asset.id}
                d={d}
                stroke={color}
                strokeWidth={asset.geometry.thickness}
                strokeLinecap="round"
                opacity={active || viewMode === "development" ? 0.9 : 0.28}
                className="cursor-pointer transition-opacity"
                onClick={() => onAsset(asset)}
              />
            );
          }
          if (asset.geometry.kind === "polygon") {
            return (
              <polygon
                key={asset.id}
                points={asset.geometry.points.map((p) => p.join(",")).join(" ")}
                fill="none"
                stroke={color}
                strokeWidth={active ? 9 : 5}
                opacity={active || viewMode === "development" ? 0.75 : 0.2}
                className="cursor-pointer"
                onClick={() => onAsset(asset)}
              />
            );
          }
          if (asset.geometry.kind === "dot") {
            return (
              <circle
                key={asset.id}
                cx={asset.geometry.x}
                cy={asset.geometry.y}
                r={active ? asset.geometry.r + 6 : asset.geometry.r}
                fill={color}
                opacity={active || viewMode === "development" ? 0.9 : 0.25}
                className="cursor-pointer"
                onClick={() => onAsset(asset)}
              />
            );
          }
          return (
            <rect
              key={asset.id}
              x={asset.geometry.x}
              y={asset.geometry.y}
              width={asset.geometry.w}
              height={asset.geometry.h}
              rx={8}
              fill={color}
              opacity={active || viewMode === "development" ? 0.72 : 0.16}
              stroke={active ? "#0B1B3B" : color}
              strokeWidth={active ? 8 : 2}
              className="cursor-pointer"
              onClick={() => onAsset(asset)}
            />
          );
        })}

        {plots.map((plot) => {
          const active = selectedPlot?.id === plot.id;
          return (
            <g key={plot.id} className="cursor-pointer" onClick={() => onPlot(plot)}>
              <rect
                x={plot.shape.x}
                y={plot.shape.y}
                width={plot.shape.w}
                height={plot.shape.h}
                rx={10}
                className={cn(statusColor(plot.status), "transition-all")}
                strokeWidth={active ? 8 : 3}
                opacity={viewMode === "ownership" || active ? 0.95 : 0.78}
              />
              {viewMode === "development" ? (
                <rect
                  x={plot.shape.x}
                  y={plot.shape.y + plot.shape.h - 12}
                  width={(plot.shape.w * plot.construction) / 100}
                  height={12}
                  rx={4}
                  fill="#C9A227"
                />
              ) : null}
              <text
                x={plot.shape.x + plot.shape.w / 2}
                y={plot.shape.y + 35}
                textAnchor="middle"
                className="select-none fill-navy-950 text-[24px] font-bold"
              >
                {plot.code}
              </text>
              <text
                x={plot.shape.x + plot.shape.w / 2}
                y={plot.shape.y + 67}
                textAnchor="middle"
                className="select-none fill-slate-600 text-[18px] font-semibold"
              >
                {viewMode === "development" ? `${plot.construction}%` : plot.status}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PlotPanel({ plot }: { plot: Plot }) {
  const audits = auditsByPlot(plot.id);
  const checklist = checklistFor(plot.id);
  const groups = Object.entries(
    checklist.reduce<Record<string, { total: number; done: number; progress: number }>>((acc, item) => {
      acc[item.group] ??= { total: 0, done: 0, progress: 0 };
      acc[item.group].total += 1;
      acc[item.group].done += item.done ? 1 : 0;
      acc[item.group].progress += item.progress;
      return acc;
    }, {})
  );

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected plot</p>
          <h3 className="mt-1 text-2xl font-semibold text-navy-950">{plot.code}</h3>
        </div>
        {statusBadge(plot.status)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Area</p>
          <p className="font-semibold text-navy-950">{plot.area.toLocaleString()} sqft</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Value</p>
          <p className="font-semibold text-navy-950">{inr(plot.price)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Facing</p>
          <p className="font-semibold text-navy-950">{plot.facing}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Registry</p>
          <p className="font-semibold text-navy-950">{plot.registryFiled ? "Filed" : "Pending"}</p>
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-navy-950 p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-200">Current owner</p>
        <p className="mt-1 text-lg font-semibold">{plot.owner?.name ?? "Available for booking"}</p>
        <p className="mt-1 text-sm text-slate-300">{plot.owner?.phone ?? "Company inventory"}</p>
        {plot.owner?.shares ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {plot.owner.shares.map((share) => (
              <span key={share.name} className="chip bg-white/10 text-white">
                {share.name} {share.pct}%
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="btn-outline">
          <Download size={16} /> Allotment
        </button>
        <button className="btn-outline">
          <FileText size={16} /> Transfer
        </button>
        <button className="btn-outline">
          <Landmark size={16} /> Registry
        </button>
        <button className="btn-gold">
          <Plus size={16} /> Add update
        </button>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-semibold text-navy-950">Plot development</h4>
          <span className="text-sm font-semibold text-gold-700">{plot.construction}%</span>
        </div>
        <Progress value={plot.construction} />
        <div className="mt-3 space-y-2">
          {groups.slice(0, 6).map(([group, item]) => (
            <div key={group} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="font-medium text-slate-700">{group}</span>
              <span className="text-slate-500">
                {item.done}/{item.total} done
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h4 className="mb-3 flex items-center gap-2 font-semibold text-navy-950">
          <History size={17} /> Audit history
        </h4>
        <div className="space-y-3">
          {audits.length ? (
            audits.slice(0, 4).map((event) => (
              <div key={event.id} className="border-l-2 border-gold-400 pl-3">
                <p className="text-sm font-medium text-navy-950">{event.text}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {dateShort(event.at)} by {event.by} {event.amount ? `- ${fullInr(event.amount)}` : ""}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No customer movement yet. Company owns this inventory.</p>
          )}
        </div>
      </div>
    </aside>
  );
}

function AssetPanel({ asset }: { asset: SiteAsset }) {
  const Icon = assetIcon(asset.type);
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-50 text-navy-800">
            <Icon size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Site asset</p>
            <h3 className="mt-1 text-xl font-semibold text-navy-950">{asset.name}</h3>
          </div>
        </div>
        {statusBadge(asset.status)}
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Completion</span>
          <span className="font-semibold text-navy-950">{asset.progress}%</span>
        </div>
        <Progress value={asset.progress} />
      </div>
      <div className="mt-5 grid gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Contractor</p>
          <p className="font-semibold text-navy-950">{asset.contractor.company}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Manager</p>
          <p className="font-semibold text-navy-950">
            {asset.contractor.manager} · {asset.contractor.phone}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Deadline</p>
          <p className="font-semibold text-navy-950">{dateShort(asset.deadline)}</p>
        </div>
      </div>
      <div className="mt-5">
        <h4 className="mb-3 font-semibold text-navy-950">Latest updates</h4>
        {asset.updates.length ? (
          asset.updates.map((update) => (
            <div key={update.at} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm text-slate-700">{update.text}</p>
              <p className="mt-1 text-xs text-slate-500">
                {dateShort(update.at)} by {update.by}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No field note added yet.</p>
        )}
      </div>
    </aside>
  );
}

export default function Home() {
  const [projectId, setProjectId] = useState(PROJECTS[0].id);
  const [viewMode, setViewMode] = useState<ViewMode>("ownership");
  const [personaId, setPersonaId] = useState(PERSONAS[0].id);
  const project = PROJECTS.find((item) => item.id === projectId) ?? PROJECTS[0];
  const plots = useMemo(() => plotsByProject(project.id), [project.id]);
  const assets = useMemo(() => assetsByProject(project.id), [project.id]);
  const [selectedPlotId, setSelectedPlotId] = useState<string>("mh-A-12");
  const [selectedAssetId, setSelectedAssetId] = useState<string>("mh-clubhouse");
  const selectedPlot = plots.find((plot) => plot.id === selectedPlotId) ?? plots[0];
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? assets[0];
  const persona = PERSONAS.find((item) => item.id === personaId) ?? PERSONAS[0];

  const portfolio = useMemo(() => {
    const totalBudget = PROJECTS.reduce((sum, item) => sum + item.budget, 0);
    const totalSpent = PROJECTS.reduce((sum, item) => sum + item.spent, 0);
    const totalPlots = PROJECTS.reduce((sum, item) => sum + item.totalPlots, 0);
    const sold = PROJECTS.reduce((sum, item) => sum + item.sold, 0);
    const activeAssets = ASSETS.filter((asset) => asset.status === "in_progress" || asset.status === "delayed").length;
    return { totalBudget, totalSpent, totalPlots, sold, activeAssets };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2200&q=85"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/88 to-navy-900/35" />
        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-shine text-navy-950">
              <Building2 size={22} />
            </div>
            <div>
              <p className="font-semibold">Kalman Estate OS</p>
              <p className="text-xs text-slate-300">Builder command center</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            {MODULES.slice(0, 4).map((module) => (
              <a key={module.title} href={module.href} className="rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                {module.title}
              </a>
            ))}
          </div>
          <a href="#demo" className="btn-gold">
            <PlayCircle size={17} /> Live demo
          </a>
        </nav>
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-10 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
          <div>
            <h1 className="max-w-4xl font-display text-5xl font-semibold leading-tight md:text-7xl">
              Real estate builder operating system
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
              One workspace to control plot ownership, CAD-based development, owner progress, marketing approvals, CRM access and AI cost protection across every project.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#demo" className="btn-gold">
                Open command center <ArrowRight size={17} />
              </a>
              <a href="#roadmap" className="btn border border-white/20 bg-white/10 text-white hover:bg-white/15">
                Implementation plan
              </a>
            </div>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Portfolio budget" value={inr(portfolio.totalBudget)} icon={WalletCards} />
              <Metric label="Plots managed" value={`${portfolio.totalPlots}`} icon={Map} />
              <Metric label="Sold/allotted" value={`${portfolio.sold}`} icon={UserRoundCheck} />
              <Metric label="Active site assets" value={`${portfolio.activeAssets}`} icon={Hammer} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-8 sm:grid-cols-2 lg:grid-cols-6">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <div key={module.title} className="rounded-lg border border-slate-200 bg-white p-4">
                <Icon className="mb-3 text-gold-600" size={22} />
                <h2 className="text-sm font-semibold text-navy-950">{module.title}</h2>
                <p className="mt-2 text-xs leading-5 text-slate-600">{module.text}</p>
              </div>
            );
          })}
        </div>
        <div className="mx-auto grid max-w-7xl gap-4 px-5 pb-8 md:grid-cols-3">
          {CLIENT_QUOTES.map((client) => (
            <article key={client.builder} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">Builder client</p>
              <h2 className="mt-2 text-lg font-semibold text-navy-950">{client.builder}</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">{client.projects}</p>
              <p className="mt-4 text-sm leading-6 text-slate-600">{client.quote}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">Live operating demo</p>
            <h2 className="mt-2 section-title">Project command center</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative">
              <span className="sr-only">Project</span>
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="input appearance-none pr-9">
                {PROJECTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 text-slate-400" size={16} />
            </label>
            <label className="relative">
              <span className="sr-only">Persona</span>
              <select value={personaId} onChange={(event) => setPersonaId(event.target.value)} className="input appearance-none pr-9">
                {PERSONAS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.role.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 text-slate-400" size={16} />
            </label>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
            <div className="relative h-52">
              <img src={project.cover} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <p className="text-sm text-gold-100">{project.city}</p>
                <h3 className="text-3xl font-semibold">{project.name}</h3>
                <p className="mt-2 max-w-2xl text-sm text-slate-200">{project.tagline}</p>
              </div>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-4">
              <Metric label="Project progress" value={pct(project.progress)} icon={BarChart3} />
              <Metric label="Budget spent" value={inr(project.spent)} icon={CircleDollarSign} />
              <Metric label="Available plots" value={`${project.available}`} icon={Map} />
              <Metric label="Handover" value={dateShort(project.handoverAt)} icon={CalendarClock} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center gap-3">
              <img src={persona.avatar} alt="" className="h-12 w-12 rounded-lg border border-slate-200" />
              <div>
                <h3 className="font-semibold text-navy-950">{persona.name}</h3>
                <p className="text-sm text-slate-500">{persona.title}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button className="btn-outline">
                <Upload size={16} /> Upload CAD
              </button>
              <button className="btn-outline">
                <FileCheck2 size={16} /> Issue letter
              </button>
              <button className="btn-outline">
                <Search size={16} /> Find plot
              </button>
              <button className="btn-primary">
                <ClipboardCheck size={16} /> Field report
              </button>
            </div>
            <div className="mt-5 rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-semibold text-navy-950">Role-aware access</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Super admins control ownership and cost; engineers update site and plot progress; owners see only their plots and documents; marketing teams manage content approvals.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setViewMode("ownership")}
            className={cn("btn", viewMode === "ownership" ? "bg-navy-900 text-white" : "bg-white text-navy-900 ring-1 ring-slate-200")}
          >
            <Landmark size={16} /> Ownership layer
          </button>
          <button
            onClick={() => setViewMode("development")}
            className={cn("btn", viewMode === "development" ? "bg-navy-900 text-white" : "bg-white text-navy-900 ring-1 ring-slate-200")}
          >
            <Hammer size={16} /> Development layer
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <SiteMap
            project={project}
            plots={plots}
            assets={assets}
            selectedPlot={selectedPlot}
            selectedAsset={selectedAsset}
            viewMode={viewMode}
            onPlot={(plot) => {
              setSelectedPlotId(plot.id);
              setViewMode("ownership");
            }}
            onAsset={(asset) => {
              setSelectedAssetId(asset.id);
              setViewMode("development");
            }}
          />
          {viewMode === "ownership" ? <PlotPanel plot={selectedPlot} /> : <AssetPanel asset={selectedAsset} />}
        </div>
      </section>

      <section id="plot" className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">Module 3</p>
            <h2 className="mt-2 section-title">Owner-visible plot development</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Every plot opens into a detailed construction tracker: structure, bathrooms, electricals, kitchen, plumbing, garden, inspections, images and engineer notes.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Metric label="Checklist items" value={`${Object.values(CHECKLISTS).flat().length}`} icon={ClipboardCheck} />
              <Metric label="Audit events" value={`${AUDITS.length}`} icon={History} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {checklistFor(selectedPlot.id)
              .slice(0, 8)
              .map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-gold-700">{item.group}</p>
                      <h3 className="mt-1 text-sm font-semibold text-navy-950">{item.title}</h3>
                    </div>
                    {item.done ? <CheckCircle2 className="text-emerald-600" size={18} /> : <AlertTriangle className="text-amber-500" size={18} />}
                  </div>
                  <div className="mt-4">
                    <Progress value={item.progress} />
                    <p className="mt-2 text-xs text-slate-500">Updated {dateShort(item.updatedAt)} by {item.by}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      <section id="marketing" className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">Module 4</p>
            <h2 className="mt-2 section-title">Marketing production board</h2>
          </div>
          <button className="btn-primary">
            <Camera size={16} /> Assign new shoot
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {VIDEO_TASKS.map((task) => (
            <article key={task.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
              <img src={task.thumbnail} alt="" className="h-44 w-full object-cover" />
              <div className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-navy-950">{task.title}</h3>
                  {statusBadge(task.status)}
                </div>
                <p className="text-sm leading-6 text-slate-600">{task.brief}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Videographer</p>
                    <p className="font-semibold text-navy-950">{task.assignedTo}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Editor</p>
                    <p className="font-semibold text-navy-950">{task.editor ?? "Pending"}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="btn-outline flex-1">
                    <Upload size={16} /> Upload
                  </button>
                  <button className="btn-outline flex-1">
                    <MessageSquareText size={16} /> Review
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="ai" className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">Modules 5 & 6</p>
            <h2 className="mt-2 section-title">CRM launch + AI cost intelligence</h2>
            <p className="mt-4 leading-7 text-slate-600">
              The CRM can open as a connected product, while the builder OS keeps cost, wastage and revenue protection directly tied to CAD quantities, BOQs, purchase orders and site progress.
            </p>
            <div className="mt-6 rounded-lg border border-navy-200 bg-navy-950 p-5 text-white">
              <div className="flex items-center gap-3">
                <Users className="text-gold-300" size={24} />
                <div>
                  <h3 className="font-semibold">Connected Real Estate CRM</h3>
                  <p className="text-sm text-slate-300">Leads, brokers, customer conversations, payment follow-ups and booking inventory.</p>
                </div>
              </div>
              <button className="btn-gold mt-5">
                Open CRM <ExternalLink size={16} />
              </button>
            </div>
          </div>
          <div className="grid gap-3">
            {COST_INSIGHTS.map((insight) => (
              <div key={insight.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      insight.severity === "savings" && "bg-emerald-50 text-emerald-700",
                      insight.severity === "warning" && "bg-rose-50 text-rose-700",
                      insight.severity === "info" && "bg-sky-50 text-sky-700"
                    )}
                  >
                    {insight.severity === "savings" ? <BadgeCheck size={20} /> : insight.severity === "warning" ? <AlertTriangle size={20} /> : <Bot size={20} />}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-navy-950">{insight.title}</h3>
                      <span className="chip bg-gold-50 text-gold-800">{insight.impact}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{insight.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="roadmap" className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-7 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">Delivery design</p>
          <h2 className="mt-2 section-title">Implementation plan for a production build</h2>
          <p className="mt-4 leading-7 text-slate-600">
            The demo shows the full state solution. Production should be delivered in slices so builders can start with ownership and site control, then add plot, marketing, CRM and AI finance layers.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {IMPLEMENTATION_PHASES.map((phase, index) => (
            <div key={phase.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-white">{index + 1}</div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">{phase.time}</p>
              <h3 className="mt-2 text-lg font-semibold text-navy-950">{phase.title}</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {phase.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={16} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
