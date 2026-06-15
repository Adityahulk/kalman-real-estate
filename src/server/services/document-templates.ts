import { AuditAction, Prisma } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { ambeyAllotmentTemplate, transferLetterTemplate, registryStatusLetterTemplate } from "./letter-templates";

const templateFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(100),
  sourceText: z.string().min(1).max(500).optional(),
  key: z.string().min(1).max(100),
  mapping: z.string().max(120).nullable(),
});

export const saveProjectLetterTemplateSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(["allotment_letter", "transfer_letter", "registry_status_letter"]).default("allotment_letter"),
  body: z.string().min(20).optional(),
  sourceFileId: z.string().optional(),
  fields: z.array(templateFieldSchema).default([]),
});

function defaultLetterBody(type: string): string {
  if (type === "transfer_letter") return transferLetterTemplate();
  if (type === "registry_status_letter") return registryStatusLetterTemplate();
  return ambeyAllotmentTemplate();
}

export async function saveProjectLetterTemplate(context: RequestContext, projectId: string, input: z.infer<typeof saveProjectLetterTemplateSchema>) {
  await prisma.project.findFirstOrThrow({ where: { id: projectId, tenantId: context.tenantId } });
  if (input.sourceFileId) await prisma.fileAsset.findFirstOrThrow({ where: { id: input.sourceFileId, tenantId: context.tenantId, deletedAt: null } });
  // When a PDF is the source (no custom HTML body provided), use the default letter template.
  // The PDF is used purely for visual field mapping, not as the body content.
  const body = input.body ?? defaultLetterBody(input.type);
  await prisma.documentTemplate.updateMany({
    where: { tenantId: context.tenantId, projectId, type: input.type, active: true },
    data: { active: false },
  });
  const template = await prisma.documentTemplate.create({
    data: {
      tenantId: context.tenantId,
      projectId,
      sourceFileId: input.sourceFileId,
      name: input.name,
      type: input.type,
      body,
      variables: { fields: input.fields } as Prisma.InputJsonValue,
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

export function templateFields(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const result = z.array(templateFieldSchema).safeParse((value as Record<string, unknown>).fields);
  return result.success ? result.data : [];
}
