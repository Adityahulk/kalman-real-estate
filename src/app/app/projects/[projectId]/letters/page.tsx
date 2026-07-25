import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";
import { listLetterFieldSettings } from "@/server/services/letter-field-settings";
import { ensureProjectLetterTemplates } from "@/server/services/document-templates";
import { HtmlTemplateEditor } from "../../html-template-editor";

export const dynamic = "force-dynamic";

export default async function ProjectLettersPage(props: { params: Promise<{ projectId: string }> }) {
  const params = await props.params;
  const session = await requirePagePermission("projects.manage");
  const project = await prisma.project.findFirst({ where: { id: params.projectId, tenantId: session.tenantId } });
  if (!project) notFound();
  await ensureProjectLetterTemplates(session.tenantId, project.id);
  const [templates, categories] = await Promise.all([
    prisma.documentTemplate.findMany({
      where: { tenantId: session.tenantId, projectId: project.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, type: true, body: true, variables: true, active: true, createdAt: true },
    }),
    listLetterFieldSettings(session.tenantId),
  ]);
  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-8">
      <BackButton fallbackHref={`/app/projects/${project.id}`} />
      <div className="mb-5">
        <div className="text-sm text-slate-500">{project.name}</div>
        <h1 className="mt-1 text-2xl font-semibold">Set your letters</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create and edit letter templates with dynamic fields. Insert variables that auto-fill with project and plot data during generation.
        </p>
      </div>
      <HtmlTemplateEditor
        projectId={project.id}
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          body: t.body,
          variables: t.variables,
          active: t.active,
          createdAt: t.createdAt.toISOString(),
        }))}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          fields: category.fields.map((field) => ({ id: field.id, label: field.label, mapping: field.mapping })),
        }))}
      />
    </main>
  );
}
