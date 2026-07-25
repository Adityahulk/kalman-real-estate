"use client";

import Link from "next/link";
import { Building2, ClipboardList, FileStack, Hammer, Map, ShieldCheck, TextCursorInput } from "lucide-react";
import { usePathname } from "next/navigation";

const groups = [
  {
    label: "Organisation",
    items: [
      { href: "/app/settings/firm-details", label: "Firm details", icon: Building2 },
    ],
  },
  {
    label: "Project details",
    items: [
      { href: "/app/settings/project-details", label: "Detail fields", icon: ClipboardList },
      { href: "/app/settings/project-files", label: "File structure", icon: FileStack },
      { href: "/app/settings/project-maps", label: "Map structure", icon: Map },
    ],
  },
  {
    label: "Workflows",
    items: [
      { href: "/app/settings/development-categories", label: "Development categories", icon: Hammer },
      { href: "/app/settings/letter-fields", label: "Letter fields", icon: TextCursorInput },
    ],
  },
] as const;

export function SettingsTabs({ canShowUsers = false }: { canShowUsers?: boolean }) {
  const pathname = usePathname();
  const visibleGroups = canShowUsers
    ? [...groups, { label: "Access", items: [{ href: "/app/settings/users", label: "Users & roles", icon: ShieldCheck }] }]
    : groups;

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-2 lg:sticky lg:top-20 lg:self-start">
      <nav className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1" aria-label="Settings sections">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.label}</div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                      active ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-navy-950"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
