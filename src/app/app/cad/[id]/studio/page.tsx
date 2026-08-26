import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { hasPermission } from "@/server/rbac";
import { requireAnyPagePermission } from "@/server/page-auth";
import { CadStudio } from "./cad-studio";
import { DeleteCadButton } from "@/components/delete-cad-button";

export const dynamic = "force-dynamic";

export default async function CadStudioPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requireAnyPagePermission(["cad.view", "cad.review"]);
  const cadFile = await prisma.cadFile.findFirst({
    where: { id: params.id, tenantId: session.tenantId, ...(Array.isArray(session.projectIds) ? { projectId: { in: session.projectIds } } : {}) },
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
      headerActions={hasPermission(session.role, "cad.delete", session.permissions) ? (
        <DeleteCadButton
          cadFileId={cadFile.id}
          fileName={cadFile.originalName}
          published={cadFile.status === "PUBLISHED"}
          redirectTo={cadFile.projectId ? `/app/projects/${cadFile.projectId}/cad?view=project` : "/app"}
        />
      ) : null}
    />
  );
}
