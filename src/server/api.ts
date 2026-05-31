import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { assertPermission, Permission } from "./rbac";
import { verifySessionToken } from "./session";

export type RequestContext = {
  tenantId: string;
  userId: string;
  role: Role;
  ipAddress?: string;
  userAgent?: string;
};

const roleSchema = z.nativeEnum(Role);

export async function getRequestContext(request: NextRequest, permission?: Permission): Promise<RequestContext> {
  const session = await verifySessionToken(request.cookies.get("kalman_session")?.value);
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
  const body = await request.json().catch(() => ({}));
  return schema.parse(body);
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function apiError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ ok: false, error: "Invalid request", issues: error.issues }, { status: 400 });
  }

  if (error instanceof Error && error.name === "ForbiddenError") {
    return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
  }

  if (error instanceof Error && error.name === "UnauthorizedError") {
    return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
  }

  if (error instanceof Error && error.name === "BadRequestError") {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  if (error instanceof Error && error.name === "NotFoundError") {
    return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}
