import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bot,
  Building2,
  ChartNoAxesCombined,
  Clapperboard,
  FileStack,
  Gauge,
  Hammer,
  Layers3,
  LogOut,
  Map,
  Bell,
  Users,
} from "lucide-react";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";

const nav = [
  { href: "/app", label: "Command", icon: Gauge },
  { href: "/app/cad", label: "CAD Engine", icon: Map },
  { href: "/app/ownership", label: "Ownership", icon: Users },
  { href: "/app/development", label: "Development", icon: Hammer },
  { href: "/app/marketing", label: "Marketing", icon: Clapperboard },
  { href: "/app/finance", label: "Cost + BOQ", icon: ChartNoAxesCombined },
  { href: "/app/documents", label: "Documents", icon: FileStack },
  { href: "/app/ai", label: "AI Insights", icon: Bot },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: { tenant: true },
  });
  const notifications = await prisma.notification.findMany({
    where: {
      tenantId: session.tenantId,
      status: "PENDING",
      OR: [{ userId: session.id }, { userId: null }],
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return (
    <div className="min-h-screen bg-slate-50 text-navy-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-white">
            <Building2 size={19} />
          </div>
          <div>
            <div className="text-sm font-semibold">{user?.tenant?.name ?? "Builder Workspace"}</div>
            <div className="text-xs text-slate-500">{session.role.replaceAll("_", " ")}</div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-navy-950">
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-3">
          <form action="/api/v1/auth/logout" method="post">
            <button className="btn-ghost w-full justify-start">
              <LogOut size={17} />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Layers3 size={17} />
            Production workspace
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden min-w-56 text-xs text-slate-500 md:block">
              {notifications[0]?.title ?? "No pending notifications"}
            </div>
            <div className="text-right text-sm">
              <div className="font-medium">{user?.name ?? session.email}</div>
              <div className="text-xs text-slate-500">{user?.email ?? session.email}</div>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
