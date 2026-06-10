import { Bell } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { AlertActions } from "./alert-actions";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const session = await getSessionUser();
  if (!session) return null;

  const alerts = await prisma.approval.findMany({
    where: { tenantId: session.tenantId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <main className="grid h-[calc(100vh-4rem)] gap-6 overflow-hidden px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
      <section className="min-h-0 rounded-xl border border-dashed border-slate-200 bg-white" aria-label="Main workspace" />

      <section className="min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <Bell size={18} />
          <h2 className="font-semibold">Alerts</h2>
          <span className="chip bg-slate-100 text-slate-700">{alerts.length}</span>
        </div>
        <div className="max-h-[calc(100vh-9rem)] divide-y divide-slate-100 overflow-auto">
          {alerts.map((alert) => (
            <article className="px-5 py-4" key={alert.id}>
              <div className="text-sm font-medium">{alert.recordType} approval</div>
              <div className="mt-1 text-xs text-slate-500">Record: {alert.recordId}</div>
              {alert.notes ? <p className="mt-2 text-sm text-slate-600">{alert.notes}</p> : null}
              <AlertActions id={alert.id} />
            </article>
          ))}
          {!alerts.length ? <div className="px-5 py-8 text-center text-sm text-slate-500">No pending alerts.</div> : null}
        </div>
      </section>
    </main>
  );
}
