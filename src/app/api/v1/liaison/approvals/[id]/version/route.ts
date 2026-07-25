import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { addApprovalVersion, newVersionSchema } from "@/server/services/approvals";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "liaison.manage");
    return ok(await addApprovalVersion(context, params.id, await parseJson(request, newVersionSchema)));
  } catch (error) {
    return apiError(error);
  }
}
