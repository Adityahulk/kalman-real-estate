import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function LegacyCadPage() {
  const session = await getSessionUser();
  if (!session) return null;
  const project = await prisma.project.findFirst({
    where: { tenantId: session.tenantId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  redirect(project ? `/app/projects/${project.id}/cad` : "/app");
}
