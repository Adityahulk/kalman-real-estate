import { AuditAction, OwnershipKind, PlotStatus, Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { RequestContext } from "../api";
import { writeAuditEvent } from "../audit";
import { prisma } from "../db";
import { hasPermission } from "../rbac";

export const ownerSchema = z.object({
  type: z.enum(["INDIVIDUAL", "COMPANY", "SHARED"]),
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  kyc: z.record(z.unknown()).optional(),
});

export async function createOwner(context: RequestContext, input: z.infer<typeof ownerSchema>) {
  const owner = await prisma.owner.create({
    data: {
      tenantId: context.tenantId,
      type: input.type,
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      kyc: input.kyc as Prisma.InputJsonValue,
    },
  });
  await writeAuditEvent(context, { action: AuditAction.CREATE, entityType: "Owner", entityId: owner.id, after: owner as unknown as Prisma.InputJsonValue });
  return owner;
}

export async function updateOwner(context: RequestContext, ownerId: string, input: z.infer<typeof ownerSchema>) {
  const before = await prisma.owner.findFirstOrThrow({
    where: { id: ownerId, tenantId: context.tenantId },
  });
  const owner = await prisma.owner.update({
    where: { id: ownerId },
    data: {
      type: input.type,
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      kyc: input.kyc as Prisma.InputJsonValue,
    },
  });
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "Owner",
    entityId: owner.id,
    before: before as unknown as Prisma.InputJsonValue,
    after: owner as unknown as Prisma.InputJsonValue,
  });
  return owner;
}

export const allotPlotSchema = z.object({
  ownerId: z.string(),
  amountInr: z.number().nonnegative().optional(),
  sharePct: z.number().min(0).max(100).optional(),
  documentId: z.string().optional(),
  effectiveAt: z.string().datetime().optional(),
  paymentMode: z.string().optional(),
  extraDetails: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
});

export async function allotPlot(context: RequestContext, plotId: string, input: z.infer<typeof allotPlotSchema>) {
  assertCanPrepareAllotment(context);
  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.plot.findFirstOrThrow({ where: { id: plotId, tenantId: context.tenantId, archivedAt: null } });
    if (before.currentOwnerId) {
      throwBadRequest("This plot already has an owner. Use transfer instead.");
    }
    const pending = await tx.ownershipRecord.findFirst({
      where: {
        tenantId: context.tenantId,
        plotId,
        kind: OwnershipKind.ALLOTMENT,
        cancelledAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
    if (pending) {
      throwBadRequest("An allotment is already being prepared for this plot. Open its allotment details to continue.");
    }
    await tx.owner.findFirstOrThrow({ where: { id: input.ownerId, tenantId: context.tenantId } });
    const plot = before;
    const record = await tx.ownershipRecord.create({
      data: {
        tenantId: context.tenantId,
        plotId,
        ownerId: input.ownerId,
        kind: OwnershipKind.ALLOTMENT,
        amountInr: input.amountInr,
        sharePct: input.sharePct,
        documentId: input.documentId,
        notes: input.notes,
        paymentMode: input.paymentMode,
        extraDetails: input.extraDetails as Prisma.InputJsonValue | undefined,
        effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : undefined,
        createdById: context.userId,
      },
    });
    return { before, plot, record };
  });
  await writeAuditEvent(context, { action: AuditAction.ALLOT, entityType: "Plot", entityId: plotId, before: result.before as unknown as Prisma.InputJsonValue, after: result.plot as unknown as Prisma.InputJsonValue });
  return result;
}

export async function updateLatestAllotment(context: RequestContext, plotId: string, input: z.infer<typeof allotPlotSchema>) {
  assertCanPrepareAllotment(context);
  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.plot.findFirstOrThrow({ where: { id: plotId, tenantId: context.tenantId, archivedAt: null } });
    const recordBefore = await tx.ownershipRecord.findFirst({
      where: { tenantId: context.tenantId, plotId, kind: OwnershipKind.ALLOTMENT, cancelledAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!recordBefore) {
      throwBadRequest("No allotment record exists for this plot yet.");
    }
    await tx.owner.findFirstOrThrow({ where: { id: input.ownerId, tenantId: context.tenantId } });
    const plot = before;
    const record = await tx.ownershipRecord.update({
      where: { id: recordBefore.id },
      data: {
        ownerId: input.ownerId,
        amountInr: input.amountInr,
        sharePct: input.sharePct,
        documentId: null,
        notes: input.notes,
        paymentMode: input.paymentMode,
        extraDetails: input.extraDetails as Prisma.InputJsonValue | undefined,
        effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : undefined,
        createdById: context.userId,
      },
    });
    return { before, plot, recordBefore, record };
  });
  await writeAuditEvent(context, {
    action: AuditAction.UPDATE,
    entityType: "Plot",
    entityId: plotId,
    before: {
      plot: result.before,
      ownershipRecord: result.recordBefore,
    } as unknown as Prisma.InputJsonValue,
    after: {
      plot: result.plot,
      ownershipRecord: result.record,
    } as unknown as Prisma.InputJsonValue,
  });
  return result;
}

export const transferPlotSchema = z.object({
  buyerOwnerId: z.string(),
  amountInr: z.number().nonnegative().optional(),
  sharePct: z.number().min(0).max(100).optional(),
  documentId: z.string().optional(),
  effectiveAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  extraDetails: z.record(z.unknown()).optional(),
});

export async function transferPlot(context: RequestContext, plotId: string, input: z.infer<typeof transferPlotSchema>) {
  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.plot.findFirstOrThrow({ where: { id: plotId, tenantId: context.tenantId, archivedAt: null } });
    if (!before.currentOwnerId) {
      throwBadRequest("This plot is still with the company. Complete an allotment before recording a transfer.");
    }
    if (before.currentOwnerId === input.buyerOwnerId) {
      throwBadRequest("Select a different transferee. This person is already the current owner.");
    }
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: context.tenantId }, select: { maxTransfersPerPlot: true } });
    const transferRecords = await tx.ownershipRecord.findMany({
      where: { tenantId: context.tenantId, plotId, kind: OwnershipKind.TRANSFER, documentId: { not: null }, cancelledAt: null },
      select: { documentId: true },
    });
    const acceptedTransfers = transferRecords.length
      ? await tx.generatedDocument.count({
          where: {
            tenantId: context.tenantId,
            id: { in: transferRecords.map((record) => record.documentId).filter(Boolean) as string[] },
            archivedAt: null,
            status: { in: ["APPROVED", "ISSUED", "SENT_FOR_SIGNATURE", "SIGNED"] },
          },
        })
      : 0;
    if (acceptedTransfers >= tenant.maxTransfersPerPlot) {
      throwBadRequest(`Transfer limit reached for this plot. Only registry is available now.`);
    }
    await tx.owner.findFirstOrThrow({ where: { id: input.buyerOwnerId, tenantId: context.tenantId } });
    const plot = before;
    const record = await tx.ownershipRecord.create({
      data: {
        tenantId: context.tenantId,
        plotId,
        ownerId: input.buyerOwnerId,
        kind: OwnershipKind.TRANSFER,
        amountInr: input.amountInr,
        sharePct: input.sharePct,
        documentId: input.documentId,
        notes: input.notes,
        extraDetails: input.extraDetails as Prisma.InputJsonValue | undefined,
        effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : undefined,
        createdById: context.userId,
      },
    });
    return { before, plot, record };
  });
  await writeAuditEvent(context, { action: AuditAction.TRANSFER, entityType: "Plot", entityId: plotId, before: result.before as unknown as Prisma.InputJsonValue, after: result.plot as unknown as Prisma.InputJsonValue });
  return result;
}

export const historicalAllotmentSchema = z.object({
  type: z.enum(["INDIVIDUAL", "COMPANY", "SHARED"]).default("INDIVIDUAL"),
  name: z.string().trim().min(2),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  effectiveAt: z.string().datetime().optional(),
});

export async function recordHistoricalAllotment(
  context: RequestContext,
  plotId: string,
  input: z.infer<typeof historicalAllotmentSchema>,
) {
  assertSuperAdmin(context, "Only a Super Admin can mark an old allotment as completed.");
  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.plot.findFirstOrThrow({
      where: { id: plotId, tenantId: context.tenantId, archivedAt: null },
    });
    if (before.currentOwnerId) {
      throwBadRequest("This plot already has a current owner.");
    }

    const sourceFiles = await tx.fileAsset.findMany({
      where: {
        tenantId: context.tenantId,
        ownerType: "Plot",
        ownerId: plotId,
        deletedAt: null,
        categoryKey: { in: ["old-documents", "signed-allotment-letter"] },
      },
      select: { id: true, fileName: true, mimeType: true, categoryKey: true },
    });
    if (!sourceFiles.length) {
      throwBadRequest("Upload the old signed allotment or transfer letter before marking the allotment as completed.");
    }

    const owner = await tx.owner.create({
      data: {
        tenantId: context.tenantId,
        type: input.type,
        name: input.name,
        email: input.email || undefined,
        phone: input.phone || undefined,
        address: input.address || undefined,
      },
    });
    const plot = await tx.plot.update({
      where: { id: plotId },
      data: { currentOwnerId: owner.id, status: PlotStatus.ALLOTTED },
    });
    const record = await tx.ownershipRecord.create({
      data: {
        tenantId: context.tenantId,
        plotId,
        ownerId: owner.id,
        kind: OwnershipKind.ALLOTMENT,
        sharePct: new Prisma.Decimal(100),
        notes: "Historical allotment recorded from an uploaded signed letter.",
        effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : undefined,
        createdById: context.userId,
        extraDetails: {
          historicalImport: true,
          sourceFiles,
        },
      },
    });
    return { before, owner, plot, record };
  });
  await writeAuditEvent(context, {
    action: AuditAction.ALLOT,
    entityType: "Plot",
    entityId: plotId,
    before: result.before as unknown as Prisma.InputJsonValue,
    after: {
      plot: result.plot,
      ownershipRecordId: result.record.id,
      historicalImport: true,
    } as unknown as Prisma.InputJsonValue,
  });
  return result;
}

export async function cancelLatestOwnershipRecord(context: RequestContext, plotId: string, recordId: string) {
  assertSuperAdmin(context, "Only a Super Admin can cancel an allotment or transfer.");
  const cleanup = await prisma.$transaction(async (tx) => {
    const plot = await tx.plot.findFirstOrThrow({
      where: { id: plotId, tenantId: context.tenantId, archivedAt: null },
    });
    const ownershipRecords = await tx.ownershipRecord.findMany({
      where: {
        tenantId: context.tenantId,
        plotId,
        kind: { in: [OwnershipKind.ALLOTMENT, OwnershipKind.TRANSFER] },
        cancelledAt: null,
      },
      orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
    });
    const latest = ownershipRecords[0];
    if (!latest || latest.id !== recordId) {
      throwBadRequest("Only the latest allotment or transfer can be cancelled.");
    }

    const documentKeyword = latest.kind === OwnershipKind.TRANSFER ? "transfer" : "allotment";
    const documentFilters: Prisma.GeneratedDocumentWhereInput[] = [
      {
        type: { contains: documentKeyword, mode: "insensitive" },
        createdAt: { gte: latest.createdAt },
      },
    ];
    if (latest.documentId) documentFilters.push({ id: latest.documentId });
    const documents = await tx.generatedDocument.findMany({
      where: {
        tenantId: context.tenantId,
        recordType: "Plot",
        recordId: plotId,
        archivedAt: null,
        OR: documentFilters,
      },
      select: {
        id: true,
        number: true,
        fileAssetId: true,
        signedFileAssetId: true,
        data: true,
      },
    });
    const documentIds = documents.map((document) => document.id);
    const revisions = documentIds.length
      ? await tx.generatedDocumentRevision.findMany({
          where: { tenantId: context.tenantId, documentId: { in: documentIds } },
          select: { baseFileId: true, outputFileId: true },
        })
      : [];

    const referencedFileIds = uniqueStrings([
      ...collectReferencedFileIds(latest.extraDetails),
      ...documents.flatMap((document) => collectReferencedFileIds(document.data)),
      ...documents.flatMap((document) => [document.fileAssetId, document.signedFileAssetId]),
      ...revisions.flatMap((revision) => [revision.baseFileId, revision.outputFileId]),
    ]);
    const documentNumbers = documents.map((document) => document.number).filter((value): value is string => Boolean(value));
    const relatedFiles = await tx.fileAsset.findMany({
      where: {
        tenantId: context.tenantId,
        OR: [
          ...(referencedFileIds.length ? [{ id: { in: referencedFileIds } }] : []),
          ...(documentNumbers.length
            ? [{
                ownerType: "Plot",
                ownerId: plotId,
                categoryKey: "signed-allotment-letter",
                documentNo: { in: documentNumbers },
              }]
            : []),
        ],
      },
      select: { id: true, storageKey: true, fallbackStorageKey: true },
    });
    const fileIds = relatedFiles.map((file) => file.id);

    const now = new Date();
    if (documentIds.length) {
      await tx.generatedDocument.updateMany({
        where: { tenantId: context.tenantId, id: { in: documentIds }, archivedAt: null },
        data: {
          archivedAt: now,
          archivedById: context.userId,
          archiveReason: `Ownership ${latest.kind.toLowerCase()} cancelled`,
        },
      });
    }
    await tx.ownershipRecord.update({
      where: { id: latest.id },
      data: {
        cancelledAt: now,
        cancelledById: context.userId,
        cancellationReason: `Cancelled by ${context.role}`,
      },
    });
    if (fileIds.length) {
      await tx.fileAsset.updateMany({
        where: { tenantId: context.tenantId, id: { in: fileIds }, deletedAt: null },
        data: {
          deletedAt: now,
          deletedById: context.userId,
          deleteReason: `Ownership ${latest.kind.toLowerCase()} cancelled`,
        },
      });
    }

    const previous = ownershipRecords[1] ?? null;
    const updatedPlot = await tx.plot.update({
      where: { id: plotId },
      data: previous
        ? {
            currentOwnerId: previous.ownerId,
            status: previous.kind === OwnershipKind.TRANSFER ? PlotStatus.TRANSFERRED : PlotStatus.ALLOTTED,
          }
        : { currentOwnerId: null, status: PlotStatus.COMPANY_OWNED },
    });
    return {
      plotBefore: plot,
      plot: updatedPlot,
      cancelled: latest,
      documentCount: documentIds.length,
      fileCount: fileIds.length,
    };
  });

  await writeAuditEvent(context, {
    action: AuditAction.DELETE,
    entityType: "Plot",
    entityId: plotId,
    before: {
      plot: cleanup.plotBefore,
      ownershipRecord: cleanup.cancelled,
    } as unknown as Prisma.InputJsonValue,
    after: {
      plot: cleanup.plot,
      cancelledOwnershipRecordId: recordId,
      archivedDocuments: cleanup.documentCount,
      archivedFiles: cleanup.fileCount,
    } as unknown as Prisma.InputJsonValue,
  });
  return {
    plot: cleanup.plot,
    cancelledRecordId: recordId,
    archivedDocuments: cleanup.documentCount,
    archivedFiles: cleanup.fileCount,
  };
}

export const registrySchema = z.object({
  status: z.string().min(2),
  registryNo: z.string().optional(),
  registryDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function updateRegistry(context: RequestContext, plotId: string, input: z.infer<typeof registrySchema>) {
  await prisma.plot.findFirstOrThrow({ where: { id: plotId, tenantId: context.tenantId, archivedAt: null } });
  const result = await prisma.$transaction(async (tx) => {
    const registry = await tx.registryRecord.create({
      data: {
        tenantId: context.tenantId,
        plotId,
        status: input.status,
        registryNo: input.registryNo,
        registryDate: input.registryDate ? new Date(input.registryDate) : undefined,
        notes: input.notes,
      },
    });
    const normalized = input.status.toUpperCase().replaceAll(" ", "_");
    const plot = normalized === "COMPLETED" || normalized === "REGISTERED"
      ? await tx.plot.update({ where: { id: plotId }, data: { status: PlotStatus.REGISTERED } })
      : normalized.includes("PROGRESS") || normalized === "SUBMITTED"
        ? await tx.plot.update({ where: { id: plotId }, data: { status: PlotStatus.REGISTRY_IN_PROGRESS } })
        : null;
    return { registry, plot };
  });
  await writeAuditEvent(context, { action: AuditAction.REGISTRY_UPDATE, entityType: "Plot", entityId: plotId, after: result.registry as unknown as Prisma.InputJsonValue });
  return result.registry;
}

export async function getPlotAudit(context: RequestContext, plotId: string) {
  const [plot, ownership, registry, audit] = await Promise.all([
    prisma.plot.findFirstOrThrow({ where: { id: plotId, tenantId: context.tenantId, archivedAt: null }, include: { currentOwner: true } }),
    prisma.ownershipRecord.findMany({ where: { tenantId: context.tenantId, plotId, cancelledAt: null }, include: { owner: true }, orderBy: { effectiveAt: "asc" } }),
    prisma.registryRecord.findMany({ where: { tenantId: context.tenantId, plotId, archivedAt: null }, orderBy: { createdAt: "asc" } }),
    prisma.auditEvent.findMany({ where: { tenantId: context.tenantId, entityType: "Plot", entityId: plotId, archivedAt: null }, orderBy: { createdAt: "asc" } }),
  ]);
  return { plot, ownership, registry, audit };
}

function throwBadRequest(message: string): never {
  const error = new Error(message);
  error.name = "BadRequestError";
  throw error;
}

function assertSuperAdmin(context: RequestContext, message: string) {
  if (context.role !== Role.SUPER_ADMIN) {
    const error = new Error(message);
    error.name = "ForbiddenError";
    throw error;
  }
}

function assertCanPrepareAllotment(context: RequestContext) {
  if (
    hasPermission(context.role, "ownership.manage", context.permissions)
    || hasPermission(context.role, "documents.generate", context.permissions)
  ) return;
  const error = new Error("You do not have permission to prepare an allotment.");
  error.name = "ForbiddenError";
  throw error;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function collectReferencedFileIds(value: unknown): string[] {
  const ids = new Set<string>();
  visitReferencedFiles(value, ids);
  return [...ids];
}

function visitReferencedFiles(value: unknown, ids: Set<string>) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) visitReferencedFiles(item, ids);
    return;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.id === "string"
    && (typeof record.fileName === "string" || typeof record.mimeType === "string" || typeof record.storageKey === "string")
  ) {
    ids.add(record.id);
  }
  for (const item of Object.values(record)) visitReferencedFiles(item, ids);
}
