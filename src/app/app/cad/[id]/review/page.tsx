import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { hasPermission } from "@/server/rbac";
import { requireAnyPagePermission } from "@/server/page-auth";
import { CadModeHeader } from "../cad-mode-header";
import { CadWorkspace } from "../cad-workspace";
import { DeleteCadButton } from "@/components/delete-cad-button";

export const dynamic = "force-dynamic";

export default async function CadReviewPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requireAnyPagePermission(["cad.view", "cad.review"]);
  const cadFile = await prisma.cadFile.findFirst({
    where: { id: params.id, tenantId: session.tenantId, ...(Array.isArray(session.projectIds) ? { projectId: { in: session.projectIds } } : {}) },
    include: {
      scenes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          layers: true,
          entities: {
            orderBy: { createdAt: "asc" },
            include: { spatialLinks: true },
          },
        },
      },
      analysis: true,
      reviewIssues: { where: { resolved: false }, orderBy: { createdAt: "desc" } },
      versions: { orderBy: { version: "desc" } },
    },
  });
  if (!cadFile) notFound();
  const scene = cadFile.scenes[0];
  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-100">
      <CadModeHeader
        cadFileId={cadFile.id}
        drawingName={cadFile.originalName}
        version={cadFile.version}
        status={cadFile.status}
        projectId={cadFile.projectId}
        activeMode="review"
        format={cadFile.format}
        actions={hasPermission(session.role, "cad.delete", session.permissions) ? (
          <DeleteCadButton
            cadFileId={cadFile.id}
            fileName={cadFile.originalName}
            published={cadFile.status === "PUBLISHED"}
            redirectTo={cadFile.projectId ? `/app/projects/${cadFile.projectId}/cad?view=project` : "/app"}
          />
        ) : null}
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        <CadWorkspace
          cadFile={{
            id: cadFile.id,
            originalName: cadFile.originalName,
            format: cadFile.format,
            status: cadFile.status,
            parentType: cadFile.parentType,
            parentId: cadFile.parentId,
            version: cadFile.version,
            projectId: cadFile.projectId,
            errorMessage: cadFile.errorMessage,
            processingLog: cadFile.processingLog,
          }}
          analysis={cadFile.analysis ? {
            discipline: cadFile.analysis.discipline,
            sourceKind: cadFile.analysis.sourceKind,
            pageNumber: cadFile.analysis.pageNumber,
            proposedRegion: cadFile.analysis.proposedRegion,
            confirmedRegion: cadFile.analysis.confirmedRegion,
            excludedRegions: cadFile.analysis.excludedRegions,
            expectedCounts: cadFile.analysis.expectedCounts,
            scaleCalibration: cadFile.analysis.scaleCalibration,
            inspection: cadFile.analysis.inspection,
            setupConfirmedAt: cadFile.analysis.setupConfirmedAt,
            calibrationConfirmedAt: cadFile.analysis.calibrationConfirmedAt,
            previewArtifactKey: cadFile.analysis.previewArtifactKey,
          } : null}
          scene={scene ? {
            id: scene.id,
            bounds: scene.bounds,
            layers: scene.layers,
            entities: scene.entities.map((entity) => ({
              id: entity.id,
              layerId: entity.layerId,
              type: entity.type,
              label: entity.label,
              confidence: entity.confidence.toString(),
              geometry: entity.geometry,
              measurements: entity.measurements,
              validation: entity.validation,
              status: entity.status,
              sourceHandle: entity.sourceHandle,
              sourceLayer: entity.sourceLayer,
              spatialLinks: entity.spatialLinks.map((link) => ({
                id: link.id,
                recordType: link.recordType,
                recordId: link.recordId,
                linkConfidence: link.linkConfidence.toString(),
              })),
            })),
          } : null}
          issues={cadFile.reviewIssues.map((issue) => ({
            id: issue.id,
            entityId: issue.entityId,
            severity: issue.severity,
            code: issue.code,
            message: issue.message,
            blocking: issue.blocking,
          }))}
          versions={cadFile.versions.map((version) => ({
            id: version.id,
            version: version.version,
            status: version.status,
            publishedAt: version.publishedAt,
          }))}
        />
      </div>
    </main>
  );
}
