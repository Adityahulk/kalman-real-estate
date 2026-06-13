import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { hasPermission } from "@/server/rbac";
import { getSessionUser } from "@/server/session";
import { CadStudio } from "./cad-studio";

export const dynamic = "force-dynamic";

export default async function CadStudioPage({ params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.role, "cad.review")) notFound();
  const cadFile = await prisma.cadFile.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    include: {
      scenes: { select: { id: true }, take: 1 },
      overlays: {
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!cadFile) notFound();
  if (cadFile.format !== "DXF" && cadFile.format !== "DWG") {
    redirect(`/app/cad/${cadFile.id}/review`);
  }
  const viewState = cadFile.overlays.find((overlay) => overlay.kind === "VIEW_STATE" && overlay.createdById === session.id);
  const metadata = viewState?.metadata;
  return (
    <CadStudio
      cadFile={{
        id: cadFile.id,
        originalName: cadFile.originalName,
        version: cadFile.version,
        status: cadFile.status,
        projectId: cadFile.projectId,
        format: cadFile.format,
      }}
      initialState={metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : null}
      initialOverlays={cadFile.overlays
        .filter((overlay) => overlay.kind !== "VIEW_STATE")
        .map((overlay) => ({
          id: overlay.id,
          kind: overlay.kind,
          label: overlay.label,
          sourceHandle: overlay.sourceHandle,
          metadata: overlay.metadata,
          updatedAt: overlay.updatedAt.toISOString(),
        }))}
      hasScene={cadFile.scenes.length > 0}
    />
  );
}
