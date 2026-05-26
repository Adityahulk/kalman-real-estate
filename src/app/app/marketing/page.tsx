import { Clapperboard, MessageSquareText, Video } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { MarketingMediaPanel, MarketingTaskForm } from "./marketing-actions";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({ where: { tenantId: session.tenantId }, orderBy: { name: "asc" } }),
    prisma.marketingTask.findMany({
      where: { tenantId: session.tenantId },
      include: { media: true, comments: true, project: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Marketing workflow</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Marketing head assigns shoots, videographer uploads raw media, editor uploads drafts, and approvals preserve version history.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <MarketingTaskForm projects={projects.map((project) => ({ id: project.id, name: project.name }))} />
          <MarketingMediaPanel tasks={tasks.map((task) => ({ id: task.id, title: task.title }))} />
        </div>
        <section className="grid gap-4 lg:grid-cols-2">
          {tasks.map((task) => (
            <article key={task.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-500">{task.project.name}</div>
                  <h2 className="mt-1 font-semibold">{task.title}</h2>
                </div>
                <span className="chip bg-slate-100 text-slate-700">{task.status.replaceAll("_", " ")}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{task.brief}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <Video size={16} />
                  <div className="mt-2 font-medium">{task.media.length} media files</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <MessageSquareText size={16} />
                  <div className="mt-2 font-medium">{task.comments.length} comments</div>
                </div>
              </div>
            </article>
          ))}
          {!tasks.length ? (
            <div className="card p-8 text-center text-sm text-slate-500">
              <Clapperboard className="mx-auto mb-3" />
              No marketing tasks yet.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
