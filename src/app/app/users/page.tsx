import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { hasPermission } from "@/server/rbac";
import { ASSIGNABLE_ROLES } from "@/server/services/users";
import { UsersManager } from "./users-manager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getSessionUser();
  if (!session) return null;
  if (!hasPermission(session.role, "users.manage")) notFound();

  const users = await prisma.user.findMany({
    where: { tenantId: session.tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      loginId: true,
      phone: true,
      role: true,
      status: true,
      lastLoginAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <ShieldCheck size={22} className="text-navy-800" />
          <h1 className="text-3xl font-semibold tracking-tight">Users &amp; roles</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Create team members, assign their role, activate or deactivate access, and reset passwords. Role changes take
          effect the next time the user signs in.
        </p>
      </div>
      <UsersManager
        initialUsers={users.map((user) => ({
          ...user,
          lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        }))}
        roles={ASSIGNABLE_ROLES}
        currentUserId={session.id}
      />
    </main>
  );
}
