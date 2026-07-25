import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { hasPermission } from "@/server/rbac";
import { firmsForUser } from "@/server/services/firms";
import { AppShell } from "./app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.tenantId === "__unselected__") redirect("/firms");

  const [user, tenant, projects, firms] = await Promise.all([
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
    firmsForUser(session),
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
      canManageUsers={hasPermission(session.role, "users.manage", session.permissions)}
      canViewLiaison={hasPermission(session.role, "liaison.view", session.permissions)}
      projects={projects}
      firms={firms.map((firm) => ({ id: firm.id, name: firm.name, logoDataUrl: firm.logoDataUrl }))}
      activeFirmId={session.tenantId}
    >
      {children}
    </AppShell>
  );
}
