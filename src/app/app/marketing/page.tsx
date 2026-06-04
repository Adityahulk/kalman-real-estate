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
  const mediaCount = tasks.reduce((sum, task) => sum + task.media.length, 0);
  const commentCount = tasks.reduce((sum, task) => sum + task.comments.length, 0);
  const openTasks = tasks.filter((task) => !["APPROVED", "COMPLETED"].includes(task.status)).length;

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 xl:flex-row xl:items-end">
        <div>
          <div className="text-sm text-slate-500">Operations</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Marketing workflow</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Track shoots, raw media, edits, comments, and approvals in one place.
          </p>
        </div>
      </div>
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-2xl font-semibold">{tasks.length}</div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Total tasks</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold">{openTasks}</div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Active tasks</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold">{mediaCount}</div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Media files</div>
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
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
        <aside className="space-y-6">
          <MarketingTaskForm projects={projects.map((project) => ({ id: project.id, name: project.name }))} />
          <MarketingMediaPanel tasks={tasks.map((task) => ({ id: task.id, title: task.title }))} />
          <div className="card p-4 text-sm text-slate-600">
            <div className="font-semibold text-navy-900">Review activity</div>
            <div className="mt-1">{commentCount} comments across active and completed marketing tasks.</div>
          </div>
        </aside>
      </div>
    </main>
  );
}
