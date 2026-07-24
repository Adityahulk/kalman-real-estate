import { prisma } from "../db";
import { hasPermission, normalizePermissions } from "../rbac";

// Scans every tenant's active government approvals and notifies the liaison team about documents that
// have expired or will expire within `withinDays`. Debounced by `lastReminderAt` so the same document
// is not re-notified more than once every `cooldownDays`. Runs from a scheduled worker; safe to call
// repeatedly (idempotent within the cooldown window).
export async function sendExpiryReminders(opts?: { withinDays?: number; cooldownDays?: number }) {
  const withinDays = opts?.withinDays ?? 30;
  const cooldownDays = opts?.cooldownDays ?? 7;
  const now = new Date();
  const horizon = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
  const cooldown = new Date(now.getTime() - cooldownDays * 24 * 60 * 60 * 1000);

  const due = await prisma.approvalDocument.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { not: null, lte: horizon },
      OR: [{ lastReminderAt: null }, { lastReminderAt: { lte: cooldown } }],
    },
  });
  if (!due.length) return { documents: 0, notifications: 0 };

  // Cache each tenant's reminder recipients (anyone who can view liaison documents).
  const recipientsByTenant = new Map<string, { id: string }[]>();
  async function recipients(tenantId: string) {
    if (!recipientsByTenant.has(tenantId)) {
      const users = await prisma.user.findMany({ where: { tenantId, status: "ACTIVE" }, select: { id: true, role: true, customRole: { select: { permissions: true } } } });
      recipientsByTenant.set(tenantId, users.filter((u) => hasPermission(u.role, "liaison.view", normalizePermissions(u.customRole?.permissions))).map((u) => ({ id: u.id })));
    }
    return recipientsByTenant.get(tenantId)!;
  }

  let notifications = 0;
  for (const doc of due) {
    const users = await recipients(doc.tenantId);
    const expired = doc.expiresAt! < now;
    const title = expired ? `${doc.type} expired` : `${doc.type} expiring soon`;
    const body = expired
      ? `${doc.title} expired on ${doc.expiresAt!.toLocaleDateString()}. Renewal is overdue.`
      : `${doc.title} expires on ${doc.expiresAt!.toLocaleDateString()}. Please initiate renewal.`;
    if (users.length) {
      await prisma.notification.createMany({
        data: users.map((u) => ({
          tenantId: doc.tenantId,
          userId: u.id,
          channel: "in_app",
          title,
          body,
          data: { approvalId: doc.id, type: doc.type, expiresAt: doc.expiresAt!.toISOString() },
        })),
      });
      notifications += users.length;
    }
    await prisma.approvalDocument.update({ where: { id: doc.id }, data: { lastReminderAt: now } });
  }
  return { documents: due.length, notifications };
}

// Notifies the assigned site engineer about overdue tasks (past deadline, not completed). Fires at most
// once per cooldown window per task via the ProgressUpdate-free lastReminder marker on the audit side —
// here we simply notify daily; the notification centre naturally de-dupes by day of run.
export async function sendOverdueTaskReminders() {
  const now = new Date();
  const overdue = await prisma.siteAsset.findMany({
    where: {
      archivedAt: null,
      deadline: { not: null, lt: now },
      status: { notIn: ["COMPLETED"] },
      assignedToId: { not: null },
    },
    select: { id: true, tenantId: true, name: true, deadline: true, assignedToId: true },
  });
  let notifications = 0;
  for (const task of overdue) {
    await prisma.notification.create({
      data: {
        tenantId: task.tenantId,
        userId: task.assignedToId,
        channel: "in_app",
        title: "Task overdue",
        body: `"${task.name}" was due on ${task.deadline!.toLocaleDateString()} and is still open.`,
        data: { siteAssetId: task.id },
      },
    });
    notifications += 1;
  }
  return { tasks: overdue.length, notifications };
}
