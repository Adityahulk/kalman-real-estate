import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";

export const dynamic = "force-dynamic";

export default async function LegacyDevelopmentPage() {
  const session = await requirePagePermission("development.view");
  const project = await prisma.project.findFirst({
    where: { tenantId: session.tenantId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  redirect(project ? `/app/projects/${project.id}/development` : "/app");
}
