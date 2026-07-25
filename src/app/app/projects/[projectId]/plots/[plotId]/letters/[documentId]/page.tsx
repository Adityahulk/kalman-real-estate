import { notFound } from "next/navigation";
import { requirePagePermission } from "@/server/page-auth";
import { prisma } from "@/server/db";
import { hasPermission } from "@/server/rbac";
import { LetterStudioEditor } from "../../../../../workflow-action-forms";

export const dynamic = "force-dynamic";

export default async function LetterStudioPage(
  props: { params: Promise<{ projectId: string; plotId: string; documentId: string }>; searchParams: Promise<{ returnTo?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const session = await requirePagePermission("documents.view");
  const [plot, document] = await Promise.all([
    prisma.plot.findFirst({
      where: { id: params.plotId, tenantId: session.tenantId, projectId: params.projectId, archivedAt: null },
      include: { project: true, currentOwner: true },
    }),
    prisma.generatedDocument.findFirst({
      where: { id: params.documentId, tenantId: session.tenantId, recordType: "Plot", recordId: params.plotId, archivedAt: null },
    }),
  ]);
  if (!plot || !document) notFound();
  const missingVariables = extractMissingVariables(document.data);
  const returnTo = safeReturnTo(searchParams.returnTo, plot.projectId);

  // Resolve the people behind each workflow step so the letter can show a "who did what, when" trail.
  const actorIds = [document.submittedById, document.approvedById, document.signedById].filter(
    (value): value is string => Boolean(value),
  );
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
    : [];
  const actorName = (id: string | null) => (id ? actors.find((user) => user.id === id)?.name ?? null : null);
  const activity = [
    document.submittedAt
      ? { key: "submitted", label: "Submitted", by: actorName(document.submittedById), at: document.submittedAt.toISOString() }
      : null,
    document.approvedAt
      ? { key: "approved", label: "Approved", by: actorName(document.approvedById), at: document.approvedAt.toISOString() }
      : null,
    document.signedAt
      ? { key: "signed", label: "Signed", by: actorName(document.signedById), at: document.signedAt.toISOString() }
      : null,
  ].filter((entry): entry is { key: string; label: string; by: string | null; at: string } => Boolean(entry));

  return (
      <LetterStudioEditor
        document={{
          id: document.id,
          number: document.number,
          type: document.type,
          status: document.status,
          editableHtml: document.editableHtml,
          fileAssetId: document.fileAssetId,
          signedFileAssetId: document.signedFileAssetId,
        }}
        can={{
          generate: hasPermission(session.role, "documents.generate", session.permissions),
          submit: hasPermission(session.role, "documents.submit", session.permissions),
          approve: hasPermission(session.role, "documents.approve", session.permissions),
          sign: hasPermission(session.role, "documents.sign", session.permissions),
        }}
        activity={activity}
        missingVariables={missingVariables}
        backHref={returnTo ?? `/app/projects/${plot.projectId}/plots/${plot.id}?tab=documents`}
        arrangeHref={`/app/projects/${plot.projectId}/plots/${plot.id}/letters/${document.id}/pdf`}
        eyebrow={`${plot.project.name} / Plot ${plot.code}`}
        signedUploadPlotId={plot.id}
      />
  );
}

function safeReturnTo(value: string | undefined, projectId: string) {
  if (!value) return null;
  try {
    const decoded = decodeURIComponent(value);
    return decoded.startsWith(`/app/projects/${projectId}/`) ? decoded : null;
  } catch {
    return null;
  }
}

function extractMissingVariables(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const value = (data as Record<string, unknown>).missingVariables;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
