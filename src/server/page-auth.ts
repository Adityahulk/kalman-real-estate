import { notFound, redirect } from "next/navigation";
import { Permission, hasPermission } from "./rbac";
import { getSessionUser, SessionUser } from "./session";

export async function requirePagePermission(permission: Permission): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.tenantId === "__unselected__") redirect("/firms");
  if (!hasPermission(session.role, permission, session.permissions)) notFound();
  return session;
}

export async function requireAnyPagePermission(permissions: Permission[]): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.tenantId === "__unselected__") redirect("/firms");
  if (!permissions.some((permission) => hasPermission(session.role, permission, session.permissions))) notFound();
  return session;
}
