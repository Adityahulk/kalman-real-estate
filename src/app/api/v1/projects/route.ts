import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, ok, parseJson } from "@/server/api";
import { createProject, createProjectSchema } from "@/server/services/projects";
import { prisma } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "projects.manage");
    const projects = await prisma.project.findMany({
      where: { tenantId: context.tenantId },
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
    const input = await parseJson(request, createProjectSchema);
    return created(await createProject(context, input));
  } catch (error) {
    return apiError(error);
  }
}
