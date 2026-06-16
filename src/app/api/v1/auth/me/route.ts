import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { apiError } from "@/server/api";

export async function GET(_request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    }

    const hasSelectedFirm = session.tenantId !== "__unselected__";

    const [user, tenant] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.id }, select: { name: true } }),
      hasSelectedFirm ? prisma.tenant.findUnique({ where: { id: session.tenantId } }) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        id: session.id,
        tenantId: hasSelectedFirm ? session.tenantId : null,
        role: session.role,
        email: session.email,
        name: user?.name,
        tenant,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
