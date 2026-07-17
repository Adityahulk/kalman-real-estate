import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { assertPermission, Permission } from "./rbac";
import { verifySessionToken } from "./session";
import { formatValidationError, logServerError, namedErrorStatus, normalizeZodIssues, prismaStatus } from "./logger";

export type RequestContext = {
  tenantId: string;
  userId: string;
  role: Role;
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
      }
    : null;
  const context = session
    ? { tenantId: session.tenantId, userId: session.id, role: session.role }
    : devContext;

  if (!context) {
    const error = new Error("Unauthenticated");
    error.name = "UnauthorizedError";
    throw error;
  }

  if (permission) {
    assertPermission(context.role, permission);
  }

  return {
    tenantId: context.tenantId,
    userId: context.userId,
    role: context.role,
    ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  };
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
