import { RequestContext } from "@/server/api";
import { requirePagePermission } from "@/server/page-auth";

export async function requireCrmContext(permission: "crm.view" | "crm.manage" | "crm.assign" | "crm.reports" = "crm.view") {
  const session = await requirePagePermission(permission);
  const context: RequestContext = {
    tenantId: session.tenantId,
    userId: session.id,
    role: session.role,
    permissions: session.permissions,
  };
  return { session, context };
}
