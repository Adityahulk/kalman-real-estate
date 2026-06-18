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
      message: formatValidationError(error),
      issues: normalizeZodIssues(error),
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

export function normalizeZodIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
}

export function formatValidationError(error: z.ZodError) {
  const [firstIssue] = normalizeZodIssues(error);
  if (!firstIssue) return "Invalid request.";
  if (!firstIssue.path) return firstIssue.message;
  return `${humanizePath(firstIssue.path)}: ${firstIssue.message}`;
}

function humanizePath(path: string) {
  return path
    .split(".")
    .filter(Boolean)
    .map((part) => part.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" > ");
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
