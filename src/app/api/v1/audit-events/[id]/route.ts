import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { deleteAuditEvent } from "@/server/audit";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "ownership.manage");
    return ok(await deleteAuditEvent(context, params.id));
  } catch (error) {
    return apiError(error);
  }
}
