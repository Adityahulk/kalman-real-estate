import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";

export async function GET(_request: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: { tenant: true },
  });

  return NextResponse.json({
    ok: true,
    data: {
      id: session.id,
      tenantId: session.tenantId,
      role: session.role,
      email: session.email,
      name: user?.name,
      tenant: user?.tenant,
    },
  });
}
