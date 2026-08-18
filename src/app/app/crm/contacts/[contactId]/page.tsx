import Link from "next/link";
import { ArrowLeft, ExternalLink, Phone, UserRound } from "lucide-react";
import { getCrmContactProfile } from "@/server/services/crm";
import { requireCrmContext } from "../../crm-page-context";
import { formatCrmLabel } from "../../crm-nav";

export const dynamic = "force-dynamic";

export default async function CrmContactProfilePage({ params }: { params: Promise<{ contactId: string }> }) {
  const { context } = await requireCrmContext("crm.assign");
  const data = await getCrmContactProfile(context, (await params).contactId);
  const projects = Object.fromEntries(data.projects.map((item) => [item.id, item]));
  const users = Object.fromEntries(data.users.map((item) => [item.id, item.name]));
  const leadMap = Object.fromEntries(data.opportunities.map((item) => [item.id, item]));
  return <main className="px-4 py-6 lg:px-8"><div className="mx-auto max-w-7xl">
    <Link className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950" href="/app/crm/leads"><ArrowLeft size={15}/>All opportunities</Link>
    <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end"><div><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#E8F0F7] text-[#2D5986]"><UserRound size={22}/></span><div><h1 className="text-3xl font-semibold">{data.contact.name}</h1><p className="text-sm text-slate-500">{data.contact.contactCode} · Master contact</p></div></div></div><a className="btn-outline h-10 px-4" href={`tel:${data.contact.primaryPhone}`}><Phone size={16}/>Call {data.contact.primaryPhone}</a></header>
    <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]"><aside className="space-y-4"><section className="rounded-lg border border-slate-200 bg-white p-4"><h2 className="font-semibold">Client information</h2><dl className="mt-3 space-y-3 text-sm">{[["Phone",data.contact.primaryPhone],["Alternate",data.contact.alternatePhone],["Email",data.contact.email],["Location",[data.contact.area,data.contact.city].filter(Boolean).join(", ")],["Client type",data.contact.clientType],["Preferred contact",data.contact.preferredContactMethod]].map(([label,value]) => <div className="grid grid-cols-[105px_1fr] gap-2" key={label}><dt className="text-slate-500">{label}</dt><dd className="font-medium">{value || "Not recorded"}</dd></div>)}</dl></section></aside>
      <div className="space-y-5"><section className="rounded-lg border border-slate-200 bg-white"><div className="border-b border-slate-200 p-4"><h2 className="font-semibold">Project opportunities</h2><p className="mt-1 text-sm text-slate-500">One client identity, with a separate controlled sales record for each project.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Project</th><th>Status</th><th>Potential</th><th>Assigned to</th><th>Last updated</th><th></th></tr></thead><tbody className="divide-y divide-slate-100">{data.opportunities.map((lead) => <tr key={lead.id}><td className="px-4 py-3"><b>{projects[lead.interestedProjectId || ""]?.name || "Project not selected"}</b><div className="text-xs text-slate-500">{lead.leadCode}</div></td><td>{formatCrmLabel(lead.status)}</td><td>{formatCrmLabel(lead.potential)}</td><td>{users[lead.assignedSalespersonId || ""] || users[lead.assignedCallerId || ""] || "Unassigned"}</td><td>{lead.updatedAt.toLocaleString("en-IN")}</td><td><Link className="inline-flex items-center gap-1 font-medium text-[#2D5986]" href={`/app/crm/leads/${lead.id}`}>Open <ExternalLink size={13}/></Link></td></tr>)}</tbody></table></div></section>
      <section className="rounded-lg border border-slate-200 bg-white"><div className="border-b border-slate-200 p-4"><h2 className="font-semibold">Company-wide interaction history</h2></div><div className="divide-y divide-slate-100">{data.activities.slice(0,50).map((item) => <div className="grid gap-2 p-4 sm:grid-cols-[155px_1fr]" key={item.id}><div className="text-xs text-slate-500">{item.occurredAt.toLocaleString("en-IN")}</div><div><b>{item.title}</b><div className="text-xs text-slate-500">{projects[item.projectId || leadMap[item.leadId]?.interestedProjectId || ""]?.name || "No project"}</div>{item.notes ? <p className="mt-1 text-sm text-slate-600">{item.notes}</p> : null}</div></div>)}</div></section></div>
    </div>
  </div></main>;
}
