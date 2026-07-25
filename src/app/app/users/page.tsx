import Link from "next/link";
import { Settings, ShieldCheck } from "lucide-react";
import { requirePagePermission } from "@/server/page-auth";
import { listUsers } from "@/server/services/users";
import { UsersManager } from "./users-manager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await requirePagePermission("users.manage");

  const data = await listUsers({ tenantId: session.tenantId, userId: session.id, role: session.role, permissions: session.permissions });

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={22} className="text-navy-800" />
            <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Create users, open complete profiles, edit access, and manage account status.
          </p>
        </div>
        {session.role === "SUPER_ADMIN" ? <Link className="btn-outline" href="/app/settings/users"><Settings size={15} /> Role settings</Link> : null}
      </div>
      <UsersManager
        initialUsers={data.users.map((user) => ({
          ...user,
          lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
          createdAt: undefined,
          profileData: user.profileData as Record<string, string | { fileId: string; fileName: string; mimeType: string } | null> | null,
          customRole: user.customRole ? { id: user.customRole.id, name: user.customRole.name } : null,
        }))}
        roles={data.roles}
        customRoles={data.customRoles}
        departments={data.departments}
        designations={data.designations}
        userFields={data.userFields}
        currentUserId={session.id}
        isSuperAdmin={session.role === "SUPER_ADMIN"}
      />
    </main>
  );
}
