import { notFound } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { LetterStudioEditor } from "../../../../../workflow-action-forms";

export const dynamic = "force-dynamic";

export default async function LetterStudioPage({ params, searchParams }: { params: { projectId: string; plotId: string; documentId: string }; searchParams: { returnTo?: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  const [plot, document] = await Promise.all([
    prisma.plot.findFirst({
      where: { id: params.plotId, tenantId: session.tenantId, projectId: params.projectId, archivedAt: null },
      include: { project: true, currentOwner: true },
    }),
    prisma.generatedDocument.findFirst({
      where: { id: params.documentId, tenantId: session.tenantId, recordType: "Plot", recordId: params.plotId },
    }),
  ]);
  if (!plot || !document) notFound();
  const missingVariables = extractMissingVariables(document.data);
  const returnTo = safeReturnTo(searchParams.returnTo, plot.projectId);

  return (
      <LetterStudioEditor
        document={{
          id: document.id,
          number: document.number,
          type: document.type,
          status: document.status,
          editableHtml: document.editableHtml,
          fileAssetId: document.fileAssetId,
        }}
        missingVariables={missingVariables}
        backHref={returnTo ?? `/app/projects/${plot.projectId}/plots/${plot.id}?tab=documents`}
        arrangeHref={`/app/projects/${plot.projectId}/plots/${plot.id}/letters/${document.id}/pdf`}
        eyebrow={`${plot.project.name} / Plot ${plot.code}`}
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
