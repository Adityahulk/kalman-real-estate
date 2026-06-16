import { AuditAction, Prisma } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { ambeyAllotmentTemplate, transferLetterTemplate, registryStatusLetterTemplate } from "./letter-templates";

export const saveProjectLetterTemplateSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(["allotment_letter", "transfer_letter", "registry_status_letter"]).default("allotment_letter"),
  body: z.string().min(20).optional(),
});

export function defaultLetterBody(type: string): string {
  if (type === "transfer_letter") return transferLetterTemplate();
  if (type === "registry_status_letter") return registryStatusLetterTemplate();
  return ambeyAllotmentTemplate();
}

export async function saveProjectLetterTemplate(context: RequestContext, projectId: string, input: z.infer<typeof saveProjectLetterTemplateSchema>) {
  await prisma.project.findFirstOrThrow({ where: { id: projectId, tenantId: context.tenantId } });
  const body = input.body?.trim() || defaultLetterBody(input.type);
  await prisma.documentTemplate.updateMany({
    where: { tenantId: context.tenantId, projectId, type: input.type, active: true },
    data: { active: false },
  });
  const template = await prisma.documentTemplate.create({
    data: {
      tenantId: context.tenantId,
      projectId,
      name: input.name,
      type: input.type,
      body,
      active: true,
    },
  });
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "DocumentTemplate", entityId: template.id, after: template as unknown as Prisma.InputJsonValue });
  return template;
}

export async function deleteProjectLetterTemplate(context: RequestContext, id: string) {
  const template = await prisma.documentTemplate.findFirstOrThrow({ where: { id, tenantId: context.tenantId } });
  const deleted = await prisma.documentTemplate.delete({ where: { id } });
  await writeAuditEvent(context, { action: AuditAction.DELETE, entityType: "DocumentTemplate", entityId: id, before: template as unknown as Prisma.InputJsonValue });
  return deleted;
}

const templateFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(100),
  sourceText: z.string().min(1).max(500).optional(),
  key: z.string().min(1).max(100),
  mapping: z.string().max(120).nullable(),
});

export function templateFields(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const result = z.array(templateFieldSchema).safeParse((value as Record<string, unknown>).fields);
  return result.success ? result.data : [];
}

export async function activateTemplate(context: RequestContext, projectId: string, templateId: string) {
  const template = await prisma.documentTemplate.findFirstOrThrow({
    where: { id: templateId, projectId, tenantId: context.tenantId },
  });
  return prisma.$transaction(async (tx) => {
    await tx.documentTemplate.updateMany({
      where: { tenantId: context.tenantId, projectId, type: template.type, active: true },
      data: { active: false },
    });
    return tx.documentTemplate.update({ where: { id: template.id }, data: { active: true } });
  });
}
