import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { hasPermission } from "@/server/rbac";

export const dynamic = "force-dynamic";

export default async function CadEntryPage({ params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.role, "cad.review", session.permissions)) notFound();
  const cadFile = await prisma.cadFile.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: { format: true },
  });
  if (!cadFile) notFound();
  redirect(
    cadFile.format === "DXF" || cadFile.format === "DWG"
      ? `/app/cad/${params.id}/studio`
      : `/app/cad/${params.id}/review`,
  );
}
