import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { assertPermission, normalizePermissions, Permission } from "./rbac";
import { resolveSessionTenantId, resolveUserProjectIds, verifySessionToken } from "./session";
import { formatValidationError, logServerError, namedErrorStatus, normalizeZodIssues, prismaStatus } from "./logger";
import { prisma } from "./db";

export type RequestContext = {
  tenantId: string;
  userId: string;
  role: Role;
  permissions?: Permission[];
  projectIds?: string[] | null;
  ipAddress?: string;
  userAgent?: string;
};

const roleSchema = z.nativeEnum(Role);

function bearerToken(request: NextRequest): string | undefined {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1];
}

export async function getRequestContext(request: NextRequest, permission?: Permission): Promise<RequestContext> {
  // Cookie is the primary credential for the web app; native (Capacitor) clients that call the
  // API directly from a plugin context send the same JWT as `Authorization: Bearer <token>`.
  const session =
    (await verifySessionToken(request.cookies.get("kalman_session")?.value)) ??
    (await verifySessionToken(bearerToken(request)));
  const allowDevHeaderAuth = process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_HEADER_AUTH === "true";
  const role = roleSchema.safeParse(request.headers.get("x-role"));
  const devContext = allowDevHeaderAuth && request.headers.get("x-tenant-id") && request.headers.get("x-user-id") && role.success
    ? {
        tenantId: request.headers.get("x-tenant-id") as string,
        userId: request.headers.get("x-user-id") as string,
        role: role.data,
        permissions: undefined,
      }
    : null;
  const tokenContext = session
    ? await prisma.user.findUnique({
        where: { id: session.id },
        select: {
          id: true,
          tenantId: true,
          role: true,
          status: true,
          customRole: { select: { permissions: true } },
        },
      })
    : null;
  const selectedTenantId = tokenContext?.status === "ACTIVE" && session
    ? await resolveSessionTenantId({
        selectedTenantId: session.tenantId,
        userId: tokenContext.id,
        userTenantId: tokenContext.tenantId,
        role: tokenContext.role,
      })
    : null;
  const context = tokenContext?.status === "ACTIVE" && selectedTenantId
    ? {
        tenantId: selectedTenantId,
        userId: tokenContext.id,
        role: tokenContext.role,
        permissions: normalizePermissions(tokenContext.customRole?.permissions),
      }
    : devContext;

  if (!context) {
    const error = new Error("Unauthenticated");
    error.name = "UnauthorizedError";
    throw error;
  }

  if (permission) {
    assertPermission(context.role, permission, context.permissions);
  }

  const projectIds = context === devContext || context.tenantId === "__unselected__"
    ? null
    : await resolveUserProjectIds({
        userId: context.userId,
        tenantId: context.tenantId,
        userTenantId: tokenContext?.tenantId ?? null,
        role: context.role,
      });

  const requestContext: RequestContext = {
    tenantId: context.tenantId,
    userId: context.userId,
    role: context.role,
    permissions: context.permissions,
    projectIds,
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  };
  await assertRequestResourceAccess(request, requestContext);
  return requestContext;
}

export function canAccessProject(context: Pick<RequestContext, "projectIds">, projectId: string) {
  return context.projectIds === null || context.projectIds === undefined || context.projectIds.includes(projectId);
}

export function assertProjectAccess(context: Pick<RequestContext, "projectIds">, projectId: string) {
  if (!canAccessProject(context, projectId)) {
    const error = new Error("You do not have access to this project.");
    error.name = "ForbiddenError";
    throw error;
  }
}

async function assertRequestResourceAccess(request: NextRequest, context: RequestContext) {
  if (!Array.isArray(context.projectIds)) return;
  const path = request.nextUrl.pathname.split("/").filter(Boolean);
  if (path[0] !== "api" || path[1] !== "v1") return;

  const projectIds = await resourceProjectIds(context.tenantId, path.slice(2));
  if (projectIds.length && !projectIds.some((projectId) => context.projectIds!.includes(projectId))) {
    const error = new Error("You do not have access to this project's records.");
    error.name = "ForbiddenError";
    throw error;
  }
}

async function resourceProjectIds(tenantId: string, path: string[]): Promise<string[]> {
  const [resource, id, child, childId] = path;
  if (resource === "projects" && id) return projectIdsForRecord(tenantId, "Project", id);
  if (resource === "plots" && id) return projectIdsForRecord(tenantId, "Plot", id);
  if (resource === "ownership" && id === "plots" && childId) return projectIdsForRecord(tenantId, "Plot", childId);
  if (resource === "cad" && id && !["upload", "health", "entities"].includes(id)) return projectIdsForRecord(tenantId, "CadFile", id);
  if (resource === "documents" && id && !["drafts", "generate"].includes(id)) return projectIdsForRecord(tenantId, "GeneratedDocument", id);
  if (resource === "files" && id && !["upload", "share-bundle"].includes(id)) return projectIdsForRecord(tenantId, "FileAsset", id);
  if (resource === "development" && id === "site-assets" && childId) return projectIdsForRecord(tenantId, "SiteAsset", childId);
  if (resource === "development" && id === "plot-checklists" && childId) return projectIdsForRecord(tenantId, "ChecklistItem", childId);
  if (resource === "development" && id === "progress" && childId) return projectIdsForRecord(tenantId, "ProgressUpdate", childId);
  if (resource === "marketing" && id === "tasks" && childId) return projectIdsForRecord(tenantId, "MarketingTask", childId);
  return [];
}

async function projectIdsForRecord(tenantId: string, type: string, id: string): Promise<string[]> {
  if (type === "Project") {
    const project = await prisma.project.findFirst({ where: { id, tenantId }, select: { id: true } });
    return project ? [project.id] : [];
  }
  if (type === "Plot") {
    const plot = await prisma.plot.findFirst({ where: { id, tenantId }, select: { projectId: true } });
    return plot ? [plot.projectId] : [];
  }
  if (type === "CadFile") {
    const cad = await prisma.cadFile.findFirst({ where: { id, tenantId }, select: { projectId: true } });
    return cad?.projectId ? [cad.projectId] : [];
  }
  if (type === "SiteAsset") {
    const asset = await prisma.siteAsset.findFirst({ where: { id, tenantId }, select: { projectId: true } });
    return asset ? [asset.projectId] : [];
  }
  if (type === "MarketingTask") {
    const task = await prisma.marketingTask.findFirst({ where: { id, tenantId }, select: { projectId: true } });
    return task?.projectId ? [task.projectId] : [];
  }
  if (type === "ChecklistItem") {
    const item = await prisma.checklistItem.findFirst({ where: { id, tenantId }, select: { plotId: true, parentType: true, parentId: true } });
    if (item?.plotId) return projectIdsForRecord(tenantId, "Plot", item.plotId);
    if (item?.parentType === "SiteAsset") return projectIdsForRecord(tenantId, "SiteAsset", item.parentId);
    return [];
  }
  if (type === "ProgressUpdate") {
    const update = await prisma.progressUpdate.findFirst({ where: { id, tenantId }, select: { parentType: true, parentId: true } });
    return update ? projectIdsForRecord(tenantId, update.parentType, update.parentId) : [];
  }
  if (type === "GeneratedDocument") {
    const document = await prisma.generatedDocument.findFirst({ where: { id, tenantId }, select: { recordType: true, recordId: true } });
    return document ? projectIdsForRecord(tenantId, document.recordType, document.recordId) : [];
  }
  if (type === "FileAsset") {
    const file = await prisma.fileAsset.findFirst({ where: { id, tenantId }, select: { ownerType: true, ownerId: true } });
    return file?.ownerType && file.ownerId ? projectIdsForRecord(tenantId, file.ownerType, file.ownerId) : [];
  }
  if (type === "Owner") {
    const plots = await prisma.plot.findMany({
      where: {
        tenantId,
        OR: [
          { currentOwnerId: id },
          { ownershipRecords: { some: { ownerId: id, cancelledAt: null } } },
        ],
      },
      distinct: ["projectId"],
      select: { projectId: true },
    });
    return plots.map((plot) => plot.projectId);
  }
  return [];
}

export async function parseJson<T extends z.ZodTypeAny>(request: NextRequest, schema: T): Promise<z.output<T>> {
  const body = await request.json().catch(() => {
    const error = new Error("Request body must be valid JSON.");
    error.name = "BadRequestError";
    throw error;
  });
  return schema.parse(body);
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function apiError(error: unknown, context: Record<string, unknown> = {}) {
  if (isNextDynamicServerError(error)) throw error;
  logServerError(error, context);
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { ok: false, error: formatValidationError(error), issues: normalizeZodIssues(error) },
      { status: 400 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const status = prismaStatus(error.code);
    const message = error.code === "P2002"
      ? "A record with the same unique details already exists."
      : error.code === "P2003"
        ? "This record is still referenced by other data."
        : error.code === "P2025"
          ? "The requested record was not found."
          : "A database operation failed.";
    return NextResponse.json({ ok: false, error: message }, { status });
  }

  if (error && typeof error === "object" && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
    return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
  }

  if (error instanceof Error) {
    const status = namedErrorStatus(error.name);
    return NextResponse.json(
      { ok: false, error: status >= 500 && error.name !== "DocumentRenderError" ? "Unexpected server error" : error.message },
      { status },
    );
  }
  return NextResponse.json({ ok: false, error: "Unexpected server error" }, { status: 500 });
}

function isNextDynamicServerError(error: unknown) {
  return error instanceof Error && error.message.startsWith("Dynamic server usage:");
}
