import { AuditAction, Prisma } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { ambeyAllotmentTemplate, ambeyAllotmentJointTemplate, transferLetterTemplate, registryStatusLetterTemplate } from "./letter-templates";
import { letterSystemFields } from "@/lib/letter-system-fields";

export const saveProjectLetterTemplateSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(["allotment_letter", "transfer_letter", "registry_status_letter"]).default("allotment_letter"),
  body: z.string().min(20).optional(),
  variables: z.unknown().optional(),
});

export function defaultLetterBody(type: string): string {
  if (type === "transfer_letter") return transferLetterTemplate();
  if (type === "registry_status_letter") return registryStatusLetterTemplate();
  return ambeyAllotmentTemplate();
}

// Reserved name of the seeded joint/partnership allotment variant. It is stored INACTIVE so the
// one-active-template-per-type invariant (and therefore the default template pick) is untouched —
// drafts opt into it explicitly via data.templateVariant === "joint".
export const JOINT_ALLOTMENT_TEMPLATE_NAME = "Allotment Letter Joint default";

// Resolve the letter body for a joint-variant allotment draft: the project's (possibly
// user-customised) joint template if one exists, else the code default.
export async function jointAllotmentTemplateBody(tenantId: string, projectId: string): Promise<string> {
  const stored = await prisma.documentTemplate.findFirst({
    where: { tenantId, projectId, type: "allotment_letter", name: JOINT_ALLOTMENT_TEMPLATE_NAME },
    orderBy: { createdAt: "desc" },
    select: { body: true },
  });
  return stored?.body && stored.body.length > 100 ? stored.body : ambeyAllotmentJointTemplate();
}

export async function ensureProjectLetterTemplates(tenantId: string, projectId: string) {
  // Seed (and self-heal) the inactive joint allotment variant alongside the per-type defaults.
  const joint = await prisma.documentTemplate.findFirst({
    where: { tenantId, projectId, type: "allotment_letter", name: JOINT_ALLOTMENT_TEMPLATE_NAME },
    select: { id: true, body: true },
  });
  const jointBody = ambeyAllotmentJointTemplate();
  if (!joint) {
    await prisma.documentTemplate.create({
      data: {
        tenantId,
        projectId,
        name: JOINT_ALLOTMENT_TEMPLATE_NAME,
        type: "allotment_letter",
        body: jointBody,
        variables: { fields: [] } as Prisma.InputJsonValue,
        active: false,
      },
    });
  } else if (joint.body !== jointBody) {
    await prisma.documentTemplate.update({
      where: { id: joint.id },
      data: { body: jointBody, variables: { fields: [] } as Prisma.InputJsonValue },
    });
  }

  const types = ["allotment_letter", "transfer_letter", "registry_status_letter"] as const;
  for (const type of types) {
    const systemDefaultName = `${humanizeTemplateType(type)} default`;
    const existing = await prisma.documentTemplate.findFirst({
      where: { tenantId, projectId, type, active: true },
      select: { id: true, name: true, body: true },
    });
    const currentBody = defaultLetterBody(type);
    if (existing) {
      // Self-heal: a project's template body is frozen at the build that first created it, so
      // older projects keep stale HTML and render differently from newer ones. Refresh ONLY the
      // system default (identified by its reserved name) when the code's template has changed.
      // User-customized templates always carry a different, user-typed name and are left untouched.
      if (existing.name === systemDefaultName && existing.body !== currentBody) {
        await prisma.documentTemplate.update({
          where: { id: existing.id },
          data: { body: currentBody, variables: { fields: [] } as Prisma.InputJsonValue },
        });
      }
      continue;
    }
    await prisma.documentTemplate.create({
      data: {
        tenantId,
        projectId,
        name: systemDefaultName,
        type,
        body: currentBody,
        variables: { fields: [] } as Prisma.InputJsonValue,
        active: true,
      },
    });
  }
}

export async function saveProjectLetterTemplate(context: RequestContext, projectId: string, input: z.infer<typeof saveProjectLetterTemplateSchema>) {
  await prisma.project.findFirstOrThrow({ where: { id: projectId, tenantId: context.tenantId } });
  const body = input.body?.trim() || defaultLetterBody(input.type);
  const fieldDefinitions = await prisma.letterFieldDefinition.findMany({
    where: { category: { tenantId: context.tenantId } },
    select: { id: true, label: true, mapping: true },
  });
  const variables = input.variables ?? { fields: extractTemplateFieldsFromBody(body, fieldDefinitions) };
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
      variables: variables as Prisma.InputJsonValue,
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
  inputType: z.enum(["TEXT", "FILE"]).default("TEXT"),
});

export function templateFields(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const result = z.array(templateFieldSchema).safeParse((value as Record<string, unknown>).fields);
  return result.success ? result.data : [];
}

export function extractTemplateFieldsFromBody(
  body: string | null | undefined,
  availableFields: Array<{ id: string; label: string; mapping: string | null }> = [],
) {
  if (!body) return [];
  const matches = [...body.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)];
  const seen = new Set<string>();
  const definitionsByMapping = new Map(
    availableFields
      .filter((field) => field.mapping)
      .map((field) => [field.mapping as string, field]),
  );

  return matches.flatMap((match) => {
    const placeholder = match[1];
    if (!placeholder || seen.has(placeholder)) return [];
    seen.add(placeholder);

    const systemField = letterSystemFields.find((field) => field.value === placeholder);
    const definedField = definitionsByMapping.get(placeholder);
    const manual = placeholder.startsWith("manual.");
    const key = manual ? placeholder.slice("manual.".length) : placeholder;
    return [{
      id: definedField?.id ?? placeholder,
      label: definedField?.label ?? systemField?.label ?? humanizeTemplateKey(key),
      sourceText: match[0],
      key,
      mapping: manual ? null : placeholder,
      inputType: "TEXT" as const,
    }];
  });
}

function humanizeTemplateKey(value: string) {
  return value
    .split(".")
    .pop()
    ?.replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase()) ?? value;
}

function humanizeTemplateType(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
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
