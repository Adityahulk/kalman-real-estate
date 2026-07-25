import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { assignDevelopmentTask } from "@/server/services/development";

const assignSchema = z.object({
  assignedToId: z.string().min(1),
});

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "engineering.assign");
    const input = await parseJson(request, assignSchema);
    return ok(await assignDevelopmentTask(context, params.id, input.assignedToId));
  } catch (error) {
    return apiError(error, { route: "POST /api/v1/development/site-assets/[id]/assign", siteAssetId: params.id });
  }
}
