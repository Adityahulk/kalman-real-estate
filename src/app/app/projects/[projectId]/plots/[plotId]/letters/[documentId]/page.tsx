import { notFound } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { LetterStudioEditor } from "../../../../../workflow-action-forms";
import { pdfLayoutDocumentSchema } from "@/lib/pdf-layout";

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
          exactPdfTemplate: hasExactPdfTemplate(document.data),
          exactPdfFields: exactPdfFields(document.data),
          editableLayout: pdfLayoutDocumentSchema.safeParse(document.editableLayout).success
            ? pdfLayoutDocumentSchema.parse(document.editableLayout)
            : null,
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

function hasExactPdfTemplate(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const value = (data as Record<string, unknown>).exactPdfTemplate;
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function exactPdfFields(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const record = data as Record<string, unknown>;
  const template = record.exactPdfTemplate;
  const variables = record.variables && typeof record.variables === "object" && !Array.isArray(record.variables)
    ? record.variables as Record<string, unknown>
    : {};
  const overrides = record.exactPdfValues && typeof record.exactPdfValues === "object" && !Array.isArray(record.exactPdfValues)
    ? record.exactPdfValues as Record<string, unknown>
    : {};
  const fields = template && typeof template === "object" && !Array.isArray(template) && Array.isArray((template as Record<string, unknown>).fields)
    ? (template as { fields: unknown[] }).fields
    : [];
  return fields.flatMap((field) => {
    if (!field || typeof field !== "object" || Array.isArray(field)) return [];
    const item = field as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id : "";
    if (!id) return [];
    const key = `field.${id}`;
    return [{
      id,
      key,
      label: typeof item.label === "string" ? item.label : id,
      sourceText: typeof item.sourceText === "string" ? item.sourceText : "",
      mapping: typeof item.mapping === "string" ? item.mapping : null,
      value: String(overrides[key] ?? variables[key] ?? item.sourceText ?? ""),
    }];
  });
}
