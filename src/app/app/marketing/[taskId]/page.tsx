import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { MarketingMediaPanel, MarketingProjectDetailEditor } from "../marketing-actions";

export const dynamic = "force-dynamic";

export default async function MarketingProjectDetailPage({ params }: { params: { taskId: string } }) {
  const session = await getSessionUser();
  if (!session) return null;

  const task = await prisma.marketingTask.findFirst({
    where: { id: params.taskId, tenantId: session.tenantId, status: "APPROVED" },
    include: { media: true },
  });

  if (!task) notFound();

  const links = Array.isArray(task.links) ? task.links.filter((item): item is string => typeof item === "string") : [];

  return (
    <main className="px-4 py-6 lg:px-8">
      <BackButton fallbackHref="/app/marketing" />
      <header className="mb-6 border-b border-slate-200 pb-5">
        <div className="text-sm text-slate-500">Approved project</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{task.title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Review project details and upload task media from here.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <MarketingProjectDetailEditor
          task={{
            id: task.id,
            title: task.title,
            brief: task.brief,
            assignee: task.assignee ?? null,
            dueAt: task.dueAt?.toISOString() ?? null,
            links,
            status: task.status,
          }}
        />
        <aside className="space-y-6">
          <MarketingMediaPanel tasks={[{ id: task.id, title: task.title }]} />
        </aside>
      </div>
    </main>
  );
}
