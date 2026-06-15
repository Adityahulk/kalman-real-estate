import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { pdfLayoutDocumentSchema } from "@/lib/pdf-layout";
import { listLetterFieldSettings } from "@/server/services/letter-field-settings";
import { LetterTemplateBuilder } from "../../letter-template-builder";

export const dynamic = "force-dynamic";

export default async function ProjectLettersPage({ params }: { params: { projectId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;
  const project = await prisma.project.findFirst({ where: { id: params.projectId, tenantId: session.tenantId } });
  if (!project) notFound();
  const [templates, categories] = await Promise.all([
    prisma.documentTemplate.findMany({ where: { tenantId: session.tenantId, projectId: project.id, editorMode: "PDF_LAYOUT" }, orderBy: { createdAt: "desc" } }),
    listLetterFieldSettings(session.tenantId),
  ]);
  const sourceIds = templates.map((template) => template.sourceFileId).filter(Boolean) as string[];
  const sources = await prisma.fileAsset.findMany({ where: { id: { in: sourceIds }, tenantId: session.tenantId }, select: { id: true, fileName: true } });
  const sourceNames = new Map(sources.map((source) => [source.id, source.fileName]));
  const pdfTemplates = templates.flatMap((template) => {
    const layout = pdfLayoutDocumentSchema.safeParse(template.layoutData);
    return template.sourceFileId && sourceNames.get(template.sourceFileId)?.toLowerCase().endsWith(".pdf") && layout.success
      ? [{
          id: template.id,
          name: template.name,
          type: template.type,
          sourceFileId: template.sourceFileId,
          active: template.active,
          layoutData: layout.data,
          createdAt: template.createdAt.toISOString(),
        }]
      : [];
  });
  return <main className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-8"><BackButton fallbackHref={`/app/projects/${project.id}`} /><div className="mb-5"><div className="text-sm text-slate-500">{project.name}</div><h1 className="mt-1 text-2xl font-semibold">Set your letters</h1><p className="mt-1 text-sm text-slate-500">Upload a PDF, edit its text directly, and select text to connect live project data. The original letterhead and page design stay in place.</p></div><LetterTemplateBuilder projectId={project.id} categories={categories.map((category) => ({ id: category.id, name: category.name, fields: category.fields.map((field) => ({ id: field.id, label: field.label, mapping: field.mapping })) }))} templates={pdfTemplates} /></main>;
}
