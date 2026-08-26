import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { requireAnyPagePermission } from "@/server/page-auth";

export const dynamic = "force-dynamic";

export default async function CadEntryPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requireAnyPagePermission(["cad.view", "cad.review"]);
  const cadFile = await prisma.cadFile.findFirst({
    where: { id: params.id, tenantId: session.tenantId, ...(Array.isArray(session.projectIds) ? { projectId: { in: session.projectIds } } : {}) },
    select: { format: true },
  });
  if (!cadFile) notFound();
  redirect(
    cadFile.format === "DXF" || cadFile.format === "DWG"
      ? `/app/cad/${params.id}/studio`
      : `/app/cad/${params.id}/review`,
  );
}
