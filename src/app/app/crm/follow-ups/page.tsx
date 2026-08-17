import Link from "next/link";
import { Clock3 } from "lucide-react";
import { hasPermission } from "@/server/rbac";
import { listCrmOperations } from "@/server/services/crm";
import { CrmNav, formatCrmLabel } from "../crm-nav";
import { requireCrmContext } from "../crm-page-context";

export const dynamic = "force-dynamic";
export default async function FollowUpsPage() {
  const { session, context } = await requireCrmContext(); const data = await listCrmOperations(context, "follow-ups");
  if (!("followUps" in data)) return null;
  const leadMap = Object.fromEntries(data.leads.map((lead) => [lead.id, lead])); const userMap = Object.fromEntries(data.users.map((user) => [user.id, user.name])); const now = new Date();
  return <main className="px-4 py-6 lg:px-8"><CrmNav canManageSettings={hasPermission(session.role, "crm.assign", session.permissions)}/><div className="mb-5"><h1 className="text-3xl font-semibold">Follow-ups</h1><p className="mt-2 text-sm text-slate-600">A focused queue of calls and actions that must be completed or rescheduled.</p></div><div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Due</th><th>Customer</th><th>Action</th><th>Reason</th><th>Assigned to</th><th>Status</th></tr></thead><tbody className="divide-y divide-slate-100">{data.followUps.map((item) => { const lead = leadMap[item.leadId]; const overdue = new Date(item.dueAt) < now; return <tr className={overdue ? "bg-amber-50/50" : ""} key={item.id}><td className="px-4 py-3"><div className="flex items-center gap-2 font-medium"><Clock3 size={15}/>{new Date(item.dueAt).toLocaleString("en-IN")}</div></td><td><Link className="font-semibold text-[#2D5986]" href={`/app/crm/leads/${item.leadId}`}>{lead?.name || "Lead"}</Link><div className="text-xs text-slate-500">{lead?.primaryPhone}</div></td><td>{item.actionType}</td><td>{item.reason || "-"}</td><td>{item.assignedToId ? userMap[item.assignedToId] || "Team member" : "Unassigned"}</td><td><span className={`chip ${overdue ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-700"}`}>{overdue ? "Overdue" : formatCrmLabel(item.status)}</span></td></tr>; })}{!data.followUps.length ? <tr><td className="px-4 py-12 text-center text-slate-500" colSpan={6}>No pending follow-ups.</td></tr> : null}</tbody></table></div></main>;
}
