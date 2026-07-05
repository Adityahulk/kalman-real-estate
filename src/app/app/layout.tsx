import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { hasPermission } from "@/server/rbac";
import { AppShell } from "./app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.tenantId === "__unselected__") redirect("/firms");

  const [user, tenant, projects, memberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: { name: true, email: true },
    }),
    prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { name: true, logoDataUrl: true } }),
    prisma.project.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, city: true },
    }),
    prisma.userFirmMembership.findMany({
      where: { userId: session.id },
      include: { tenant: { select: { id: true, name: true, logoDataUrl: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <AppShell
      user={{
        name: user?.name ?? session.email,
        email: user?.email ?? session.email,
        role: session.role,
        tenantName: tenant?.name ?? "Builder Workspace",
        tenantLogoDataUrl: tenant?.logoDataUrl ?? null,
      }}
      canManageUsers={hasPermission(session.role, "users.manage")}
      canViewLiaison={hasPermission(session.role, "liaison.view")}
      projects={projects}
      firms={memberships.map((membership) => membership.tenant)}
      activeFirmId={session.tenantId}
    >
      {children}
    </AppShell>
  );
}
