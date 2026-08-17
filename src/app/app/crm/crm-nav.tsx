import Link from "next/link";
import { BarChart3, CalendarDays, ContactRound, ListTodo, Plus, Settings2 } from "lucide-react";

const items = [
  ["Dashboard", "/app/crm", ContactRound],
  ["Leads", "/app/crm/leads", ListTodo],
  ["Follow-ups", "/app/crm/follow-ups", CalendarDays],
  ["Visits", "/app/crm/visits", CalendarDays],
  ["Reports", "/app/crm/reports", BarChart3],
  ["Settings", "/app/crm/settings", Settings2],
] as const;

export function CrmNav({ canManageSettings = false }: { canManageSettings?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
      <nav className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1" aria-label="CRM navigation">
        {items.filter(([label]) => canManageSettings || (label !== "Reports" && label !== "Settings")).map(([label, href, Icon]) => (
          <Link className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-950" href={href} key={href}>
            <Icon size={15} />{label}
          </Link>
        ))}
      </nav>
      <Link className="btn-primary h-10 shrink-0 px-4" href="/app/crm/leads/new"><Plus size={16} />New lead</Link>
    </div>
  );
}

export function formatCrmLabel(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
