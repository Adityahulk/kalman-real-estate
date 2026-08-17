import Link from "next/link";
import { hasPermission } from "@/server/rbac";
import { listCrmOperations } from "@/server/services/crm";
import { CrmNav, formatCrmLabel } from "../crm-nav";
import { requireCrmContext } from "../crm-page-context";

export const dynamic = "force-dynamic";
export default async function VisitsPage() {
  const { session, context } = await requireCrmContext(); const data = await listCrmOperations(context, "visits");
  if (!("visits" in data)) return null;
  const leadMap = Object.fromEntries(data.leads.map((lead) => [lead.id, lead])); const userMap = Object.fromEntries(data.users.map((user) => [user.id, user.name])); const projectMap = Object.fromEntries(data.projects.map((project) => [project.id, project.name]));
  return <main className="px-4 py-6 lg:px-8"><CrmNav canManageSettings={hasPermission(session.role, "crm.assign", session.permissions)}/><div className="mb-5"><h1 className="text-3xl font-semibold">Site visits</h1><p className="mt-2 text-sm text-slate-600">Appointments, assigned salespeople, arrivals, completion, and post-visit follow-up.</p></div><div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{data.visits.map((visit) => { const lead = leadMap[visit.leadId]; return <Link className="rounded-lg border border-slate-200 bg-white p-5 hover:border-[#2D5986]" href={`/app/crm/leads/${visit.leadId}`} key={visit.id}><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-medium uppercase text-slate-500">{visit.visitCode}</div><h2 className="mt-1 text-lg font-semibold">{lead?.name || "Customer"}</h2></div><span className="chip bg-slate-100 text-slate-700">{formatCrmLabel(visit.status)}</span></div><dl className="mt-4 space-y-2 text-sm"><Row label="Project" value={projectMap[visit.projectId] || "-"}/><Row label="Date" value={new Date(visit.scheduledAt).toLocaleString("en-IN")}/><Row label="Salesperson" value={visit.assignedSalespersonId ? userMap[visit.assignedSalespersonId] || "Team member" : "Unassigned"}/><Row label="Visitors" value={String(visit.visitorCount)}/></dl></Link>; })}{!data.visits.length ? <div className="rounded-lg border border-dashed border-slate-200 p-12 text-center text-sm text-slate-500 lg:col-span-2">No visits recorded.</div> : null}</div></main>;
}
function Row({ label, value }: { label: string; value: string }) { return <div className="grid grid-cols-[90px_1fr] gap-2"><dt className="text-slate-500">{label}</dt><dd className="font-medium">{value}</dd></div>; }
