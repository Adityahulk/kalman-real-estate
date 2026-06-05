"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Bot,
  Building2,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  FileStack,
  Gauge,
  Hammer,
  Layers3,
  LogOut,
  Map,
  Menu,
  Plus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

type ShellNotification = {
  id: string;
  title: string;
};

const moduleNav = [
  { key: "workspace", label: "Workspace", icon: Gauge },
  { key: "cad", label: "CAD Map", icon: Map },
  { key: "ownership", label: "Ownership", icon: Users },
  { key: "development", label: "Development", icon: Hammer },
];

const globalNav = [
  { href: "/app/marketing", label: "Marketing", icon: Clapperboard },
  { href: "/app/finance", label: "Cost + BOQ", icon: ChartNoAxesCombined },
  { href: "/app/ai", label: "AI Insights", icon: Bot },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
];

export function AppShell({
  children,
  user,
  projects,
  notifications,
}: {
  children: React.ReactNode;
  user: ShellUser;
  projects: ShellProject[];
  notifications: ShellNotification[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fallbackProjectId, setFallbackProjectId] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem("kalman-sidebar-collapsed");
    if (stored) setCollapsed(stored === "true");
    const storedProject = window.localStorage.getItem("kalman-selected-project-id");
    if (storedProject) setFallbackProjectId(storedProject);
  }, []);

  const selectedProjectId = useMemo(() => {
    const match = pathname.match(/^\/app\/projects\/([^/]+)/);
    return match?.[1] ?? "";
  }, [pathname]);
  const isCommandCenter = pathname === "/app";
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

  const selectedProject = projects.find((project) => project.id === (selectedProjectId || (isCommandCenter ? "" : fallbackProjectId))) ?? null;
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
        className={`fixed inset-y-0 left-0 z-40 border-r border-slate-200 bg-white transition-all ${
          collapsed ? "w-20" : "w-72"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <button
          className="absolute -right-3 top-6 z-50 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 lg:flex"
          onClick={toggleCollapsed}
          type="button"
          title={collapsed ? "Expand navigation" : "Minimize navigation"}
          aria-label={collapsed ? "Expand navigation" : "Minimize navigation"}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
        <div className={`flex h-16 items-center gap-3 border-b border-slate-200 ${collapsed ? "justify-center px-2" : "px-4"}`}>
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/app" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-white">
              <Building2 size={19} />
            </Link>
            {!collapsed ? (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{user.tenantName}</div>
                <div className="truncate text-xs text-slate-500">{user.role.replaceAll("_", " ")}</div>
              </div>
            ) : null}
          </div>
          {!collapsed ? (
            <button
              className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-navy-900 lg:hidden"
              onClick={toggleCollapsed}
              type="button"
              title="Minimize navigation"
              aria-label="Minimize navigation"
            >
              <ChevronLeft size={17} />
            </button>
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

        <nav className="space-y-1 p-3">
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

        <div className="absolute bottom-0 left-0 right-0 space-y-2 border-t border-slate-200 p-3">
          <Link
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 ${collapsed ? "justify-center" : ""}`}
            href="/app/documents"
            title="Document archive"
          >
            <FileStack size={17} />
            {!collapsed ? "Document archive" : null}
          </Link>
          <form action="/api/v1/auth/logout" method="post">
            <button className={`btn-ghost h-9 w-full px-2 ${collapsed ? "justify-center" : "justify-start"}`}>
              <LogOut size={17} />
              {!collapsed ? "Sign out" : null}
            </button>
          </form>
        </div>
      </aside>

      <div className={`transition-all ${sidebarWidth}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 pl-16 backdrop-blur lg:px-8">
          <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
            <Layers3 size={17} />
            <span className="truncate">{selectedProject ? `${selectedProject.name} · ${selectedProject.city}` : "Select or create a project"}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden min-w-56 text-xs text-slate-500 md:block">
              {notifications[0]?.title ?? "No pending notifications"}
            </div>
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
  } ${active ? "bg-navy-900 text-white" : "text-slate-700 hover:bg-slate-100 hover:text-navy-950"} ${
    disabled ? "pointer-events-none opacity-40" : ""
  }`;

  return (
    <Link href={href} className={className} title={label}>
      {content}
    </Link>
  );
}
