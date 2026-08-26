import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";

export const dynamic = "force-dynamic";

export default async function LegacyCadPage() {
  const session = await requirePagePermission("cad.view");
  const project = await prisma.project.findFirst({
    where: { tenantId: session.tenantId, ...(Array.isArray(session.projectIds) ? { id: { in: session.projectIds } } : {}) },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  redirect(project ? `/app/projects/${project.id}/cad` : "/app");
}
