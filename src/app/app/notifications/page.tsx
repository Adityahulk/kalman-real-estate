import { Bell, CheckCircle2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { NotificationReadButton } from "./read-button";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const notifications = await prisma.notification.findMany({
    where: {
      tenantId: session.tenantId,
      OR: [{ userId: session.id }, { userId: null }],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Map processing, document approvals, marketing reviews, owner-visible progress updates, and cost/payment alerts.
        </p>
      </div>
      <section className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <Bell size={18} />
          <h2 className="font-semibold">Notification center</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {notifications.map((notification) => (
            <div key={notification.id} className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{notification.title}</span>
                  <span className={`chip ${notification.status === "READ" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800"}`}>{notification.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                <div className="mt-2 text-xs text-slate-400">{notification.channel} · {notification.createdAt.toLocaleString("en-IN")}</div>
              </div>
              <div className="flex items-center gap-2">{typeof notification.data === "object" && notification.data && !Array.isArray(notification.data) && "url" in notification.data && typeof notification.data.url === "string" ? <Link className="btn-outline h-9 px-3 text-xs" href={notification.data.url}>Open <ExternalLink size={13}/></Link> : null}{notification.status !== "READ" ? <NotificationReadButton id={notification.id} /> : <CheckCircle2 className="text-emerald-600" size={18} />}</div>
            </div>
          ))}
          {!notifications.length ? <div className="p-8 text-center text-sm text-slate-500">No notifications yet.</div> : null}
        </div>
      </section>
    </main>
  );
}
