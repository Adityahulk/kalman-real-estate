import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, IndianRupee, PhoneCall, UserPlus } from "lucide-react";
import { hasPermission } from "@/server/rbac";
import { getCrmDashboard } from "@/server/services/crm";
import { CrmNav, formatCrmLabel } from "./crm-nav";
import { requireCrmContext } from "./crm-page-context";

export const dynamic = "force-dynamic";

export default async function CrmDashboardPage() {
  const { session, context } = await requireCrmContext();
  const dashboard = await getCrmDashboard(context);
  const canManage = hasPermission(session.role, "crm.assign", session.permissions);
  const metrics = [
    ["New leads", dashboard.today.newLeads, UserPlus],
    ["Activities today", dashboard.today.activities, PhoneCall],
    ["Follow-ups due", dashboard.today.followUpsDue, CalendarClock],
    ["Overdue", dashboard.today.overdue, AlertTriangle],
    ["Visits today", dashboard.today.visits, CalendarClock],
    ["Booked value", `₹${dashboard.today.revenue.toLocaleString("en-IN")}`, IndianRupee],
  ] as const;
  return (
    <main className="px-4 py-6 lg:px-8">
      <CrmNav canManageSettings={canManage} />
      <div className="mb-6">
        <div className="text-sm text-slate-500">Customer relationships</div>
        <h1 className="mt-1 text-3xl font-semibold">CRM dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Today&apos;s leads, follow-ups, visits, bookings, and team performance in one place.</p>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map(([label, value, Icon]) => <div className="rounded-lg border border-slate-200 bg-white p-4" key={label}><Icon className="text-[#2D5986]" size={18}/><div className="mt-3 text-2xl font-semibold">{value}</div><div className="mt-1 text-xs font-medium uppercase text-slate-500">{label}</div></div>)}
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.7fr)]">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 p-4"><h2 className="font-semibold">Sales funnel</h2>{canManage ? <Link className="text-sm font-medium text-[#2D5986]" href="/app/crm/reports">Full report</Link> : null}</div>
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            {dashboard.funnel.map(([name, count], index) => <div className="rounded-md bg-slate-50 p-3" key={name}><div className="text-xs font-medium uppercase text-slate-500">{index + 1}. {name}</div><div className="mt-1 text-xl font-semibold">{count}</div></div>)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4"><h2 className="font-semibold">Due next</h2></div>
          <div className="divide-y divide-slate-100">
            {dashboard.dueFollowUps.slice(0, 6).map((item) => <Link className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50" href={`/app/crm/leads/${item.leadId}`} key={item.id}><div><div className="font-medium">{item.lead?.name ?? "Lead"}</div><div className="text-xs text-slate-500">{item.actionType} · {new Date(item.dueAt).toLocaleString("en-IN")}</div></div><ArrowRight size={16}/></Link>)}
            {!dashboard.dueFollowUps.length ? <div className="p-8 text-center text-sm text-slate-500">No follow-ups are due.</div> : null}
          </div>
        </div>
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4"><h2 className="font-semibold">Lead sources</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Source</th><th>Leads</th><th>Bookings</th><th>Value</th></tr></thead><tbody className="divide-y divide-slate-100">{dashboard.sources.slice(0, 8).map((row) => <tr key={row.source}><td className="py-3 font-medium">{row.source}</td><td>{row.leads}</td><td>{row.bookings}</td><td>₹{row.revenue.toLocaleString("en-IN")}</td></tr>)}</tbody></table></div></div>
        <div className="rounded-lg border border-slate-200 bg-white p-4"><h2 className="font-semibold">Visits today</h2><div className="mt-3 divide-y divide-slate-100">{dashboard.visitsToday.map((visit) => <Link className="block py-3 hover:text-[#2D5986]" href={`/app/crm/leads/${visit.leadId}`} key={visit.id}><div className="font-medium">{visit.lead?.name}</div><div className="text-xs text-slate-500">{new Date(visit.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · {formatCrmLabel(visit.status)}</div></Link>)}{!dashboard.visitsToday.length ? <div className="py-8 text-center text-sm text-slate-500">No visits scheduled today.</div> : null}</div></div>
      </section>
    </main>
  );
}
