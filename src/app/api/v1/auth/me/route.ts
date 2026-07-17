import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, verifySessionToken } from "@/server/session";
import { prisma } from "@/server/db";
import { apiError } from "@/server/api";

export async function GET(request: NextRequest) {
  try {
    // Native (Capacitor) clients re-hydrate their session with the bearer token they stored at
    // login; the web app relies on the httpOnly cookie read by getSessionUser().
    const bearer = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization")?.trim() ?? "")?.[1];
    const session = (await getSessionUser()) ?? (await verifySessionToken(bearer));
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
