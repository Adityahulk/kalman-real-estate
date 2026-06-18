import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { assignDevelopmentTask } from "@/server/services/development";

const assignSchema = z.object({
  assignedTo: z.string().min(1),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "development.manage");
    const input = await parseJson(request, assignSchema);
    return ok(await assignDevelopmentTask(context, params.id, input.assignedTo));
  } catch (error) {
    return apiError(error);
  }
}
