import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { createSessionToken, SessionUser } from "../session";
import { defaultProjectFileFields, defaultProjectMapFields } from "./project-file-fields";
import { ensureDefaultLetterFields } from "./letter-field-settings";
import { ensureProjectLetterTemplates } from "./document-templates";

export const createFirmSchema = z.object({
  name: z.string().min(2).max(120),
  address: z.string().min(3).max(500),
  pan: z.string().min(5).max(20),
  email: z.string().email(),
  authorizedPersons: z.array(z.string().min(2).max(120)).min(1),
  editKey: z.string().min(6).max(100),
  logoDataUrl: z.string().max(2_000_000).optional(),
  customFields: z.record(z.string().max(1000)).optional(),
});

export const updateFirmSchema = z.object({
  editKey: z.string().min(1),
  name: z.string().min(2).max(120),
  address: z.string().min(3).max(500),
  pan: z.string().min(5).max(20),
  email: z.string().email(),
  authorizedPersons: z.array(z.string().min(2).max(120)).min(1),
  logoDataUrl: z.string().max(2_000_000).optional().nullable(),
  customFields: z.record(z.string().max(1000)).optional(),
});

export const firmFieldSchema = z.object({
  label: z.string().min(2).max(80),
});

export const ownershipSettingsSchema = z.object({
  maxTransfersPerPlot: z.number().int().min(0).max(50),
});

export async function firmsForUser(userId: string) {
  const memberships = await prisma.userFirmMembership.findMany({
    where: { userId },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map(({ tenant, role }) => ({ ...tenant, membershipRole: role }));
}

export async function firmFieldsForUser(userId: string) {
  return prisma.firmCustomField.findMany({
    where: { ownerUserId: userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createFirm(user: SessionUser, input: z.infer<typeof createFirmSchema>) {
  const editKeyHash = await bcrypt.hash(input.editKey, 12);
  const slugBase = input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "firm";
  const slug = `${slugBase}-${Date.now().toString(36)}`;

  const tenant = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: input.name,
        slug,
        region: input.address,
        address: input.address,
        pan: input.pan.toUpperCase(),
        contactEmail: input.email,
        authorizedPersons: input.authorizedPersons,
        editKeyHash,
        logoDataUrl: input.logoDataUrl,
        customFields: input.customFields ?? {},
        letterhead: {
          address: input.address,
          signatoryName: input.authorizedPersons[0] ?? "Authorized Signatory",
        },
      },
    });
    await tx.userFirmMembership.create({
      data: { userId: user.id, tenantId: tenant.id, role: Role.BUILDER_OWNER },
    });
    await tx.projectFileField.createMany({
      data: [
        ...defaultProjectFileFields.map((field) => ({ tenantId: tenant.id, section: "PROJECT_FILES", ...field })),
        ...defaultProjectMapFields.map((field) => ({ tenantId: tenant.id, section: "PROJECT_MAPS", ...field })),
      ],
    });
    return tenant;
  });
  await ensureFirmBaselineData(tenant.id);
  return tenant;
}

export async function createFirmField(user: SessionUser, input: z.infer<typeof firmFieldSchema>) {
  if (user.role !== Role.PLATFORM_ADMIN && user.role !== Role.BUILDER_OWNER) {
    const error = new Error("Only a platform admin or firm owner can add firm fields");
    error.name = "ForbiddenError";
    throw error;
  }
  const keyBase = input.label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "field";
  let key = keyBase;
  let suffix = 1;
  while (await prisma.firmCustomField.findUnique({ where: { ownerUserId_key: { ownerUserId: user.id, key } } })) {
    suffix += 1;
    key = `${keyBase}_${suffix}`;
  }
  return prisma.firmCustomField.create({
    data: { ownerUserId: user.id, label: input.label, key },
  });
}

export async function updateOwnershipSettings(user: SessionUser, input: z.infer<typeof ownershipSettingsSchema>) {
  if (!user.tenantId) {
    const error = new Error("Select a firm before updating ownership settings");
    error.name = "BadRequestError";
    throw error;
  }
  if (user.role !== Role.PLATFORM_ADMIN && user.role !== Role.BUILDER_OWNER && user.role !== Role.BUILDER_ADMIN) {
    const error = new Error("Only an admin can update ownership settings");
    error.name = "ForbiddenError";
    throw error;
  }
  return prisma.tenant.update({
    where: { id: user.tenantId },
    data: { maxTransfersPerPlot: input.maxTransfersPerPlot },
  });
}

export async function firmForUser(user: SessionUser, tenantId: string) {
  const membership = await prisma.userFirmMembership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId } },
    include: { tenant: true },
  });
  if (!membership) {
    const error = new Error("You do not have access to this firm");
    error.name = "ForbiddenError";
    throw error;
  }
  return membership.tenant;
}

export async function updateFirm(user: SessionUser, tenantId: string, input: z.infer<typeof updateFirmSchema>) {
  const firm = await firmForUser(user, tenantId);
  if (!firm.editKeyHash) {
    const error = new Error("This firm does not have an edit key configured");
    error.name = "BadRequestError";
    throw error;
  }
  const validKey = await bcrypt.compare(input.editKey, firm.editKeyHash);
  if (!validKey) {
    const error = new Error("Invalid edit key");
    error.name = "ForbiddenError";
    throw error;
  }
  const letterhead = jsonObject(firm.letterhead);
  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: input.name,
      address: input.address,
      region: input.address,
      pan: input.pan.toUpperCase(),
      contactEmail: input.email,
      authorizedPersons: input.authorizedPersons,
      logoDataUrl: input.logoDataUrl || undefined,
      customFields: input.customFields ?? {},
      letterhead: {
        ...letterhead,
        address: input.address,
        signatoryName: input.authorizedPersons[0] ?? letterhead.signatoryName ?? "Authorized Signatory",
      } as Prisma.InputJsonValue,
    },
  });
}

export async function selectFirm(user: SessionUser, tenantId: string) {
  const membership = await prisma.userFirmMembership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId } },
    include: { tenant: true },
  });
  if (!membership) {
    const error = new Error("You do not have access to this firm");
    error.name = "ForbiddenError";
    throw error;
  }
  const firm = await ensureFirmBaselineData(tenantId);

  const token = await createSessionToken({
    id: user.id,
    tenantId,
    role: membership.role,
    email: user.email,
  });
  return { token, firm: firm ?? membership.tenant };
}

async function ensureFirmBaselineData(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return;

  const address = tenant.address?.trim() || tenant.region?.trim() || "";
  const authorizedPersons = Array.isArray(tenant.authorizedPersons)
    ? tenant.authorizedPersons.map((value) => String(value).trim()).filter(Boolean)
    : [];
  const letterhead = jsonObject(tenant.letterhead);
  const tenantUpdate: Prisma.TenantUpdateInput = {};

  if (!tenant.address && tenant.region) tenantUpdate.address = tenant.region;
  if (!tenant.region && tenant.address) tenantUpdate.region = tenant.address;
  if (address || authorizedPersons.length) {
    const nextLetterhead = { ...letterhead };
    if (address && !nextLetterhead.address) nextLetterhead.address = address;
    if (authorizedPersons[0] && !nextLetterhead.signatoryName) nextLetterhead.signatoryName = authorizedPersons[0];
    if (JSON.stringify(nextLetterhead) !== JSON.stringify(letterhead)) tenantUpdate.letterhead = nextLetterhead as Prisma.InputJsonValue;
  }

  if (Object.keys(tenantUpdate).length) {
    await prisma.tenant.update({ where: { id: tenantId }, data: tenantUpdate });
  }

  await prisma.projectFileField.createMany({
    data: [
      ...defaultProjectFileFields.map((field) => ({ tenantId, section: "PROJECT_FILES", ...field })),
      ...defaultProjectMapFields.map((field) => ({ tenantId, section: "PROJECT_MAPS", ...field })),
    ],
    skipDuplicates: true,
  });
  await ensureDefaultLetterFields(tenantId);

  const projects = await prisma.project.findMany({ where: { tenantId }, select: { id: true } });
  await Promise.all(projects.map((project) => ensureProjectLetterTemplates(tenantId, project.id)));
  return prisma.tenant.findUnique({ where: { id: tenantId } });
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}
