import { Prisma } from "@prisma/client";
import { z } from "zod";

export function logServerError(error: unknown, context: Record<string, unknown> = {}) {
  const details = errorDetails(error);
  const method = details.status >= 500 ? console.error : console.warn;
  const output = details.status >= 500 ? details : { ...details, stack: undefined };
  method("[widestate:error]", {
    at: new Date().toISOString(),
    ...context,
    ...output,
  });
}

function errorDetails(error: unknown) {
  if (error instanceof z.ZodError) {
    return {
      status: 400,
      type: "ValidationError",
      message: "Invalid request",
      issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      status: prismaStatus(error.code),
      type: "PrismaClientKnownRequestError",
      code: error.code,
      message: error.message,
      meta: error.meta,
      stack: error.stack,
    };
  }
  if (error instanceof Error) {
    return {
      status: namedErrorStatus(error.name),
      type: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { status: 500, type: "UnknownError", message: String(error) };
}

export function namedErrorStatus(name: string) {
  if (name === "BadRequestError") return 400;
  if (name === "UnauthorizedError") return 401;
  if (name === "ForbiddenError") return 403;
  if (name === "NotFoundError") return 404;
  if (name === "ConflictError") return 409;
  return 500;
}

export function prismaStatus(code: string) {
  if (code === "P2002" || code === "P2003") return 409;
  if (code === "P2025") return 404;
  return 500;
}
