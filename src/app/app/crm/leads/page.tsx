import Link from "next/link";
import { CrmLeadPotential, CrmLeadStatus } from "@prisma/client";
import { Search } from "lucide-react";
import { hasPermission } from "@/server/rbac";
import { listCrmLeads } from "@/server/services/crm";
import { CrmNav, formatCrmLabel } from "../crm-nav";
import { requireCrmContext } from "../crm-page-context";

export const dynamic = "force-dynamic";

export default async function CrmLeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { session, context } = await requireCrmContext();
  const query = await searchParams;
  const data = await listCrmLeads(context, {
    q: query.q,
    status: Object.values(CrmLeadStatus).includes(query.status as CrmLeadStatus) ? query.status as CrmLeadStatus : undefined,
    potential: Object.values(CrmLeadPotential).includes(query.potential as CrmLeadPotential) ? query.potential as CrmLeadPotential : undefined,
    sourceId: query.sourceId,
    projectId: query.projectId,
    assignedToId: query.assignedToId,
  });
  const sourceMap = Object.fromEntries(data.sources.map((item) => [item.id, item.name]));
  const projectMap = Object.fromEntries(data.projects.map((item) => [item.id, item.name]));
  const userMap = Object.fromEntries(data.users.map((item) => [item.id, item.name]));
  const canManage = hasPermission(session.role, "crm.assign", session.permissions);
  return <main className="px-4 py-6 lg:px-8"><CrmNav canManageSettings={canManage}/><div className="mb-5"><h1 className="text-3xl font-semibold">Leads</h1><p className="mt-2 text-sm text-slate-600">Search customer history, identify the next action, and keep every interaction with the company.</p></div>
    <form className="mb-5 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(150px,.35fr))_auto]">
      <label className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input className="input h-10 w-full pl-9" defaultValue={query.q} name="q" placeholder="Name, phone, email or lead ID"/></label>
      <select className="select h-10" defaultValue={query.status ?? ""} name="status"><option value="">All statuses</option>{Object.values(CrmLeadStatus).map((value) => <option key={value} value={value}>{formatCrmLabel(value)}</option>)}</select>
      <select className="select h-10" defaultValue={query.potential ?? ""} name="potential"><option value="">All potential</option>{Object.values(CrmLeadPotential).map((value) => <option key={value} value={value}>{formatCrmLabel(value)}</option>)}</select>
      <select className="select h-10" defaultValue={query.projectId ?? ""} name="projectId"><option value="">All projects</option>{data.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select className="select h-10" defaultValue={query.assignedToId ?? ""} name="assignedToId"><option value="">All employees</option>{data.users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <button className="btn-primary h-10 px-4">Apply</button>
    </form>
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Lead</th><th>Contact</th><th>Interest</th><th>Status</th><th>Potential</th><th>Assigned to</th><th>Next action</th></tr></thead><tbody className="divide-y divide-slate-100">{data.leads.map((lead) => <tr className="hover:bg-slate-50" key={lead.id}><td className="px-4 py-3"><Link className="font-semibold text-[#2D5986]" href={`/app/crm/leads/${lead.id}`}>{lead.name}</Link><div className="text-xs text-slate-500">{lead.leadCode}</div></td><td><div>{lead.primaryPhone}</div><div className="text-xs text-slate-500">{lead.city || lead.email || "-"}</div></td><td>{projectMap[lead.interestedProjectId ?? ""] || lead.interestedProperty || "Not specified"}<div className="text-xs text-slate-500">{sourceMap[lead.sourceId ?? ""] || "No source"}</div></td><td><span className="chip bg-slate-100 text-slate-700">{formatCrmLabel(lead.status)}</span></td><td><span className={`chip ${lead.potential === "HOT" ? "bg-red-50 text-red-700" : lead.potential === "WARM" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{formatCrmLabel(lead.potential)}</span></td><td>{userMap[lead.assignedSalespersonId ?? ""] || userMap[lead.assignedCallerId ?? ""] || "Unassigned"}</td><td>{lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleString("en-IN") : "-"}</td></tr>)}{!data.leads.length ? <tr><td className="px-4 py-12 text-center text-slate-500" colSpan={7}>No leads match these filters.</td></tr> : null}</tbody></table></div>
  </main>;
}
