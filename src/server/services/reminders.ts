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

// Sends one daily engineering reminder per open task. Tasks due today, due tomorrow, overdue, and
// assigned but still pending are covered. `lastReminderAt` prevents duplicate notifications when the
// worker runs more than once per day.
export async function sendDailyTaskReminders() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfTomorrow = new Date(startOfToday);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
  const cooldown = new Date(now.getTime() - 20 * 60 * 60 * 1000);
  const tasks = await prisma.siteAsset.findMany({
    where: {
      archivedAt: null,
      status: { notIn: ["COMPLETED", "CLOSED"] },
      assignedToId: { not: null },
      OR: [
        { deadline: { not: null, lt: endOfTomorrow } },
        { status: "PLANNED" },
      ],
      AND: [
        { OR: [{ lastReminderAt: null }, { lastReminderAt: { lte: cooldown } }] },
      ],
    },
    select: { id: true, tenantId: true, name: true, deadline: true, assignedToId: true, status: true },
  });
  let notifications = 0;
  for (const task of tasks) {
    const overdue = Boolean(task.deadline && task.deadline < startOfToday);
    const dueToday = Boolean(task.deadline && task.deadline >= startOfToday && task.deadline < new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000));
    const dueTomorrow = Boolean(task.deadline && task.deadline >= new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000));
    const title = overdue ? "Task overdue" : dueToday ? "Task due today" : dueTomorrow ? "Task due tomorrow" : "Task pending";
    const body = overdue
      ? `"${task.name}" was due on ${task.deadline!.toLocaleDateString()} and is still open.`
      : dueToday
        ? `"${task.name}" is due today.`
        : dueTomorrow
          ? `"${task.name}" is due tomorrow.`
          : `"${task.name}" is assigned and still pending.`;
    await prisma.notification.create({
      data: {
        tenantId: task.tenantId,
        userId: task.assignedToId,
        channel: "in_app",
        title,
        body,
        data: { siteAssetId: task.id, status: task.status, deadline: task.deadline?.toISOString() ?? null },
      },
    });
    await prisma.siteAsset.update({ where: { id: task.id }, data: { lastReminderAt: now } });
    notifications += 1;
  }
  return { tasks: tasks.length, notifications };
}

export const sendOverdueTaskReminders = sendDailyTaskReminders;

// Internal CRM reminders work without WhatsApp/SMS providers. They appear in WIDESTATE's
// notification centre; the same events can be connected to external providers later.
export async function sendCrmReminders() {
  const now = new Date();
  const cooldown = new Date(now.getTime() - 20 * 60 * 60 * 1000);
  const visitHorizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const [followUps, visits] = await Promise.all([
    prisma.crmFollowUp.findMany({
      where: { status: { in: ["PENDING", "OVERDUE"] }, dueAt: { lte: now }, OR: [{ lastReminderAt: null }, { lastReminderAt: { lte: cooldown } }] },
    }),
    prisma.crmVisit.findMany({
      where: { status: { in: ["PROPOSED", "SCHEDULED", "CONFIRMED"] }, scheduledAt: { gte: now, lte: visitHorizon }, OR: [{ lastReminderAt: null }, { lastReminderAt: { lte: cooldown } }] },
    }),
  ]);
  const leadIds = [...new Set([...followUps.map((item) => item.leadId), ...visits.map((item) => item.leadId)])];
  const leads = leadIds.length ? await prisma.crmLead.findMany({ where: { id: { in: leadIds } }, select: { id: true, name: true, leadCode: true } }) : [];
  const leadMap = Object.fromEntries(leads.map((lead) => [lead.id, lead]));
  const managerCache = new Map<string, string[]>();
  async function managers(tenantId: string) {
    if (!managerCache.has(tenantId)) {
      const users = await prisma.user.findMany({ where: { tenantId, status: "ACTIVE" }, select: { id: true, role: true, customRole: { select: { permissions: true } } } });
      managerCache.set(tenantId, users.filter((user) => hasPermission(user.role, "crm.assign", normalizePermissions(user.customRole?.permissions))).map((user) => user.id));
    }
    return managerCache.get(tenantId)!;
  }
  let notifications = 0;
  for (const followUp of followUps) {
    const overdueHours = Math.max(0, (now.getTime() - followUp.dueAt.getTime()) / 3_600_000);
    const escalationLevel = overdueHours >= 48 ? 2 : overdueHours >= 24 ? 1 : 0;
    const recipients = new Set<string>();
    if (followUp.assignedToId) recipients.add(followUp.assignedToId);
    if (escalationLevel > 0) (await managers(followUp.tenantId)).forEach((id) => recipients.add(id));
    const lead = leadMap[followUp.leadId];
    if (recipients.size) await prisma.notification.createMany({ data: [...recipients].map((userId) => ({ tenantId: followUp.tenantId, userId, channel: "in_app", title: escalationLevel ? "CRM follow-up overdue" : "CRM follow-up due", body: `${lead?.name ?? "Customer"}: ${followUp.actionType}`, data: { leadId: followUp.leadId, followUpId: followUp.id, escalationLevel } })) });
    await prisma.crmFollowUp.update({ where: { id: followUp.id }, data: { status: "OVERDUE", lastReminderAt: now, escalationLevel: Math.max(followUp.escalationLevel, escalationLevel) } });
    notifications += recipients.size;
  }
  for (const visit of visits) {
    if (visit.assignedSalespersonId) {
      const lead = leadMap[visit.leadId];
      await prisma.notification.create({ data: { tenantId: visit.tenantId, userId: visit.assignedSalespersonId, channel: "in_app", title: "Site visit within 24 hours", body: `${lead?.name ?? "Customer"} is scheduled for ${visit.scheduledAt.toLocaleString()}.`, data: { leadId: visit.leadId, visitId: visit.id } } });
      notifications += 1;
    }
    await prisma.crmVisit.update({ where: { id: visit.id }, data: { lastReminderAt: now } });
  }
  return { followUps: followUps.length, visits: visits.length, notifications };
}
