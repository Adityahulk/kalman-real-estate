import {
  AuditAction,
  CrmActivityType,
  CrmFollowUpStatus,
  CrmLeadPotential,
  CrmLeadStatus,
  CrmVisitStatus,
  Prisma,
  Role,
} from "@prisma/client";
import { z } from "zod";
import { writeAuditEvent } from "../audit";
import { RequestContext } from "../api";
import { prisma } from "../db";
import { hasPermission } from "../rbac";
import { createNotification, notifyRoleWithPermission } from "./notifications";

const optionalText = z.string().trim().optional().nullable();
const optionalId = z.string().trim().min(1).optional().nullable();
const optionalMoney = z.union([z.number().nonnegative(), z.string().trim(), z.null()]).optional();

export const createCrmLeadSchema = z.object({
  name: z.string().trim().min(1),
  primaryPhone: z.string().trim().min(7),
  alternatePhone: optionalText,
  whatsappPhone: optionalText,
  email: z.string().email().optional().or(z.literal("")),
  city: optionalText,
  area: optionalText,
  sourceId: z.string().trim().min(1, "Select where this lead came from."),
  campaignId: optionalId,
  interestedProjectId: optionalId,
  propertyType: optionalText,
  interestedProperty: optionalText,
  budgetMinInr: optionalMoney,
  budgetMaxInr: optionalMoney,
  purchaseTimeline: optionalText,
  purpose: optionalText,
  previousWork: optionalText,
  existingCustomer: z.boolean().default(false),
  previousInteraction: optionalText,
  preferredLanguage: optionalText,
  preferredContactMethod: optionalText,
  assignedCallerId: optionalId,
  assignedSalespersonId: optionalId,
  notes: optionalText,
  tags: z.array(z.string().trim().min(1)).default([]),
  qualification: z.record(z.unknown()).optional(),
  referredByLeadId: optionalId,
  consentWhatsApp: z.boolean().default(false),
  consentSms: z.boolean().default(false),
  consentEmail: z.boolean().default(false),
  firstEnquiryAt: z.string().datetime().optional(),
});

export const updateCrmLeadSchema = createCrmLeadSchema.partial().extend({
  status: z.nativeEnum(CrmLeadStatus).optional(),
  potential: z.nativeEnum(CrmLeadPotential).optional(),
});

export const crmLeadActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("activity"),
    type: z.enum(["INCOMING_CALL", "OUTGOING_CALL", "NOTE", "MESSAGE_OPENED"]),
    notes: z.string().trim().min(1),
    outcome: z.string().trim().min(1),
    durationMinutes: z.number().nonnegative().optional(),
    status: z.nativeEnum(CrmLeadStatus).optional(),
    potential: z.nativeEnum(CrmLeadPotential).optional(),
    nextAction: z.string().trim().min(1),
    nextFollowUpAt: z.string().datetime().optional().nullable(),
  }),
  z.object({
    action: z.literal("assign"),
    callerId: optionalId,
    salespersonId: optionalId,
    reason: z.string().trim().min(2),
  }),
  z.object({
    action: z.literal("follow_up"),
    actionType: z.string().trim().min(1),
    reason: optionalText,
    dueAt: z.string().datetime(),
    assignedToId: optionalId,
  }),
  z.object({
    action: z.literal("complete_follow_up"),
    followUpId: z.string().min(1),
    outcome: z.string().trim().min(1),
    status: z.nativeEnum(CrmLeadStatus).optional(),
    nextAction: z.string().trim().min(1),
    nextFollowUpAt: z.string().datetime().optional().nullable(),
  }),
  z.object({
    action: z.literal("visit"),
    projectId: z.string().min(1),
    scheduledAt: z.string().datetime(),
    visitorCount: z.number().int().min(1).max(100).default(1),
    preferredSalespersonId: optionalId,
    assignedSalespersonId: optionalId,
    pickupRequired: z.boolean().default(false),
    specialRequirements: optionalText,
  }),
  z.object({
    action: z.literal("update_visit"),
    visitId: z.string().min(1),
    status: z.nativeEnum(CrmVisitStatus),
    customerResponse: optionalText,
    propertiesShown: z.array(z.string()).default([]),
    propertiesLiked: z.array(z.string()).default([]),
    budgetConfirmedInr: optionalMoney,
    objections: optionalText,
    purchaseProbability: z.number().int().min(0).max(100).optional().nullable(),
    customerNextAction: optionalText,
    salespersonNextAction: optionalText,
    nextFollowUpAt: z.string().datetime().optional().nullable(),
  }),
  z.object({
    action: z.literal("feedback"),
    visitId: optionalId,
    rating: z.number().int().min(1).max(5),
    comments: optionalText,
  }),
  z.object({
    action: z.literal("booking"),
    projectId: z.string().min(1),
    plotId: optionalId,
    amountInr: optionalMoney,
    notes: optionalText,
  }),
  z.object({
    action: z.literal("ticket"),
    category: z.string().trim().min(1),
    subject: z.string().trim().min(1),
    description: optionalText,
    assignedToId: optionalId,
  }),
  z.object({
    action: z.literal("archive"),
    reason: z.string().trim().min(2),
  }),
]);

export const mergeCrmLeadsSchema = z.object({
  sourceLeadId: z.string().min(1),
  targetLeadId: z.string().min(1),
});

export const crmSettingSchema = z.discriminatedUnion("resource", [
  z.object({ resource: z.literal("source"), name: z.string().trim().min(1) }),
  z.object({
    resource: z.literal("campaign"),
    name: z.string().trim().min(1),
    sourceId: optionalId,
    projectId: optionalId,
    spendInr: optionalMoney,
    startedAt: z.string().datetime().optional().nullable(),
    endedAt: z.string().datetime().optional().nullable(),
    notes: optionalText,
  }),
  z.object({
    resource: z.literal("template"),
    name: z.string().trim().min(1),
    channel: z.enum(["WHATSAPP", "SMS", "EMAIL"]),
    subject: optionalText,
    body: z.string().trim().min(1),
  }),
  z.object({
    resource: z.literal("automation"),
    name: z.string().trim().min(1),
    trigger: z.string().trim().min(1),
    actions: z.string().trim().min(1),
  }),
]);

export const updateCrmSettingSchema = z.object({
  name: z.string().trim().min(1).optional(),
  active: z.boolean().optional(),
  subject: optionalText,
  body: optionalText,
  trigger: optionalText,
  actions: optionalText,
  notes: optionalText,
});

const DEFAULT_SOURCES = [
  "Advertisement number", "Instagram", "Facebook", "WhatsApp", "Website", "Google",
  "Referral", "Existing customer", "Walk-in", "Property portal", "Influencer",
  "Exhibition / event", "Direct call", "Manual entry", "Other",
];

const DEFAULT_TEMPLATES = [
  { name: "New enquiry", key: "new_enquiry", channel: "WHATSAPP", body: "Hello {{customer_name}}, thank you for contacting {{firm_name}}. We have recorded your enquiry for {{project_name}}." },
  { name: "Site visit confirmation", key: "visit_confirmation", channel: "WHATSAPP", body: "Hello {{customer_name}}, your visit to {{project_name}} is scheduled for {{visit_date}} at {{visit_time}}. Contact: {{salesperson_name}} {{salesperson_phone}}." },
  { name: "Site visit reminder", key: "visit_reminder", channel: "WHATSAPP", body: "Reminder: your visit to {{project_name}} is scheduled for {{visit_date}} at {{visit_time}}." },
  { name: "Visit thank you", key: "visit_thank_you", channel: "WHATSAPP", body: "Thank you for visiting {{project_name}}. We appreciate your time and would value your feedback." },
  { name: "Follow-up", key: "follow_up", channel: "WHATSAPP", body: "Hello {{customer_name}}, following up regarding your interest in {{project_name}}. Please let us know a convenient time to speak." },
  { name: "Booking congratulations", key: "booking_congratulations", channel: "WHATSAPP", body: "Congratulations {{customer_name}}. Your booking for {{project_name}} has been recorded successfully." },
];

export async function ensureCrmDefaults(tenantId: string) {
  await prisma.crmLeadSource.createMany({
    data: DEFAULT_SOURCES.map((name) => ({ tenantId, name, key: slug(name) })),
    skipDuplicates: true,
  });
  await prisma.crmCommunicationTemplate.createMany({
    data: DEFAULT_TEMPLATES.map((template) => ({ tenantId, ...template })),
    skipDuplicates: true,
  });
}

export async function getCrmReferenceData(context: RequestContext) {
  await ensureCrmDefaults(context.tenantId);
  const [sources, campaigns, templates, projects, users, plots] = await Promise.all([
    prisma.crmLeadSource.findMany({ where: { tenantId: context.tenantId, active: true, archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.crmCampaign.findMany({ where: { tenantId: context.tenantId, archivedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.crmCommunicationTemplate.findMany({ where: { tenantId: context.tenantId, active: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ where: { tenantId: context.tenantId }, select: { id: true, name: true, city: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { tenantId: context.tenantId, status: "ACTIVE", role: { not: Role.PLOT_OWNER } },
      select: { id: true, name: true, email: true, phone: true, role: true, customRole: { select: { name: true, permissions: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.plot.findMany({
      where: { tenantId: context.tenantId, archivedAt: null, status: { in: ["COMPANY_OWNED", "HOLD"] } },
      select: { id: true, projectId: true, code: true, status: true, areaSqYards: true },
      orderBy: { code: "asc" },
    }),
  ]);
  return { sources, campaigns, templates, projects, users, plots };
}

export async function getCrmDashboard(context: RequestContext) {
  await ensureCrmDefaults(context.tenantId);
  const scope = leadScope(context);
  const now = new Date();
  const start = startOfDay(now);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const [leads, dueFollowUps, visitsToday, activitiesToday, bookings, sources, users] = await Promise.all([
    prisma.crmLead.findMany({ where: { tenantId: context.tenantId, archivedAt: null, ...scope }, select: { id: true, status: true, sourceId: true, assignedCallerId: true, assignedSalespersonId: true, createdAt: true } }),
    prisma.crmFollowUp.findMany({ where: { tenantId: context.tenantId, status: { in: ["PENDING", "OVERDUE"] }, dueAt: { lte: end }, ...followUpScope(context) }, orderBy: { dueAt: "asc" }, take: 12 }),
    prisma.crmVisit.findMany({ where: { tenantId: context.tenantId, scheduledAt: { gte: start, lt: end }, ...visitScope(context) }, orderBy: { scheduledAt: "asc" }, take: 12 }),
    prisma.crmActivity.count({ where: { tenantId: context.tenantId, occurredAt: { gte: start, lt: end }, ...(canSeeAll(context) ? {} : { actorUserId: context.userId }) } }),
    prisma.crmBooking.findMany({ where: { tenantId: context.tenantId, status: "CONFIRMED" }, select: { leadId: true, amountInr: true, bookedAt: true } }),
    prisma.crmLeadSource.findMany({ where: { tenantId: context.tenantId, archivedAt: null } }),
    prisma.user.findMany({ where: { tenantId: context.tenantId }, select: { id: true, name: true } }),
  ]);
  const leadIds = [...new Set([...dueFollowUps.map((item) => item.leadId), ...visitsToday.map((item) => item.leadId)])];
  const leadNames = leadIds.length
    ? await prisma.crmLead.findMany({ where: { tenantId: context.tenantId, id: { in: leadIds } }, select: { id: true, name: true, primaryPhone: true, interestedProjectId: true } })
    : [];
  const leadMap = Object.fromEntries(leadNames.map((lead) => [lead.id, lead]));
  const userMap = Object.fromEntries(users.map((user) => [user.id, user.name]));
  const sourceMap = Object.fromEntries(sources.map((source) => [source.id, source.name]));
  const statusCounts = countBy(leads, (lead) => lead.status);
  const todayBookings = bookings.filter((booking) => booking.bookedAt >= start && booking.bookedAt < end);
  const sourceRows = Object.entries(countBy(leads, (lead) => lead.sourceId ?? "unknown")).map(([sourceId, count]) => {
    const sourceLeadIds = new Set(leads.filter((lead) => (lead.sourceId ?? "unknown") === sourceId).map((lead) => lead.id));
    const sourceBookings = bookings.filter((booking) => sourceLeadIds.has(booking.leadId));
    return {
      source: sourceMap[sourceId] ?? "Not specified",
      leads: count,
      bookings: sourceBookings.length,
      revenue: sourceBookings.reduce((sum, item) => sum + Number(item.amountInr ?? 0), 0),
    };
  }).sort((a, b) => b.leads - a.leads);
  const performance = users.map((user) => ({
    id: user.id,
    name: user.name,
    leads: leads.filter((lead) => lead.assignedCallerId === user.id || lead.assignedSalespersonId === user.id).length,
    activitiesToday: 0,
  })).filter((row) => row.leads > 0).sort((a, b) => b.leads - a.leads);
  return {
    today: {
      newLeads: leads.filter((lead) => lead.createdAt >= start && lead.createdAt < end).length,
      activities: activitiesToday,
      followUpsDue: dueFollowUps.length,
      overdue: dueFollowUps.filter((item) => item.dueAt < now).length,
      visits: visitsToday.length,
      bookings: todayBookings.length,
      revenue: todayBookings.reduce((sum, item) => sum + Number(item.amountInr ?? 0), 0),
    },
    funnel: [
      ["Leads", leads.length],
      ["Qualified", sumStatuses(statusCounts, ["QUALIFIED", "INTERESTED", "FOLLOW_UP_REQUIRED", "VISIT_PROPOSED", "VISIT_SCHEDULED", "VISIT_COMPLETED", "NEGOTIATION", "BOOKING_PENDING", "BOOKED", "CUSTOMER"])],
      ["Interested", sumStatuses(statusCounts, ["INTERESTED", "VISIT_PROPOSED", "VISIT_SCHEDULED", "VISIT_COMPLETED", "NEGOTIATION", "BOOKING_PENDING", "BOOKED", "CUSTOMER"])],
      ["Visits", sumStatuses(statusCounts, ["VISIT_SCHEDULED", "VISIT_COMPLETED", "NEGOTIATION", "BOOKING_PENDING", "BOOKED", "CUSTOMER"])],
      ["Negotiation", sumStatuses(statusCounts, ["NEGOTIATION", "BOOKING_PENDING", "BOOKED", "CUSTOMER"])],
      ["Bookings", sumStatuses(statusCounts, ["BOOKED", "CUSTOMER"])],
    ] as Array<[string, number]>,
    dueFollowUps: dueFollowUps.map((item) => ({ ...item, lead: leadMap[item.leadId], assignedTo: item.assignedToId ? userMap[item.assignedToId] : null })),
    visitsToday: visitsToday.map((item) => ({ ...item, lead: leadMap[item.leadId], salesperson: item.assignedSalespersonId ? userMap[item.assignedSalespersonId] : null })),
    sources: sourceRows,
    performance,
  };
}

export async function listCrmLeads(
  context: RequestContext,
  filters: { q?: string; status?: CrmLeadStatus; potential?: CrmLeadPotential; sourceId?: string; projectId?: string; assignedToId?: string } = {},
) {
  await ensureCrmDefaults(context.tenantId);
  const q = filters.q?.trim();
  const leads = await prisma.crmLead.findMany({
    where: {
      tenantId: context.tenantId,
      archivedAt: null,
      ...leadScope(context),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.potential ? { potential: filters.potential } : {}),
      ...(filters.sourceId ? { sourceId: filters.sourceId } : {}),
      ...(filters.projectId ? { interestedProjectId: filters.projectId } : {}),
      ...(filters.assignedToId ? { OR: [{ assignedCallerId: filters.assignedToId }, { assignedSalespersonId: filters.assignedToId }] } : {}),
      ...(q ? {
        AND: [{ OR: [
          { leadCode: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { primaryPhone: { contains: q } },
          { alternatePhone: { contains: q } },
          { whatsappPhone: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
        ] }],
      } : {}),
    },
    orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
    take: 500,
  });
  const refs = await getCrmReferenceData(context);
  return { leads, ...refs };
}

export async function getCrmLead(context: RequestContext, leadId: string) {
  const lead = await prisma.crmLead.findFirstOrThrow({ where: { id: leadId, tenantId: context.tenantId, archivedAt: null, ...leadScope(context) } });
  const [activities, assignments, followUps, visits, feedback, bookings, tickets, refs] = await Promise.all([
    prisma.crmActivity.findMany({ where: { tenantId: context.tenantId, leadId }, orderBy: { occurredAt: "desc" } }),
    prisma.crmLeadAssignment.findMany({ where: { tenantId: context.tenantId, leadId }, orderBy: { createdAt: "desc" } }),
    prisma.crmFollowUp.findMany({ where: { tenantId: context.tenantId, leadId }, orderBy: { dueAt: "desc" } }),
    prisma.crmVisit.findMany({ where: { tenantId: context.tenantId, leadId }, orderBy: { scheduledAt: "desc" } }),
    prisma.crmFeedback.findMany({ where: { tenantId: context.tenantId, leadId }, orderBy: { createdAt: "desc" } }),
    prisma.crmBooking.findMany({ where: { tenantId: context.tenantId, leadId }, orderBy: { createdAt: "desc" } }),
    prisma.crmTicket.findMany({ where: { tenantId: context.tenantId, leadId }, orderBy: { createdAt: "desc" } }),
    getCrmReferenceData(context),
  ]);
  return { lead, activities, assignments, followUps, visits, feedback, bookings, tickets, ...refs };
}

export async function createCrmLead(context: RequestContext, input: z.infer<typeof createCrmLeadSchema>) {
  const phones = phoneCandidates(input);
  const duplicate = await findDuplicateLead(context.tenantId, phones, input.email);
  if (duplicate) {
    const error = new Error(`Existing lead found: ${duplicate.name} (${duplicate.leadCode}). Open that lead and add a new interaction instead.`);
    error.name = "BadRequestError";
    throw error;
  }
  await validateLeadReferences(context, input);
  const lead = await prisma.$transaction(async (tx) => {
    const leadCode = await nextCode(tx, context.tenantId, "lead", "LEAD");
    const created = await tx.crmLead.create({
      data: leadData(context, input, leadCode),
    });
    await tx.crmActivity.create({
      data: {
        tenantId: context.tenantId,
        leadId: created.id,
        type: CrmActivityType.LEAD_CREATED,
        title: "Lead created",
        notes: input.notes || null,
        actorUserId: context.userId,
      },
    });
    await createAssignmentRows(tx, context, created.id, null, created.assignedCallerId, null, created.assignedSalespersonId, "Initial assignment");
    return created;
  });
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "CrmLead", entityId: lead.id, after: lead as unknown as Prisma.InputJsonValue });
  await notifyAssignees(context, lead, "New CRM lead assigned", `${lead.name} (${lead.leadCode}) requires attention.`);
  return lead;
}

export async function updateCrmLead(context: RequestContext, leadId: string, input: z.infer<typeof updateCrmLeadSchema>) {
  const before = await requireEditableLead(context, leadId);
  if (input.sourceId !== undefined && input.sourceId !== before.sourceId) badRequest("A lead's original source is permanent. Add a campaign or timeline note instead.");
  const phoneInput = {
    primaryPhone: input.primaryPhone ?? before.primaryPhone,
    alternatePhone: input.alternatePhone === undefined ? before.alternatePhone : input.alternatePhone,
    whatsappPhone: input.whatsappPhone === undefined ? before.whatsappPhone : input.whatsappPhone,
  };
  const duplicate = await findDuplicateLead(context.tenantId, phoneCandidates(phoneInput), input.email === undefined ? before.email : input.email, leadId);
  if (duplicate) {
    const error = new Error(`Those contact details already belong to ${duplicate.name} (${duplicate.leadCode}).`);
    error.name = "BadRequestError";
    throw error;
  }
  await validateLeadReferences(context, input);
  const data: Prisma.CrmLeadUpdateInput = {
    ...plainLeadUpdate(input),
    score: calculateScore({ ...before, ...input }),
  };
  const lead = await prisma.$transaction(async (tx) => {
    const updated = await tx.crmLead.update({ where: { id: leadId }, data });
    if (input.status && input.status !== before.status) {
      await tx.crmActivity.create({ data: activityData(context, leadId, CrmActivityType.STATUS_CHANGED, `Status changed to ${label(input.status)}`, null, { from: before.status, to: input.status }) });
    }
    if (input.potential && input.potential !== before.potential) {
      await tx.crmActivity.create({ data: activityData(context, leadId, CrmActivityType.POTENTIAL_CHANGED, `Potential changed to ${label(input.potential)}`, null, { from: before.potential, to: input.potential }) });
    }
    return updated;
  });
  await writeAuditEvent(context, { action: AuditAction.UPDATE, entityType: "CrmLead", entityId: lead.id, before: before as unknown as Prisma.InputJsonValue, after: lead as unknown as Prisma.InputJsonValue });
  return lead;
}

export async function actOnCrmLead(context: RequestContext, leadId: string, input: z.infer<typeof crmLeadActionSchema>) {
  const lead = await requireEditableLead(context, leadId);
  if (input.action === "assign") return assignLead(context, lead, input);
  if (input.action === "activity") return recordActivity(context, lead, input);
  if (input.action === "follow_up") return createFollowUp(context, lead, input);
  if (input.action === "complete_follow_up") return completeFollowUp(context, lead, input);
  if (input.action === "visit") return scheduleVisit(context, lead, input);
  if (input.action === "update_visit") return updateVisit(context, lead, input);
  if (input.action === "feedback") return addFeedback(context, lead, input);
  if (input.action === "booking") return createBooking(context, lead, input);
  if (input.action === "ticket") return createTicket(context, lead, input);
  return archiveLead(context, lead, input.reason);
}

export async function mergeCrmLeads(context: RequestContext, input: z.infer<typeof mergeCrmLeadsSchema>) {
  assertCanAssign(context);
  if (input.sourceLeadId === input.targetLeadId) badRequest("Select two different leads.");
  const [source, target] = await Promise.all([
    prisma.crmLead.findFirstOrThrow({ where: { id: input.sourceLeadId, tenantId: context.tenantId, archivedAt: null } }),
    prisma.crmLead.findFirstOrThrow({ where: { id: input.targetLeadId, tenantId: context.tenantId, archivedAt: null } }),
  ]);
  await prisma.$transaction(async (tx) => {
    await Promise.all([
      tx.crmActivity.updateMany({ where: { tenantId: context.tenantId, leadId: source.id }, data: { leadId: target.id } }),
      tx.crmFollowUp.updateMany({ where: { tenantId: context.tenantId, leadId: source.id }, data: { leadId: target.id } }),
      tx.crmVisit.updateMany({ where: { tenantId: context.tenantId, leadId: source.id }, data: { leadId: target.id } }),
      tx.crmFeedback.updateMany({ where: { tenantId: context.tenantId, leadId: source.id }, data: { leadId: target.id } }),
      tx.crmBooking.updateMany({ where: { tenantId: context.tenantId, leadId: source.id }, data: { leadId: target.id } }),
      tx.crmTicket.updateMany({ where: { tenantId: context.tenantId, leadId: source.id }, data: { leadId: target.id } }),
      tx.crmLeadAssignment.updateMany({ where: { tenantId: context.tenantId, leadId: source.id }, data: { leadId: target.id } }),
    ]);
    await tx.crmActivity.create({ data: activityData(context, target.id, CrmActivityType.MERGED, `${source.leadCode} merged into this lead`, source.notes, { sourceLeadId: source.id, sourceLeadCode: source.leadCode }) });
    await tx.crmLead.update({
      where: { id: target.id },
      data: {
        alternatePhone: target.alternatePhone || source.primaryPhone,
        alternatePhoneNormalized: target.alternatePhoneNormalized || source.primaryPhoneNormalized,
        whatsappPhone: target.whatsappPhone || source.whatsappPhone,
        whatsappPhoneNormalized: target.whatsappPhoneNormalized || source.whatsappPhoneNormalized,
        email: target.email || source.email,
        notes: [target.notes, source.notes].filter(Boolean).join("\n\n"),
      },
    });
    await tx.crmLead.update({ where: { id: source.id }, data: { archivedAt: new Date(), archivedById: context.userId, archiveReason: `Merged into ${target.leadCode}` } });
  });
  await writeAuditEvent(context, { action: AuditAction.UPDATE, entityType: "CrmLead", entityId: target.id, after: { mergedLeadId: source.id, mergedLeadCode: source.leadCode } });
  return { targetLeadId: target.id };
}

export async function convertCrmLeadToCustomer(context: RequestContext, leadId: string, ownerId: string) {
  const [lead, owner] = await Promise.all([
    prisma.crmLead.findFirstOrThrow({ where: { id: leadId, tenantId: context.tenantId, archivedAt: null } }),
    prisma.owner.findFirstOrThrow({ where: { id: ownerId, tenantId: context.tenantId } }),
  ]);
  if (lead.status !== CrmLeadStatus.BOOKED && lead.status !== CrmLeadStatus.CUSTOMER) badRequest("This CRM lead must have a confirmed booking before allotment.");
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.crmLead.update({ where: { id: lead.id }, data: { status: CrmLeadStatus.CUSTOMER, convertedOwnerId: owner.id, nextFollowUpAt: null } });
    if (lead.status !== CrmLeadStatus.CUSTOMER || lead.convertedOwnerId !== owner.id) {
      await tx.crmActivity.create({ data: activityData(context, lead.id, CrmActivityType.CUSTOMER_CONVERTED, "Lead converted to customer", `Linked to ownership profile ${owner.name}.`, { ownerId: owner.id }) });
    }
    return result;
  });
  await writeAuditEvent(context, { action: AuditAction.UPDATE, entityType: "CrmLead", entityId: lead.id, before: lead as unknown as Prisma.InputJsonValue, after: updated as unknown as Prisma.InputJsonValue });
  return updated;
}

export async function listCrmOperations(context: RequestContext, kind: "follow-ups" | "visits") {
  const refs = await getCrmReferenceData(context);
  if (kind === "follow-ups") {
    const followUps = await prisma.crmFollowUp.findMany({
      where: { tenantId: context.tenantId, status: { in: ["PENDING", "OVERDUE"] }, ...followUpScope(context) },
      orderBy: { dueAt: "asc" },
      take: 500,
    });
    const leads = await leadsForIds(context.tenantId, followUps.map((item) => item.leadId));
    return { followUps, leads, ...refs };
  }
  const visits = await prisma.crmVisit.findMany({ where: { tenantId: context.tenantId, ...visitScope(context) }, orderBy: { scheduledAt: "desc" }, take: 500 });
  const leads = await leadsForIds(context.tenantId, visits.map((item) => item.leadId));
  return { visits, leads, ...refs };
}

export async function getCrmReports(context: RequestContext) {
  if (!hasPermission(context.role, "crm.reports", context.permissions)) forbidden("CRM reports are not available for this role.");
  const [dashboard, leads, bookings, activities, feedback, users] = await Promise.all([
    getCrmDashboard(context),
    prisma.crmLead.findMany({ where: { tenantId: context.tenantId, archivedAt: null } }),
    prisma.crmBooking.findMany({ where: { tenantId: context.tenantId, status: "CONFIRMED" } }),
    prisma.crmActivity.findMany({ where: { tenantId: context.tenantId }, select: { actorUserId: true, type: true } }),
    prisma.crmFeedback.findMany({ where: { tenantId: context.tenantId } }),
    prisma.user.findMany({ where: { tenantId: context.tenantId }, select: { id: true, name: true } }),
  ]);
  const employee = users.map((user) => {
    const assigned = leads.filter((lead) => lead.assignedCallerId === user.id || lead.assignedSalespersonId === user.id);
    const userActivities = activities.filter((activity) => activity.actorUserId === user.id);
    const completedVisits = userActivities.filter((activity) => activity.type === "VISIT_COMPLETED").length;
    const booked = assigned.filter((lead) => ["BOOKED", "CUSTOMER"].includes(lead.status)).length;
    return {
      name: user.name,
      leads: assigned.length,
      calls: userActivities.filter((activity) => ["INCOMING_CALL", "OUTGOING_CALL"].includes(activity.type)).length,
      visits: completedVisits,
      bookings: booked,
      conversion: assigned.length ? Math.round((booked / assigned.length) * 100) : 0,
    };
  }).filter((row) => row.leads || row.calls || row.visits || row.bookings).sort((a, b) => b.bookings - a.bookings || b.leads - a.leads);
  return {
    ...dashboard,
    totals: { leads: leads.length, bookings: bookings.length, revenue: bookings.reduce((sum, item) => sum + Number(item.amountInr ?? 0), 0), averageFeedback: feedback.length ? feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length : 0 },
    employee,
  };
}

export async function listCrmSettings(context: RequestContext) {
  if (!hasPermission(context.role, "crm.assign", context.permissions)) forbidden("Only CRM management can change CRM settings.");
  const [references, automations] = await Promise.all([
    getCrmReferenceData(context),
    prisma.crmAutomationRule.findMany({ where: { tenantId: context.tenantId }, orderBy: { createdAt: "desc" } }),
  ]);
  return { ...references, automations };
}

export async function createCrmSetting(context: RequestContext, input: z.infer<typeof crmSettingSchema>) {
  if (!hasPermission(context.role, "crm.assign", context.permissions)) forbidden("Only CRM management can change CRM settings.");
  let result: { id: string };
  if (input.resource === "source") {
    result = await prisma.crmLeadSource.create({ data: { tenantId: context.tenantId, name: input.name, key: await uniqueKey("source", context.tenantId, input.name) } });
  } else if (input.resource === "campaign") {
    result = await prisma.crmCampaign.create({ data: { tenantId: context.tenantId, name: input.name, sourceId: input.sourceId || null, projectId: input.projectId || null, spendInr: money(input.spendInr), startedAt: date(input.startedAt), endedAt: date(input.endedAt), notes: input.notes || null } });
  } else if (input.resource === "template") {
    result = await prisma.crmCommunicationTemplate.create({ data: { tenantId: context.tenantId, name: input.name, key: await uniqueKey("template", context.tenantId, input.name), channel: input.channel, subject: input.subject || null, body: input.body } });
  } else {
    result = await prisma.crmAutomationRule.create({ data: { tenantId: context.tenantId, name: input.name, trigger: input.trigger, actions: { description: input.actions } } });
  }
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: `Crm${title(input.resource)}`, entityId: result.id, after: result as Prisma.InputJsonValue });
  return result;
}

export async function updateCrmSetting(context: RequestContext, resource: string, id: string, input: z.infer<typeof updateCrmSettingSchema>) {
  if (!hasPermission(context.role, "crm.assign", context.permissions)) forbidden("Only CRM management can change CRM settings.");
  let result: { id: string };
  if (resource === "source") {
    result = await prisma.crmLeadSource.update({ where: { id, tenantId: context.tenantId }, data: { name: input.name, active: input.active } });
  } else if (resource === "campaign") {
    result = await prisma.crmCampaign.update({ where: { id, tenantId: context.tenantId }, data: { name: input.name, notes: nullable(input.notes) } });
  } else if (resource === "template") {
    result = await prisma.crmCommunicationTemplate.update({ where: { id, tenantId: context.tenantId }, data: { name: input.name, active: input.active, subject: nullable(input.subject), body: input.body ?? undefined } });
  } else if (resource === "automation") {
    result = await prisma.crmAutomationRule.update({ where: { id, tenantId: context.tenantId }, data: { name: input.name, active: input.active, trigger: input.trigger ?? undefined, actions: input.actions === undefined ? undefined : { description: input.actions } } });
  } else badRequest("Unknown CRM setting type.");
  await writeAuditEvent(context, { action: AuditAction.UPDATE, entityType: `Crm${title(resource)}`, entityId: id, after: input as Prisma.InputJsonValue });
  return result;
}

export async function archiveCrmSetting(context: RequestContext, resource: string, id: string) {
  if (!hasPermission(context.role, "crm.assign", context.permissions)) forbidden("Only CRM management can change CRM settings.");
  if (resource === "source") await prisma.crmLeadSource.update({ where: { id, tenantId: context.tenantId }, data: { active: false, archivedAt: new Date() } });
  else if (resource === "campaign") await prisma.crmCampaign.update({ where: { id, tenantId: context.tenantId }, data: { archivedAt: new Date() } });
  else if (resource === "template") await prisma.crmCommunicationTemplate.update({ where: { id, tenantId: context.tenantId }, data: { active: false } });
  else if (resource === "automation") await prisma.crmAutomationRule.update({ where: { id, tenantId: context.tenantId }, data: { active: false } });
  else badRequest("Unknown CRM setting type.");
  await writeAuditEvent(context, { action: AuditAction.DELETE, entityType: `Crm${title(resource)}`, entityId: id, after: { archived: true } });
  return { id };
}

async function assignLead(context: RequestContext, lead: Awaited<ReturnType<typeof requireEditableLead>>, input: Extract<z.infer<typeof crmLeadActionSchema>, { action: "assign" }>) {
  assertCanAssign(context);
  await validateUsers(context.tenantId, [input.callerId, input.salespersonId]);
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.crmLead.update({ where: { id: lead.id }, data: { assignedCallerId: input.callerId || null, assignedSalespersonId: input.salespersonId || null } });
    await createAssignmentRows(tx, context, lead.id, lead.assignedCallerId, input.callerId, lead.assignedSalespersonId, input.salespersonId, input.reason);
    await tx.crmActivity.create({ data: activityData(context, lead.id, CrmActivityType.ASSIGNED, "Lead assignment updated", input.reason, { callerId: input.callerId, salespersonId: input.salespersonId }) });
    return result;
  });
  await writeAuditEvent(context, { action: AuditAction.ASSIGN, entityType: "CrmLead", entityId: lead.id, before: lead as unknown as Prisma.InputJsonValue, after: updated as unknown as Prisma.InputJsonValue });
  await notifyAssignees(context, updated, "CRM lead assigned", `${updated.name} (${updated.leadCode}) has been assigned to you.`);
  return updated;
}

async function recordActivity(context: RequestContext, lead: Awaited<ReturnType<typeof requireEditableLead>>, input: Extract<z.infer<typeof crmLeadActionSchema>, { action: "activity" }>) {
  if (input.nextAction !== "No further action" && !input.nextFollowUpAt) badRequest("Select the date and time for the next action.");
  const type = CrmActivityType[input.type];
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const activity = await tx.crmActivity.create({
      data: { tenantId: context.tenantId, leadId: lead.id, type, title: label(input.type), notes: input.notes, outcome: input.outcome, durationSeconds: input.durationMinutes ? Math.round(input.durationMinutes * 60) : null, metadata: { nextAction: input.nextAction }, actorUserId: context.userId },
    });
    if (input.nextFollowUpAt) {
      await tx.crmFollowUp.create({ data: { tenantId: context.tenantId, leadId: lead.id, actionType: input.nextAction, reason: input.outcome, dueAt: new Date(input.nextFollowUpAt), assignedToId: lead.assignedSalespersonId || lead.assignedCallerId || context.userId, createdById: context.userId } });
    }
    const status = input.status ?? deriveStatus(input.outcome, lead.status);
    await tx.crmLead.update({ where: { id: lead.id }, data: { status, potential: input.potential, lastContactAt: now, nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null, score: calculateScore({ ...lead, status, potential: input.potential ?? lead.potential }) } });
    return activity;
  });
  await writeAuditEvent(context, { action: AuditAction.UPDATE, entityType: "CrmLead", entityId: lead.id, after: { activityId: result.id, type: result.type, outcome: result.outcome } });
  return result;
}

async function createFollowUp(context: RequestContext, lead: Awaited<ReturnType<typeof requireEditableLead>>, input: Extract<z.infer<typeof crmLeadActionSchema>, { action: "follow_up" }>) {
  await validateUsers(context.tenantId, [input.assignedToId]);
  const followUp = await prisma.$transaction(async (tx) => {
    const created = await tx.crmFollowUp.create({ data: { tenantId: context.tenantId, leadId: lead.id, actionType: input.actionType, reason: input.reason || null, dueAt: new Date(input.dueAt), assignedToId: input.assignedToId || lead.assignedSalespersonId || lead.assignedCallerId || context.userId, createdById: context.userId } });
    await tx.crmLead.update({ where: { id: lead.id }, data: { nextFollowUpAt: created.dueAt, status: CrmLeadStatus.FOLLOW_UP_REQUIRED } });
    await tx.crmActivity.create({ data: activityData(context, lead.id, CrmActivityType.FOLLOW_UP_CREATED, `Follow-up: ${created.actionType}`, created.reason, { followUpId: created.id, dueAt: created.dueAt.toISOString() }) });
    return created;
  });
  if (followUp.assignedToId && followUp.assignedToId !== context.userId) await createNotification(context, { userId: followUp.assignedToId, title: "CRM follow-up assigned", body: `${lead.name}: ${followUp.actionType}`, data: { leadId: lead.id, followUpId: followUp.id } });
  return followUp;
}

async function completeFollowUp(context: RequestContext, lead: Awaited<ReturnType<typeof requireEditableLead>>, input: Extract<z.infer<typeof crmLeadActionSchema>, { action: "complete_follow_up" }>) {
  const followUp = await prisma.crmFollowUp.findFirstOrThrow({ where: { id: input.followUpId, tenantId: context.tenantId, leadId: lead.id, status: { in: ["PENDING", "OVERDUE"] } } });
  if (input.nextAction !== "No further action" && !input.nextFollowUpAt) badRequest("Select a date and time for the next action.");
  return prisma.$transaction(async (tx) => {
    const completed = await tx.crmFollowUp.update({ where: { id: followUp.id }, data: { status: CrmFollowUpStatus.COMPLETED, outcome: input.outcome, completedAt: new Date(), completedById: context.userId } });
    let nextId: string | null = null;
    if (input.nextFollowUpAt) {
      const next = await tx.crmFollowUp.create({ data: { tenantId: context.tenantId, leadId: lead.id, actionType: input.nextAction, reason: input.outcome, dueAt: new Date(input.nextFollowUpAt), assignedToId: followUp.assignedToId || context.userId, rescheduledFromId: followUp.id, createdById: context.userId } });
      nextId = next.id;
    }
    await tx.crmLead.update({ where: { id: lead.id }, data: { status: input.status ?? lead.status, nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null, lastContactAt: new Date() } });
    await tx.crmActivity.create({ data: activityData(context, lead.id, CrmActivityType.FOLLOW_UP_COMPLETED, `Follow-up completed: ${followUp.actionType}`, input.outcome, { followUpId: followUp.id, nextFollowUpId: nextId }) });
    return completed;
  });
}

async function scheduleVisit(context: RequestContext, lead: Awaited<ReturnType<typeof requireEditableLead>>, input: Extract<z.infer<typeof crmLeadActionSchema>, { action: "visit" }>) {
  await prisma.project.findFirstOrThrow({ where: { id: input.projectId, tenantId: context.tenantId } });
  await validateUsers(context.tenantId, [input.preferredSalespersonId, input.assignedSalespersonId]);
  const visit = await prisma.$transaction(async (tx) => {
    const visitCode = await nextCode(tx, context.tenantId, "visit", "VIS");
    const created = await tx.crmVisit.create({ data: { tenantId: context.tenantId, visitCode, leadId: lead.id, projectId: input.projectId, scheduledAt: new Date(input.scheduledAt), visitorCount: input.visitorCount, preferredSalespersonId: input.preferredSalespersonId || null, assignedSalespersonId: input.assignedSalespersonId || lead.assignedSalespersonId || null, pickupRequired: input.pickupRequired, specialRequirements: input.specialRequirements || null, createdById: context.userId } });
    await tx.crmLead.update({ where: { id: lead.id }, data: { status: CrmLeadStatus.VISIT_SCHEDULED, interestedProjectId: input.projectId, assignedSalespersonId: created.assignedSalespersonId, nextFollowUpAt: created.scheduledAt, score: calculateScore({ ...lead, status: CrmLeadStatus.VISIT_SCHEDULED, interestedProjectId: input.projectId }) } });
    await tx.crmActivity.create({ data: activityData(context, lead.id, CrmActivityType.VISIT_SCHEDULED, `Visit ${visitCode} scheduled`, input.specialRequirements, { visitId: created.id, scheduledAt: created.scheduledAt.toISOString(), projectId: created.projectId }) });
    return created;
  });
  if (visit.assignedSalespersonId) await createNotification(context, { userId: visit.assignedSalespersonId, title: "Site visit assigned", body: `${lead.name} is scheduled to visit.`, data: { leadId: lead.id, visitId: visit.id } });
  return visit;
}

async function updateVisit(context: RequestContext, lead: Awaited<ReturnType<typeof requireEditableLead>>, input: Extract<z.infer<typeof crmLeadActionSchema>, { action: "update_visit" }>) {
  const visit = await prisma.crmVisit.findFirstOrThrow({ where: { id: input.visitId, tenantId: context.tenantId, leadId: lead.id } });
  if (!canSeeAll(context) && visit.assignedSalespersonId && visit.assignedSalespersonId !== context.userId) forbidden("This visit is assigned to another salesperson.");
  const completed = input.status === CrmVisitStatus.VISITED;
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.crmVisit.update({ where: { id: visit.id }, data: { status: input.status, checkedInAt: completed ? visit.checkedInAt ?? new Date() : undefined, completedAt: completed ? new Date() : null, customerResponse: input.customerResponse || null, propertiesShown: input.propertiesShown, propertiesLiked: input.propertiesLiked, budgetConfirmedInr: money(input.budgetConfirmedInr), objections: input.objections || null, purchaseProbability: input.purchaseProbability, customerNextAction: input.customerNextAction || null, salespersonNextAction: input.salespersonNextAction || null, nextFollowUpAt: date(input.nextFollowUpAt) } });
    const leadStatus = completed ? CrmLeadStatus.VISIT_COMPLETED : input.status === CrmVisitStatus.CANCELLED ? CrmLeadStatus.FOLLOW_UP_REQUIRED : lead.status;
    await tx.crmLead.update({ where: { id: lead.id }, data: { status: leadStatus, nextFollowUpAt: date(input.nextFollowUpAt), score: calculateScore({ ...lead, status: leadStatus }) } });
    if (input.nextFollowUpAt) await tx.crmFollowUp.create({ data: { tenantId: context.tenantId, leadId: lead.id, actionType: input.salespersonNextAction || "Post-visit follow-up", reason: input.customerResponse || null, dueAt: new Date(input.nextFollowUpAt), assignedToId: visit.assignedSalespersonId || context.userId, createdById: context.userId } });
    await tx.crmActivity.create({ data: activityData(context, lead.id, completed ? CrmActivityType.VISIT_COMPLETED : input.status === CrmVisitStatus.CANCELLED ? CrmActivityType.VISIT_CANCELLED : CrmActivityType.VISIT_SCHEDULED, `Visit ${label(input.status)}`, input.customerResponse, { visitId: visit.id, propertiesShown: input.propertiesShown, propertiesLiked: input.propertiesLiked, purchaseProbability: input.purchaseProbability }) });
    return result;
  });
  if (completed) await notifyRoleWithPermission(context, "crm.assign", { title: "Site visit completed", body: `${lead.name}'s visit is ready for review.`, data: { leadId: lead.id, visitId: visit.id }, excludeUserId: context.userId });
  return updated;
}

async function addFeedback(context: RequestContext, lead: Awaited<ReturnType<typeof requireEditableLead>>, input: Extract<z.infer<typeof crmLeadActionSchema>, { action: "feedback" }>) {
  if (input.visitId) await prisma.crmVisit.findFirstOrThrow({ where: { id: input.visitId, tenantId: context.tenantId, leadId: lead.id } });
  const feedback = await prisma.crmFeedback.create({ data: { tenantId: context.tenantId, leadId: lead.id, visitId: input.visitId || null, projectId: lead.interestedProjectId, rating: input.rating, comments: input.comments || null, createdById: context.userId } });
  await prisma.crmActivity.create({ data: activityData(context, lead.id, CrmActivityType.FEEDBACK_RECEIVED, `${input.rating}/5 feedback received`, input.comments, { feedbackId: feedback.id }) });
  return feedback;
}

async function createBooking(context: RequestContext, lead: Awaited<ReturnType<typeof requireEditableLead>>, input: Extract<z.infer<typeof crmLeadActionSchema>, { action: "booking" }>) {
  const project = await prisma.project.findFirstOrThrow({ where: { id: input.projectId, tenantId: context.tenantId } });
  if (input.plotId) await prisma.plot.findFirstOrThrow({ where: { id: input.plotId, tenantId: context.tenantId, projectId: project.id, archivedAt: null, status: { in: ["COMPANY_OWNED", "HOLD"] } } });
  const booking = await prisma.$transaction(async (tx) => {
    const bookingCode = await nextCode(tx, context.tenantId, "booking", "BOOK");
    const created = await tx.crmBooking.create({ data: { tenantId: context.tenantId, bookingCode, leadId: lead.id, projectId: project.id, plotId: input.plotId || null, amountInr: money(input.amountInr), status: "CONFIRMED", notes: input.notes || null, createdById: context.userId } });
    await tx.crmLead.update({ where: { id: lead.id }, data: { status: CrmLeadStatus.BOOKED, interestedProjectId: project.id, nextFollowUpAt: null, score: calculateScore({ ...lead, status: CrmLeadStatus.BOOKED }) } });
    await tx.crmActivity.create({ data: activityData(context, lead.id, CrmActivityType.BOOKING_CREATED, `Booking ${bookingCode} confirmed`, input.notes, { bookingId: created.id, projectId: project.id, plotId: input.plotId, amountInr: input.amountInr }) });
    return created;
  });
  await notifyRoleWithPermission(context, "documents.generate", { title: "CRM booking ready for allotment", body: `${lead.name} booked in ${project.name}.`, data: { leadId: lead.id, bookingId: booking.id, projectId: project.id, plotId: booking.plotId }, excludeUserId: context.userId });
  return { ...booking, allotmentUrl: booking.plotId ? `/app/projects/${project.id}/ownership/new-allotment?plotId=${booking.plotId}&crmLeadId=${lead.id}` : null };
}

async function createTicket(context: RequestContext, lead: Awaited<ReturnType<typeof requireEditableLead>>, input: Extract<z.infer<typeof crmLeadActionSchema>, { action: "ticket" }>) {
  const ticket = await prisma.$transaction(async (tx) => {
    const ticketCode = await nextCode(tx, context.tenantId, "ticket", "TKT");
    const created = await tx.crmTicket.create({ data: { tenantId: context.tenantId, ticketCode, leadId: lead.id, category: input.category, subject: input.subject, description: input.description || null, assignedToId: input.assignedToId || null, createdById: context.userId } });
    await tx.crmActivity.create({ data: activityData(context, lead.id, CrmActivityType.TICKET_CREATED, `Ticket ${ticketCode}: ${input.subject}`, input.description, { ticketId: created.id, category: input.category }) });
    return created;
  });
  if (ticket.assignedToId) await createNotification(context, { userId: ticket.assignedToId, title: "Customer ticket assigned", body: `${ticket.ticketCode}: ${ticket.subject}`, data: { leadId: lead.id, ticketId: ticket.id } });
  return ticket;
}

async function archiveLead(context: RequestContext, lead: Awaited<ReturnType<typeof requireEditableLead>>, reason: string) {
  assertCanAssign(context);
  const archived = await prisma.crmLead.update({ where: { id: lead.id }, data: { archivedAt: new Date(), archivedById: context.userId, archiveReason: reason } });
  await writeAuditEvent(context, { action: AuditAction.DELETE, entityType: "CrmLead", entityId: lead.id, before: lead as unknown as Prisma.InputJsonValue, after: { archived: true, reason } });
  return archived;
}

async function requireEditableLead(context: RequestContext, leadId: string) {
  return prisma.crmLead.findFirstOrThrow({ where: { id: leadId, tenantId: context.tenantId, archivedAt: null, ...leadScope(context) } });
}

function leadScope(context: RequestContext): Prisma.CrmLeadWhereInput {
  if (canSeeAll(context)) return {};
  return { OR: [{ assignedCallerId: context.userId }, { assignedSalespersonId: context.userId }, { createdById: context.userId }] };
}

function followUpScope(context: RequestContext): Prisma.CrmFollowUpWhereInput {
  return canSeeAll(context) ? {} : { assignedToId: context.userId };
}

function visitScope(context: RequestContext): Prisma.CrmVisitWhereInput {
  return canSeeAll(context) ? {} : { OR: [{ assignedSalespersonId: context.userId }, { createdById: context.userId }] };
}

function canSeeAll(context: RequestContext) {
  return hasPermission(context.role, "crm.assign", context.permissions) || hasPermission(context.role, "crm.reports", context.permissions);
}

function assertCanAssign(context: RequestContext) {
  if (!hasPermission(context.role, "crm.assign", context.permissions)) forbidden("Only CRM management can assign, merge or archive leads.");
}

async function validateLeadReferences(context: RequestContext, input: Partial<z.infer<typeof createCrmLeadSchema>>) {
  await Promise.all([
    input.sourceId ? prisma.crmLeadSource.findFirstOrThrow({ where: { id: input.sourceId, tenantId: context.tenantId, archivedAt: null } }) : null,
    input.campaignId ? prisma.crmCampaign.findFirstOrThrow({ where: { id: input.campaignId, tenantId: context.tenantId, archivedAt: null } }) : null,
    input.interestedProjectId ? prisma.project.findFirstOrThrow({ where: { id: input.interestedProjectId, tenantId: context.tenantId } }) : null,
    input.referredByLeadId ? prisma.crmLead.findFirstOrThrow({ where: { id: input.referredByLeadId, tenantId: context.tenantId, archivedAt: null } }) : null,
    validateUsers(context.tenantId, [input.assignedCallerId, input.assignedSalespersonId]),
  ]);
}

async function validateUsers(tenantId: string, ids: Array<string | null | undefined>) {
  const values = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (!values.length) return;
  const count = await prisma.user.count({ where: { tenantId, id: { in: values }, status: "ACTIVE" } });
  if (count !== values.length) badRequest("One of the selected employees is not active in this firm.");
}

function leadData(context: RequestContext, input: z.infer<typeof createCrmLeadSchema>, leadCode: string): Prisma.CrmLeadUncheckedCreateInput {
  const primary = normalizePhone(input.primaryPhone);
  return {
    tenantId: context.tenantId,
    leadCode,
    name: input.name,
    primaryPhone: input.primaryPhone,
    primaryPhoneNormalized: primary,
    alternatePhone: input.alternatePhone || null,
    alternatePhoneNormalized: input.alternatePhone ? normalizePhone(input.alternatePhone) : null,
    whatsappPhone: input.whatsappPhone || null,
    whatsappPhoneNormalized: input.whatsappPhone ? normalizePhone(input.whatsappPhone) : null,
    email: input.email?.toLowerCase() || null,
    city: input.city || null,
    area: input.area || null,
    sourceId: input.sourceId || null,
    campaignId: input.campaignId || null,
    firstEnquiryAt: input.firstEnquiryAt ? new Date(input.firstEnquiryAt) : new Date(),
    interestedProjectId: input.interestedProjectId || null,
    propertyType: input.propertyType || null,
    interestedProperty: input.interestedProperty || null,
    budgetMinInr: money(input.budgetMinInr),
    budgetMaxInr: money(input.budgetMaxInr),
    purchaseTimeline: input.purchaseTimeline || null,
    purpose: input.purpose || null,
    previousWork: input.previousWork || null,
    existingCustomer: input.existingCustomer,
    previousInteraction: input.previousInteraction || null,
    preferredLanguage: input.preferredLanguage || null,
    preferredContactMethod: input.preferredContactMethod || null,
    assignedCallerId: input.assignedCallerId || context.userId,
    assignedSalespersonId: input.assignedSalespersonId || null,
    notes: input.notes || null,
    tags: input.tags,
    qualification: (input.qualification ?? {}) as Prisma.InputJsonValue,
    referredByLeadId: input.referredByLeadId || null,
    consentWhatsApp: input.consentWhatsApp,
    consentSms: input.consentSms,
    consentEmail: input.consentEmail,
    score: calculateScore(input),
    createdById: context.userId,
  };
}

function plainLeadUpdate(input: z.infer<typeof updateCrmLeadSchema>): Prisma.CrmLeadUpdateInput {
  return {
    name: input.name,
    primaryPhone: input.primaryPhone,
    primaryPhoneNormalized: input.primaryPhone ? normalizePhone(input.primaryPhone) : undefined,
    alternatePhone: input.alternatePhone === undefined ? undefined : input.alternatePhone || null,
    alternatePhoneNormalized: input.alternatePhone === undefined ? undefined : input.alternatePhone ? normalizePhone(input.alternatePhone) : null,
    whatsappPhone: input.whatsappPhone === undefined ? undefined : input.whatsappPhone || null,
    whatsappPhoneNormalized: input.whatsappPhone === undefined ? undefined : input.whatsappPhone ? normalizePhone(input.whatsappPhone) : null,
    email: input.email === undefined ? undefined : input.email?.toLowerCase() || null,
    city: nullable(input.city), area: nullable(input.area), campaignId: nullable(input.campaignId),
    status: input.status, potential: input.potential, interestedProjectId: nullable(input.interestedProjectId), propertyType: nullable(input.propertyType),
    interestedProperty: nullable(input.interestedProperty), budgetMinInr: input.budgetMinInr === undefined ? undefined : money(input.budgetMinInr),
    budgetMaxInr: input.budgetMaxInr === undefined ? undefined : money(input.budgetMaxInr), purchaseTimeline: nullable(input.purchaseTimeline), purpose: nullable(input.purpose),
    previousWork: nullable(input.previousWork), existingCustomer: input.existingCustomer, previousInteraction: nullable(input.previousInteraction),
    preferredLanguage: nullable(input.preferredLanguage), preferredContactMethod: nullable(input.preferredContactMethod), notes: nullable(input.notes),
    tags: input.tags, qualification: input.qualification as Prisma.InputJsonValue | undefined, referredByLeadId: nullable(input.referredByLeadId),
    consentWhatsApp: input.consentWhatsApp, consentSms: input.consentSms, consentEmail: input.consentEmail,
  };
}

async function findDuplicateLead(tenantId: string, phones: string[], email?: string | null, excludeId?: string) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!phones.length && !normalizedEmail) return null;
  return prisma.crmLead.findFirst({
    where: {
      tenantId,
      archivedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        ...(phones.length ? [
          { primaryPhoneNormalized: { in: phones } },
          { alternatePhoneNormalized: { in: phones } },
          { whatsappPhoneNormalized: { in: phones } },
        ] : []),
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ],
    },
    select: { id: true, leadCode: true, name: true },
  });
}

function phoneCandidates(input: { primaryPhone: string; alternatePhone?: string | null; whatsappPhone?: string | null }) {
  return [...new Set([input.primaryPhone, input.alternatePhone, input.whatsappPhone].filter((value): value is string => Boolean(value)).map(normalizePhone).filter(Boolean))];
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) return digits.slice(-10);
  return digits;
}

async function nextCode(tx: Prisma.TransactionClient, tenantId: string, key: string, prefix: string) {
  const sequence = await tx.crmSequence.upsert({
    where: { tenantId_key: { tenantId, key } },
    create: { tenantId, key, nextValue: 2 },
    update: { nextValue: { increment: 1 } },
    select: { nextValue: true },
  });
  return `${prefix}-${new Date().getFullYear()}-${String(sequence.nextValue - 1).padStart(5, "0")}`;
}

async function createAssignmentRows(
  tx: Prisma.TransactionClient,
  context: RequestContext,
  leadId: string,
  oldCaller?: string | null,
  newCaller?: string | null,
  oldSalesperson?: string | null,
  newSalesperson?: string | null,
  reason?: string,
) {
  const rows: Prisma.CrmLeadAssignmentCreateManyInput[] = [];
  if (oldCaller !== newCaller) rows.push({ tenantId: context.tenantId, leadId, assignmentType: "CALLER", previousUserId: oldCaller || null, assignedUserId: newCaller || null, reason: reason || null, assignedById: context.userId });
  if (oldSalesperson !== newSalesperson) rows.push({ tenantId: context.tenantId, leadId, assignmentType: "SALESPERSON", previousUserId: oldSalesperson || null, assignedUserId: newSalesperson || null, reason: reason || null, assignedById: context.userId });
  if (rows.length) await tx.crmLeadAssignment.createMany({ data: rows });
}

async function notifyAssignees(context: RequestContext, lead: { id: string; assignedCallerId: string | null; assignedSalespersonId: string | null }, titleText: string, body: string) {
  const users = [...new Set([lead.assignedCallerId, lead.assignedSalespersonId].filter((id): id is string => Boolean(id) && id !== context.userId))];
  await Promise.all(users.map((userId) => createNotification(context, { userId, title: titleText, body, data: { leadId: lead.id } })));
}

function activityData(context: RequestContext, leadId: string, type: CrmActivityType, titleText: string, notes?: string | null, metadata?: Record<string, unknown>): Prisma.CrmActivityUncheckedCreateInput {
  return { tenantId: context.tenantId, leadId, type, title: titleText, notes: notes || null, metadata: (metadata ?? {}) as Prisma.InputJsonValue, actorUserId: context.userId };
}

function calculateScore(value: Record<string, unknown>) {
  let score = 10;
  if (value.interestedProjectId) score += 10;
  if (value.budgetMinInr || value.budgetMaxInr) score += 10;
  const status = String(value.status ?? "NEW");
  if (["VISIT_PROPOSED", "VISIT_SCHEDULED"].includes(status)) score += 20;
  if (status === "VISIT_COMPLETED") score += 25;
  if (status === "NEGOTIATION") score += 30;
  if (["BOOKING_PENDING", "BOOKED", "CUSTOMER"].includes(status)) score += 40;
  return Math.min(score, 100);
}

function deriveStatus(outcome: string, current: CrmLeadStatus) {
  const text = outcome.toLowerCase();
  if (text.includes("not interested")) return CrmLeadStatus.NOT_INTERESTED;
  if (text.includes("wrong") || text.includes("invalid")) return CrmLeadStatus.INVALID;
  if (text.includes("visit scheduled")) return CrmLeadStatus.VISIT_SCHEDULED;
  if (text.includes("visit")) return CrmLeadStatus.VISIT_PROPOSED;
  if (text.includes("negotiat")) return CrmLeadStatus.NEGOTIATION;
  if (text.includes("booking")) return CrmLeadStatus.BOOKING_PENDING;
  if (current === CrmLeadStatus.NEW) return CrmLeadStatus.CONTACTED;
  return current;
}

function countBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<Record<string, number>>((result, item) => { const value = key(item); result[value] = (result[value] ?? 0) + 1; return result; }, {});
}

function sumStatuses(counts: Record<string, number>, statuses: string[]) {
  return statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
}

function startOfDay(value: Date) {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function money(value: string | number | null | undefined) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) badRequest("Enter a valid non-negative amount.");
  return new Prisma.Decimal(parsed);
}

function date(value: string | null | undefined) {
  return value ? new Date(value) : value === null ? null : undefined;
}

function nullable(value: string | null | undefined) {
  return value === undefined ? undefined : value || null;
}

function label(value: string) {
  return value.toLowerCase().split("_").map(title).join(" ");
}

function title(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";
}

async function uniqueKey(type: "source" | "template", tenantId: string, value: string) {
  const root = slug(value);
  let key = root;
  let suffix = 2;
  while (type === "source"
    ? await prisma.crmLeadSource.findUnique({ where: { tenantId_key: { tenantId, key } }, select: { id: true } })
    : await prisma.crmCommunicationTemplate.findUnique({ where: { tenantId_key: { tenantId, key } }, select: { id: true } })) key = `${root}_${suffix++}`;
  return key;
}

async function leadsForIds(tenantId: string, ids: string[]) {
  const values = [...new Set(ids)];
  return values.length ? prisma.crmLead.findMany({ where: { tenantId, id: { in: values } }, select: { id: true, leadCode: true, name: true, primaryPhone: true, status: true, potential: true, interestedProjectId: true } }) : [];
}

function badRequest(message: string): never {
  const error = new Error(message);
  error.name = "BadRequestError";
  throw error;
}

function forbidden(message: string): never {
  const error = new Error(message);
  error.name = "ForbiddenError";
  throw error;
}
