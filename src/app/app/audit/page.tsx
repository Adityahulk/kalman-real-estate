import { ScrollText } from "lucide-react";
import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";

export const dynamic = "force-dynamic";

const ACTION_CHIP: Record<string, string> = {
  CREATE: "bg-emerald-50 text-emerald-700",
  APPROVE: "bg-sky-50 text-sky-700",
  VERIFY: "bg-sky-50 text-sky-700",
  SIGN: "bg-emerald-50 text-emerald-700",
  SUBMIT: "bg-amber-50 text-amber-800",
  REJECT: "bg-rose-50 text-rose-700",
  RETURN: "bg-rose-50 text-rose-700",
  DELETE: "bg-rose-50 text-rose-700",
};

export default async function AuditPage(props: { searchParams: Promise<{ entityType?: string; action?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await requirePagePermission("audit.view");

  const events = await prisma.auditEvent.findMany({
    where: {
      tenantId: session.tenantId,
      archivedAt: null,
      ...(searchParams.entityType ? { entityType: searchParams.entityType } : {}),
      ...(searchParams.action ? { action: searchParams.action as never } : {}),
    },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const entityTypes = Array.from(new Set(events.map((e) => e.entityType)));

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <ScrollText size={22} className="text-navy-800" />
          <h1 className="text-3xl font-semibold tracking-tight">Audit trail</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          A permanent, append-only record of every action — who did what, and when. Nothing is ever deleted, only archived.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <a className={`chip ${!searchParams.entityType ? "bg-navy-100 text-navy-800" : "bg-slate-100 text-slate-600"}`} href="/app/audit">All</a>
        {entityTypes.map((type) => (
          <a key={type} className={`chip ${searchParams.entityType === type ? "bg-navy-100 text-navy-800" : "bg-slate-100 text-slate-600"}`} href={`/app/audit?entityType=${encodeURIComponent(type)}`}>
            {type}
          </a>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="divide-y divide-slate-100">
          {events.map((event) => (
            <div key={event.id} className="flex items-start justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`chip ${ACTION_CHIP[event.action] ?? "bg-slate-100 text-slate-600"}`}>{event.action}</span>
                  <span className="text-sm font-medium text-navy-900">{event.entityType}</span>
                  <span className="truncate text-xs text-slate-400">{event.entityId}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {event.actor?.name ?? "System"}
                  {event.ipAddress ? ` · ${event.ipAddress}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-xs text-slate-400">{event.createdAt.toLocaleString("en-IN")}</div>
            </div>
          ))}
          {!events.length ? <div className="p-8 text-center text-sm text-slate-500">No audit events recorded yet.</div> : null}
        </div>
      </section>
    </main>
  );
}
