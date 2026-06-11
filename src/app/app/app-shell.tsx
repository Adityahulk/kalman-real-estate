"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  Building2,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  FileStack,
  Gauge,
  Hammer,
  LogOut,
  Menu,
  MoreVertical,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";

type ShellProject = {
  id: string;
  name: string;
  city: string;
};

type ShellUser = {
  name: string;
  email: string;
  role: string;
  tenantName: string;
};

type ShellFirm = {
  id: string;
  name: string;
};

const moduleNav = [
  { key: "workspace", label: "Project details", icon: Gauge },
  { key: "ownership", label: "Ownership", icon: Users },
  { key: "development", label: "Development", icon: Hammer },
];

const globalNav = [
  { href: "/app/marketing", label: "Marketing", icon: Clapperboard },
  { href: "/app/finance", label: "Cost + BOQ", icon: ChartNoAxesCombined },
  { href: "/app/ai", label: "AI Insights", icon: Bot },
];

export function AppShell({
  children,
  user,
  projects,
  firms,
  activeFirmId,
}: {
  children: React.ReactNode;
  user: ShellUser;
  projects: ShellProject[];
  firms: ShellFirm[];
  activeFirmId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fallbackProjectId, setFallbackProjectId] = useState("");
  const [firmMenuOpen, setFirmMenuOpen] = useState(false);
  const [switchingFirmId, setSwitchingFirmId] = useState("");
  const firmMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("kalman-sidebar-collapsed");
    if (stored) setCollapsed(stored === "true");
    const storedProject = window.localStorage.getItem("kalman-selected-project-id");
    if (storedProject) setFallbackProjectId(storedProject);
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!firmMenuRef.current || firmMenuRef.current.contains(event.target as Node)) return;
      setFirmMenuOpen(false);
    }
    if (firmMenuOpen) document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [firmMenuOpen]);

  const selectedProjectId = useMemo(() => {
    const match = pathname.match(/^\/app\/projects\/([^/]+)/);
    return match?.[1] ?? "";
  }, [pathname]);
  useEffect(() => {
    if (!selectedProjectId) return;
    window.localStorage.setItem("kalman-selected-project-id", selectedProjectId);
    setFallbackProjectId(selectedProjectId);
  }, [selectedProjectId]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      window.localStorage.setItem("kalman-sidebar-collapsed", String(!current));
      return !current;
    });
  }

  const selectedProject = projects.find((project) => project.id === (selectedProjectId || (pathname === "/app" ? "" : fallbackProjectId))) ?? null;
  const sidebarWidth = collapsed ? "lg:pl-20" : "lg:pl-72";

  function projectHref(key: string) {
    if (!selectedProject) return "/app";
    if (key === "workspace") return `/app/projects/${selectedProject.id}`;
    return `/app/projects/${selectedProject.id}/${key}`;
  }

  function onProjectChange(projectId: string) {
    if (!projectId) return;
    window.localStorage.setItem("kalman-selected-project-id", projectId);
    setFallbackProjectId(projectId);
    router.push(`/app/projects/${projectId}`);
  }

  async function switchFirm(tenantId: string) {
    if (!tenantId || tenantId === activeFirmId || switchingFirmId) return;
    setSwitchingFirmId(tenantId);
    const response = await fetch("/api/v1/firms/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });
    setSwitchingFirmId("");
    if (!response.ok) return;
    window.localStorage.removeItem("kalman-selected-project-id");
    setFallbackProjectId("");
    setFirmMenuOpen(false);
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-navy-950">
      <button
        className="fixed left-4 top-4 z-50 rounded-lg border border-slate-200 bg-white p-2 shadow-sm lg:hidden"
        onClick={() => setMobileOpen((value) => !value)}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col overflow-y-auto border-r border-slate-200 bg-white transition-all ${
          collapsed ? "w-20" : "w-72"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
          <Link href="/app" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-navy-200 bg-navy-100 text-navy-900">
            <Building2 size={19} />
          </Link>
          {!collapsed ? (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">WIDESTATE OS</div>
              <div className="truncate text-xs text-slate-500">{user.tenantName}</div>
            </div>
          ) : null}
        </div>

        <div className="border-b border-slate-100 p-3">
          {!collapsed ? (
            <div className="space-y-2">
              <label>
                <span className="label">Project</span>
                <select className="input" value={selectedProject?.id ?? ""} onChange={(event) => onProjectChange(event.target.value)}>
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </label>
              <Link className="btn-outline h-9 w-full justify-start px-3 text-xs" href="/app/projects/new">
                <Plus size={15} />
                New project
              </Link>
            </div>
          ) : (
            <Link className="flex h-10 items-center justify-center rounded-lg bg-slate-100 text-navy-900" href="/app/projects/new" title="New project">
              <Plus size={18} />
            </Link>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {moduleNav.map((item) => (
            <ShellLink
              key={item.key}
              href={projectHref(item.key)}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
              active={pathname === projectHref(item.key)}
              disabled={!selectedProject}
            />
          ))}
          <div className="my-3 border-t border-slate-100" />
          {globalNav.map((item) => (
            <ShellLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-slate-200 p-3">
          <Link
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 ${collapsed ? "justify-center" : ""}`}
            href="/app/settings/firm-details"
            title="Settings"
          >
            <Settings size={17} />
            {!collapsed ? "Settings" : null}
          </Link>
          <Link
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 ${collapsed ? "justify-center" : ""}`}
            href="/app/documents"
            title="Document archive"
          >
            <FileStack size={17} />
            {!collapsed ? "Document archive" : null}
          </Link>
          <button className="btn-ghost h-9 w-full justify-center px-2" onClick={toggleCollapsed} type="button">
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            {!collapsed ? "Collapse" : null}
          </button>
          <form action="/api/v1/auth/logout" method="post">
            <button className={`btn-ghost h-9 w-full px-2 ${collapsed ? "justify-center" : "justify-start"}`}>
              <LogOut size={17} />
              {!collapsed ? "Sign out" : null}
            </button>
          </form>
        </div>
      </aside>

      <div className={`min-h-screen transition-all ${sidebarWidth}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 pl-16 backdrop-blur lg:px-8">
          <div className="relative flex min-w-0 items-center gap-2" ref={firmMenuRef}>
            <div className="truncate text-sm font-semibold text-navy-950">Welcome to {user.tenantName}</div>
            <button className="btn-ghost h-9 w-9 px-0 text-slate-500" type="button" onClick={() => setFirmMenuOpen((value) => !value)} title="Change firm">
              <MoreVertical size={18} />
            </button>
            {firmMenuOpen ? (
              <div className="absolute left-0 top-11 z-30 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-card">
                <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-500">Select firm</div>
                <div className="mt-1 space-y-1">
                  {firms.map((firm) => (
                    <button
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                        firm.id === activeFirmId ? "bg-navy-100 text-navy-900" : "text-slate-700 hover:bg-slate-50"
                      }`}
                      key={firm.id}
                      type="button"
                      onClick={() => void switchFirm(firm.id)}
                    >
                      <span className="truncate">{firm.name}</span>
                      {switchingFirmId === firm.id ? <span className="text-xs text-slate-500">Opening...</span> : null}
                    </button>
                  ))}
                </div>
                <Link className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-navy-800 hover:bg-slate-50" href="/firms">
                  <Plus size={15} />
                  Add new firm
                </Link>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <div className="font-medium">{user.name}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function ShellLink({
  href,
  label,
  icon: Icon,
  collapsed,
  active,
  disabled,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  collapsed: boolean;
  active: boolean;
  disabled?: boolean;
}) {
  const content = (
    <>
      <Icon size={17} />
      {!collapsed ? label : null}
    </>
  );
  const className = `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    collapsed ? "justify-center" : ""
  } ${active ? "border border-navy-200 bg-navy-100 text-navy-900" : "text-slate-700 hover:bg-slate-100 hover:text-navy-950"} ${
    disabled ? "pointer-events-none opacity-40" : ""
  }`;

  return (
    <Link href={href} className={className} title={label}>
      {content}
    </Link>
  );
}
