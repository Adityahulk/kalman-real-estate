import { notFound } from "next/navigation";
import Link from "next/link";
import { Role } from "@prisma/client";
import { Users } from "lucide-react";
import { getSessionUser } from "@/server/session";
import { listUserRoleSettings } from "@/server/services/user-role-settings";
import { RoleSettingsManager } from "./role-settings-manager";

export const dynamic = "force-dynamic";

export default async function UserRoleSettingsPage() {
  const session = await getSessionUser();
  if (!session || session.role !== Role.SUPER_ADMIN) notFound();
  const context = {
    tenantId: session.tenantId,
    userId: session.id,
    role: session.role,
    permissions: session.permissions,
  };
  const settings = await listUserRoleSettings(context);

  return (
    <div>
      <h2 className="text-lg font-semibold">User &amp; role settings</h2>
      <p className="mt-1 text-sm text-slate-500">Configure departments, designations, roles, permissions, and profile fields.</p>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link href="/app/users" className="card flex items-center gap-3 p-4 hover:border-navy-300 hover:bg-navy-50">
          <Users size={20} className="text-navy-700" />
          <div><div className="font-semibold">Users</div><div className="text-sm text-slate-500">Create, view, edit, deactivate, or delete user profiles.</div></div>
        </Link>
        <div className="card border-navy-300 bg-navy-50 p-4">
          <div className="font-semibold">Roles &amp; organization</div>
          <div className="text-sm text-slate-500">Departments, designations, permissions, and additional profile fields.</div>
        </div>
      </div>
      <RoleSettingsManager initial={settings} />
    </div>
  );
}
