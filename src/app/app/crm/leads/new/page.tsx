import { hasPermission } from "@/server/rbac";
import { listCrmLeads } from "@/server/services/crm";
import { CrmNav } from "../../crm-nav";
import { requireCrmContext } from "../../crm-page-context";
import { NewLeadForm } from "./new-lead-form";

export const dynamic = "force-dynamic";

export default async function NewCrmLeadPage() {
  const { session, context } = await requireCrmContext("crm.manage");
  const data = await listCrmLeads(context);
  return <main className="px-4 py-6 lg:px-8"><CrmNav canManageSettings={hasPermission(session.role, "crm.assign", session.permissions)}/><NewLeadForm campaigns={data.campaigns} projects={data.projects} referrals={data.leads.map(({ id, leadCode, name, primaryPhone }) => ({ id, name: `${leadCode} · ${name} · ${primaryPhone}` }))} sources={data.sources} users={data.users.map(({ id, name, role, customRole }) => ({ id, name, role, roleName: customRole?.name ?? null }))}/></main>;
}
