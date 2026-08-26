import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, ok, parseJson } from "@/server/api";
import { createProject, createProjectSchema } from "@/server/services/projects";
import { prisma } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "projects.manage");
    const projects = await prisma.project.findMany({
      where: {
        tenantId: context.tenantId,
        ...(Array.isArray(context.projectIds) ? { id: { in: context.projectIds } } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });
    return ok(projects);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "projects.manage");
    if (Array.isArray(context.projectIds)) {
      const error = new Error("Only users with access to every project in this firm can create a new project.");
      error.name = "ForbiddenError";
      throw error;
    }
    const input = await parseJson(request, createProjectSchema);
    return created(await createProject(context, input));
  } catch (error) {
    return apiError(error);
  }
}
