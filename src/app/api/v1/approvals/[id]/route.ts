import { NextRequest } from "next/server";
import { ApprovalStatus } from "@prisma/client";
import { z } from "zod";
import { apiError, getRequestContext, ok, parseJson } from "@/server/api";
import { prisma } from "@/server/db";

const schema = z.object({
  status: z.enum([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.CHANGES_REQUESTED]),
  note: z.string().max(1000).optional(),
});

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "tenant.manage");
    const input = await parseJson(request, schema);
    const approval = await prisma.approval.findFirstOrThrow({ where: { id: params.id, tenantId: context.tenantId } });
    return ok(await prisma.approval.update({
      where: { id: approval.id },
      data: {
        status: input.status,
        notes: input.note ?? approval.notes,
        decidedById: context.userId,
        decidedAt: new Date(),
      },
    }));
  } catch (error) {
    return apiError(error);
  }
}
