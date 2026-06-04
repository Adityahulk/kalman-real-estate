import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { ActionHint, ActionPageShell } from "../../../../../action-page-shell";
import { LetterStudioEditor } from "../../../../../workflow-action-forms";
import { DocumentApprovalButtons } from "../../../../../../documents/document-actions";

export const dynamic = "force-dynamic";

export default async function LetterStudioPage({ params }: { params: { projectId: string; plotId: string; documentId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  const [plot, document] = await Promise.all([
    prisma.plot.findFirst({
      where: { id: params.plotId, tenantId: session.tenantId, projectId: params.projectId },
      include: { project: true, currentOwner: true },
    }),
    prisma.generatedDocument.findFirst({
      where: { id: params.documentId, tenantId: session.tenantId, recordType: "Plot", recordId: params.plotId },
    }),
  ]);
  if (!plot || !document) notFound();
  const missingVariables = extractMissingVariables(document.data);

  return (
    <ActionPageShell
      eyebrow={`${plot.project.name} / ${plot.code}`}
      title="Letter Studio"
      description="Edit the auto-filled draft, preview the letter, generate the final PDF, then approve or issue it."
      backHref={`/app/projects/${plot.projectId}/plots/${plot.id}?tab=documents`}
      backLabel="Back to documents"
      aside={
        <>
          <ActionHint title="Letter status">
            <div className="flex items-center gap-2">
              <FileText size={16} />
              {document.number ?? document.type} · {document.status.replaceAll("_", " ")}
            </div>
          </ActionHint>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="mb-3 font-semibold">Approval</div>
            <DocumentApprovalButtons documentId={document.id} />
          </div>
        </>
      }
    >
      <LetterStudioEditor
        document={{
          id: document.id,
          number: document.number,
          type: document.type,
          status: document.status,
          editableHtml: document.editableHtml,
          fileAssetId: document.fileAssetId,
        }}
        projectId={plot.projectId}
        plotId={plot.id}
        missingVariables={missingVariables}
      />
    </ActionPageShell>
  );
}

function extractMissingVariables(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const value = (data as Record<string, unknown>).missingVariables;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
