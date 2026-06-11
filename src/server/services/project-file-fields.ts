import { z } from "zod";
import { RequestContext } from "../api";
import { prisma } from "../db";

export const defaultProjectFileFields = [
  { label: "Registry", key: "registry" },
  { label: "RERA", key: "rera" },
  { label: "NOC", key: "noc" },
  { label: "License", key: "license" },
  { label: "Development file", key: "development_file" },
] as const;

export const defaultProjectMapFields = [
  { label: "Electrical plans", key: "electrical_plan" },
  { label: "Water sewage", key: "water_sewage" },
] as const;

export const projectFileFieldSchema = z.object({
  label: z.string().min(2).max(80),
  section: z.enum(["PROJECT_FILES", "PROJECT_MAPS"]).default("PROJECT_FILES"),
  parentId: z.string().optional(),
});

export async function createProjectFileField(context: RequestContext, input: z.infer<typeof projectFileFieldSchema>) {
  if (input.parentId) {
    const parent = await prisma.projectFileField.findFirstOrThrow({
      where: { id: input.parentId, tenantId: context.tenantId, section: input.section, parentId: null },
    });
    if (parent.section !== "PROJECT_MAPS") throw new Error("Sub-options are only available for project maps");
  }
  const keyBase = input.label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "field";
  let key = keyBase;
  let suffix = 1;
  while (await prisma.projectFileField.findUnique({
    where: { tenantId_section_key: { tenantId: context.tenantId, section: input.section, key } },
  })) {
    suffix += 1;
    key = `${keyBase}_${suffix}`;
  }
  return prisma.projectFileField.create({
    data: { tenantId: context.tenantId, label: input.label, key, section: input.section, parentId: input.parentId },
  });
}

export const updateProjectFileFieldSchema = z.object({
  label: z.string().min(2).max(80),
});

export async function updateProjectFileField(context: RequestContext, id: string, input: z.infer<typeof updateProjectFileFieldSchema>) {
  await prisma.projectFileField.findFirstOrThrow({ where: { id, tenantId: context.tenantId } });
  return prisma.projectFileField.update({ where: { id }, data: { label: input.label } });
}

export async function deleteProjectFileField(context: RequestContext, id: string) {
  await prisma.projectFileField.findFirstOrThrow({ where: { id, tenantId: context.tenantId } });
  return prisma.projectFileField.delete({ where: { id } });
}
