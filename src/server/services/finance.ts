import { AuditAction, Prisma } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { createNotification } from "./notifications";

export const boqSchema = z.object({
  projectId: z.string(),
  code: z.string().min(1),
  description: z.string().min(2),
  unit: z.string().min(1),
  plannedQty: z.number().nonnegative(),
  plannedRateInr: z.number().nonnegative(),
  cadQuantity: z.number().nonnegative().optional(),
  consumedQty: z.number().nonnegative().optional(),
  category: z.string().min(1),
  cadEntityId: z.string().optional(),
});

export async function createBoqItem(context: RequestContext, input: z.infer<typeof boqSchema>) {
  const item = await prisma.bOQItem.create({
    data: { tenantId: context.tenantId, ...input },
  });
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "BOQItem", entityId: item.id, after: item });
  return item;
}

export const purchaseOrderSchema = z.object({
  projectId: z.string(),
  vendorId: z.string().optional(),
  number: z.string().min(1),
  status: z.string().default("DRAFT"),
  totalInr: z.number().nonnegative(),
  lineItems: z.array(z.record(z.unknown())).default([]),
});

export async function createPurchaseOrder(context: RequestContext, input: z.infer<typeof purchaseOrderSchema>) {
  const order = await prisma.purchaseOrder.create({
    data: {
      tenantId: context.tenantId,
      projectId: input.projectId,
      vendorId: input.vendorId,
      number: input.number,
      status: input.status,
      totalInr: input.totalInr,
      lineItems: input.lineItems as Prisma.InputJsonValue,
      createdById: context.userId === "seed-admin" ? undefined : context.userId,
    },
  });
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "PurchaseOrder", entityId: order.id, after: order });
  return order;
}

export const invoiceSchema = z.object({
  projectId: z.string(),
  vendorId: z.string().optional(),
  number: z.string().min(1),
  totalInr: z.number().nonnegative(),
  fileAssetId: z.string().optional(),
  dueAt: z.string().datetime().optional(),
});

export async function createInvoice(context: RequestContext, input: z.infer<typeof invoiceSchema>) {
  const invoice = await prisma.invoice.create({
    data: {
      tenantId: context.tenantId,
      projectId: input.projectId,
      vendorId: input.vendorId,
      number: input.number,
      totalInr: input.totalInr,
      fileAssetId: input.fileAssetId,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
    },
  });
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "Invoice", entityId: invoice.id, after: invoice });
  await createNotification(context, {
    title: "Invoice uploaded",
    body: `${invoice.number} for ₹${Number(invoice.totalInr).toLocaleString("en-IN")} is pending payment.`,
    data: { invoiceId: invoice.id, projectId: invoice.projectId },
  });
  return invoice;
}

export async function getVarianceReport(context: RequestContext, projectId?: string) {
  const where = { tenantId: context.tenantId, ...(projectId ? { projectId } : {}) };
  const boq = await prisma.bOQItem.findMany({ where, orderBy: { category: "asc" } });
  return boq.map((item) => {
    const plannedQty = Number(item.plannedQty);
    const consumedQty = Number(item.consumedQty ?? 0);
    const cadQuantity = item.cadQuantity ? Number(item.cadQuantity) : null;
    const plannedAmount = plannedQty * Number(item.plannedRateInr);
    const consumedAmount = consumedQty * Number(item.plannedRateInr);
    return {
      id: item.id,
      code: item.code,
      description: item.description,
      category: item.category,
      plannedQty,
      consumedQty,
      cadQuantity,
      plannedAmountInr: plannedAmount,
      consumedAmountInr: consumedAmount,
      quantityVariance: consumedQty - plannedQty,
      cadVariance: cadQuantity == null ? null : plannedQty - cadQuantity,
      costVarianceInr: consumedAmount - plannedAmount,
    };
  });
}

export const vendorSchema = z.object({
  name: z.string().min(2),
  type: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  gstin: z.string().optional(),
});

export async function createVendor(context: RequestContext, input: z.infer<typeof vendorSchema>) {
  const vendor = await prisma.vendor.create({ data: { tenantId: context.tenantId, ...input } });
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "Vendor", entityId: vendor.id, after: vendor });
  return vendor;
}

export const contractorSchema = z.object({
  name: z.string().min(2),
  trade: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export async function createContractor(context: RequestContext, input: z.infer<typeof contractorSchema>) {
  const contractor = await prisma.contractor.create({ data: { tenantId: context.tenantId, ...input } });
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "Contractor", entityId: contractor.id, after: contractor });
  return contractor;
}

export const paymentSchema = z.object({
  amountInr: z.number().positive(),
  paidAt: z.string().datetime().optional(),
  mode: z.string().min(1),
  reference: z.string().optional(),
});

export async function addInvoicePayment(context: RequestContext, invoiceId: string, input: z.infer<typeof paymentSchema>) {
  const invoice = await prisma.invoice.findFirstOrThrow({ where: { id: invoiceId, tenantId: context.tenantId }, include: { payments: true } });
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        tenantId: context.tenantId,
        invoiceId,
        amountInr: input.amountInr,
        paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
        mode: input.mode,
        reference: input.reference,
      },
    });
    const paidTotal = invoice.payments.reduce((sum, item) => sum + Number(item.amountInr), 0) + input.amountInr;
    const status = paidTotal >= Number(invoice.totalInr) ? "PAID" : paidTotal > 0 ? "PARTIAL" : "UNPAID";
    const updatedInvoice = await tx.invoice.update({ where: { id: invoiceId }, data: { paymentStatus: status } });
    return { payment, invoice: updatedInvoice };
  });
  await writeAuditEvent(context, { action: AuditAction.UPDATE, entityType: "Invoice", entityId: invoiceId, after: result });
  await createNotification(context, {
    title: "Invoice payment recorded",
    body: `Payment of ₹${input.amountInr.toLocaleString("en-IN")} recorded for ${invoice.number}.`,
    data: { invoiceId, paymentId: result.payment.id },
  });
  return result;
}
