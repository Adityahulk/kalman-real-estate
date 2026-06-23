import { z } from "zod";
import { RequestContext } from "../api";
import { prisma } from "../db";
import { letterSystemFields } from "@/lib/letter-system-fields";

export const letterFieldCategorySchema = z.object({ name: z.string().min(2).max(80) });
export const letterFieldDefinitionSchema = z.object({
  categoryId: z.string().min(1),
  label: z.string().min(2).max(100),
  mapping: z.string().max(120).nullable().optional(),
});
export const updateLetterFieldSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  label: z.string().min(2).max(100).optional(),
  mapping: z.string().max(120).nullable().optional(),
});

export async function ensureDefaultLetterFields(tenantId: string) {
  for (const categoryName of [...new Set(letterSystemFields.map((field) => field.category))]) {
    const categoryKey = keyFromLabel(categoryName);
    const category = await prisma.letterFieldCategory.upsert({
      where: { tenantId_key: { tenantId, key: categoryKey } },
      update: {},
      create: { tenantId, name: categoryName, key: categoryKey },
    });
    for (const field of letterSystemFields.filter((item) => item.category === categoryName)) {
      await prisma.letterFieldDefinition.upsert({
        where: { categoryId_key: { categoryId: category.id, key: keyFromLabel(field.label) } },
        update: { mapping: field.value },
        create: {
          categoryId: category.id,
          label: field.label,
          key: keyFromLabel(field.label),
          mapping: field.value,
        },
      });
    }
  }
}

export async function listLetterFieldSettings(tenantId: string) {
  await ensureDefaultLetterFields(tenantId);
  return prisma.letterFieldCategory.findMany({ where: { tenantId }, include: { fields: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" } });
}

export async function createLetterFieldCategory(context: RequestContext, input: z.infer<typeof letterFieldCategorySchema>) {
  return prisma.letterFieldCategory.create({ data: { tenantId: context.tenantId, name: input.name.trim(), key: await uniqueCategoryKey(context.tenantId, input.name) } });
}

export async function createLetterFieldDefinition(context: RequestContext, input: z.infer<typeof letterFieldDefinitionSchema>) {
  const category = await prisma.letterFieldCategory.findFirstOrThrow({ where: { id: input.categoryId, tenantId: context.tenantId } });
  return prisma.letterFieldDefinition.create({
    data: { categoryId: category.id, label: input.label.trim(), key: await uniqueFieldKey(category.id, input.label), mapping: input.mapping || null },
  });
}

export async function updateLetterFieldCategory(context: RequestContext, id: string, input: z.infer<typeof updateLetterFieldSchema>) {
  await prisma.letterFieldCategory.findFirstOrThrow({ where: { id, tenantId: context.tenantId } });
  return prisma.letterFieldCategory.update({ where: { id }, data: { name: input.name?.trim() } });
}

export async function updateLetterFieldDefinition(context: RequestContext, id: string, input: z.infer<typeof updateLetterFieldSchema>) {
  await prisma.letterFieldDefinition.findFirstOrThrow({ where: { id, category: { tenantId: context.tenantId } } });
  return prisma.letterFieldDefinition.update({ where: { id }, data: { label: input.label?.trim(), mapping: input.mapping } });
}

export async function deleteLetterFieldCategory(context: RequestContext, id: string) {
  await prisma.letterFieldCategory.findFirstOrThrow({ where: { id, tenantId: context.tenantId } });
  return prisma.letterFieldCategory.delete({ where: { id } });
}

export async function deleteLetterFieldDefinition(context: RequestContext, id: string) {
  await prisma.letterFieldDefinition.findFirstOrThrow({ where: { id, category: { tenantId: context.tenantId } } });
  return prisma.letterFieldDefinition.delete({ where: { id } });
}

function keyFromLabel(label: string) {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 70) || "field";
}

async function uniqueCategoryKey(tenantId: string, label: string) {
  const base = keyFromLabel(label);
  let key = base;
  let suffix = 1;
  while (await prisma.letterFieldCategory.findUnique({ where: { tenantId_key: { tenantId, key } } })) key = `${base}_${++suffix}`;
  return key;
}

async function uniqueFieldKey(categoryId: string, label: string) {
  const base = keyFromLabel(label);
  let key = base;
  let suffix = 1;
  while (await prisma.letterFieldDefinition.findUnique({ where: { categoryId_key: { categoryId, key } } })) key = `${base}_${++suffix}`;
  return key;
}
