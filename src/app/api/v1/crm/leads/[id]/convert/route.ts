import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { convertCrmLeadToCustomer } from "@/server/services/crm";

const schema = z.object({ ownerId: z.string().min(1) });
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(request, "documents.generate");
    const input = await parseJson(request, schema);
    return ok(await convertCrmLeadToCustomer(context, (await params).id, input.ownerId));
  } catch (error) {
    return apiError(error, { route: "POST /api/v1/crm/leads/[id]/convert" });
  }
}
