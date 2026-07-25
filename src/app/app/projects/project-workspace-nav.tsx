import Link from "next/link";
import { Building2, FileStack, FileText, Map } from "lucide-react";

const items = [
  {
    key: "details",
    label: "Project details",
    description: "Core project information",
    icon: Building2,
    href: (projectId: string) => `/app/projects/${projectId}`,
  },
  {
    key: "maps",
    label: "Maps",
    description: "Project and service plans",
    icon: Map,
    href: (projectId: string) => `/app/projects/${projectId}/cad`,
  },
  {
    key: "files",
    label: "Files",
    description: "Approvals and records",
    icon: FileStack,
    href: (projectId: string) => `/app/projects/${projectId}/files`,
  },
  {
    key: "letters",
    label: "Letter templates",
    description: "Set project letters",
    icon: FileText,
    href: (projectId: string) => `/app/projects/${projectId}/letters`,
  },
] as const;

export function ProjectWorkspaceNav({
  projectId,
  active,
}: {
  projectId: string;
  active: (typeof items)[number]["key"];
}) {
  return (
    <nav className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Project details sections">
      {items.map((item) => {
        const Icon = item.icon;
        const selected = active === item.key;
        return (
          <Link
            key={item.key}
            href={item.href(projectId)}
            aria-current={selected ? "page" : undefined}
            className={`flex min-w-0 items-center gap-3 rounded-lg border px-3 py-3 transition ${
              selected
                ? "border-navy-400 bg-navy-50 text-navy-950"
                : "border-slate-200 bg-white text-slate-700 hover:border-navy-200 hover:bg-slate-50"
            }`}
          >
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-600"}`}>
              <Icon size={17} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{item.label}</span>
              <span className="block truncate text-xs text-slate-500">{item.description}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
