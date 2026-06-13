import {
  ArrowLeft,
  Boxes,
  ClipboardCheck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export function CadModeHeader({
  cadFileId,
  drawingName,
  version,
  status,
  projectId,
  activeMode,
  format,
  actions,
}: {
  cadFileId: string;
  drawingName: string;
  version: number;
  status: string;
  projectId: string | null;
  activeMode: "studio" | "review";
  format: string;
  actions?: React.ReactNode;
}) {
  const exitHref = projectId ? `/app/projects/${projectId}/cad` : "/app/cad";
  const browserCad = format === "DXF" || format === "DWG";
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 shadow-sm lg:px-5">
      <Link className="btn-ghost h-9 px-2" href={exitHref} title="Exit CAD workspace">
        <ArrowLeft size={17} />
        <span className="hidden sm:inline">Exit</span>
      </Link>
      <div className="min-w-0 flex-1 border-l border-slate-200 pl-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-sm font-semibold lg:text-base">{drawingName}</h1>
          <span className="hidden shrink-0 text-xs text-slate-500 sm:inline">v{version}</span>
          <span className="chip hidden shrink-0 bg-slate-100 text-slate-700 md:inline">{status.replaceAll("_", " ")}</span>
        </div>
      </div>
      <nav className="flex shrink-0 rounded-md border border-slate-200 bg-slate-50 p-1">
        {browserCad ? (
          <Link
            className={`flex h-8 items-center gap-2 rounded px-2.5 text-xs font-medium ${activeMode === "studio" ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-white"}`}
            href={`/app/cad/${cadFileId}/studio`}
          >
            <Boxes size={15} />
            <span className="hidden sm:inline">CAD Studio</span>
          </Link>
        ) : null}
        <Link
          className={`flex h-8 items-center gap-2 rounded px-2.5 text-xs font-medium ${activeMode === "review" ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-white"}`}
          href={`/app/cad/${cadFileId}/review`}
        >
          <ClipboardCheck size={15} />
          <span className="hidden sm:inline">Review & Publish</span>
        </Link>
      </nav>
      {actions}
      <Link className="btn-ghost hidden h-9 w-9 px-0 lg:flex" href={exitHref} title="Open project maps">
        <ExternalLink size={16} />
      </Link>
    </header>
  );
}
