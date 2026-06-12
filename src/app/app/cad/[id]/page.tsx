import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { CadWorkspace } from "./cad-workspace";
import { BackButton } from "@/components/back-button";

export const dynamic = "force-dynamic";

export default async function CadReviewPage({ params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) return null;

  const cadFile = await prisma.cadFile.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    include: {
      scenes: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { layers: true, entities: { orderBy: { createdAt: "asc" }, include: { spatialLinks: true } } },
      },
      analysis: true,
      reviewIssues: { where: { resolved: false }, orderBy: { createdAt: "desc" } },
      versions: { orderBy: { version: "desc" } },
    },
  });

  if (!cadFile) notFound();
  const scene = cadFile.scenes[0];

  return (
    <main className="px-4 py-5 lg:px-6">
      <BackButton fallbackHref={cadFile.projectId ? `/app/projects/${cadFile.projectId}/cad` : "/app/cad"} />
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="text-sm text-slate-500">
            {cadFile.parentType} / {cadFile.parentId}
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{cadFile.originalName}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Pan, inspect, review, search, layer-toggle, and publish extracted Map intelligence into live business records.
          </p>
        </div>
        <span className="chip bg-slate-100 text-slate-700">{cadFile.status.replaceAll("_", " ")}</span>
      </div>
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
    </main>
  );
}
