import { z } from "zod";
import { RequestContext } from "../api";
import { prisma } from "../db";

export const projectFileFieldSchema = z.object({
  label: z.string().min(2).max(80),
  section: z.enum(["PROJECT_FILES", "CAD"]).default("PROJECT_FILES"),
});

export async function createProjectFileField(context: RequestContext, input: z.infer<typeof projectFileFieldSchema>) {
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
    data: { tenantId: context.tenantId, label: input.label, key, section: input.section },
  });
}
