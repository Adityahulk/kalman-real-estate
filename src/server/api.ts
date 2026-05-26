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
  const tenantId = request.headers.get("x-tenant-id") ?? session?.tenantId ?? "seed-tenant";
  const userId = request.headers.get("x-user-id") ?? session?.id ?? "seed-admin";
  const role = roleSchema.catch(session?.role ?? Role.BUILDER_ADMIN).parse(request.headers.get("x-role"));

  if (permission) {
    assertPermission(role, permission);
  }

  return {
    tenantId,
    userId,
    role,
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

  const message = error instanceof Error ? error.message : "Unexpected server error";
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}
