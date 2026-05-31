import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { AppShell } from "./app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const [user, notifications, projects] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      include: { tenant: true },
    }),
    prisma.notification.findMany({
      where: {
        tenantId: session.tenantId,
        status: "PENDING",
        OR: [{ userId: session.id }, { userId: null }],
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.project.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, city: true },
    }),
  ]);

  return (
    <AppShell
      user={{
        name: user?.name ?? session.email,
        email: user?.email ?? session.email,
        role: session.role,
        tenantName: user?.tenant?.name ?? "Builder Workspace",
      }}
      projects={projects}
      notifications={notifications.map((notification) => ({ id: notification.id, title: notification.title }))}
    >
      {children}
    </AppShell>
  );
}
