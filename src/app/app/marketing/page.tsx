import { ExternalLink } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { MarketingIdeaActions, MarketingMediaPanel, MarketingTaskForm } from "./marketing-actions";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const tasks = await prisma.marketingTask.findMany({
    where: { tenantId: session.tenantId },
    include: { media: true, comments: true, project: true },
    orderBy: { updatedAt: "desc" },
  });
  const mediaCount = tasks.reduce((sum, task) => sum + task.media.length, 0);
  const approvedIdeas = tasks.filter((task) => task.status === "APPROVED");
  const teamIdeas = tasks.filter((task) => task.status !== "APPROVED");

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 xl:flex-row xl:items-end">
        <div>
          <div className="text-sm text-slate-500">Operations</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Marketing workflow</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Manage team ideas, approve the right ones, and keep only media upload on this module.
          </p>
        </div>
      </div>
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <div className="text-2xl font-semibold">{approvedIdeas.length}</div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Total tasks</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold">{teamIdeas.length}</div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Active tasks</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-semibold">{mediaCount}</div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Media files</div>
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold">Team ideas</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {teamIdeas.map((task) => (
                <article key={task.id} className="rounded-xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-500">{task.assignee || "Unassigned"}</div>
                      <h3 className="mt-1 font-semibold">{task.title}</h3>
                    </div>
                    <span className="chip bg-slate-100 text-slate-700">{task.status.replaceAll("_", " ")}</span>
                  </div>
                  {task.dueAt ? <div className="mt-3 text-sm text-slate-500">Deadline: {new Date(task.dueAt).toLocaleDateString("en-IN")}</div> : null}
                  <p className="mt-3 text-sm leading-6 text-slate-600">{task.brief}</p>
                  {Array.isArray(task.links) && task.links.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {task.links.filter((item): item is string => typeof item === "string").map((link) => (
                        <a className="btn-outline h-8 px-3 text-xs" href={link} key={link} target="_blank" rel="noreferrer">
                          <ExternalLink size={13} />
                          Open link
                        </a>
                      ))}
                    </div>
                  ) : null}
                  <MarketingIdeaActions taskId={task.id} />
                </article>
              ))}
              {!teamIdeas.length ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 lg:col-span-2">
                  No team ideas yet.
                </div>
              ) : null}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold">Approved projects</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {approvedIdeas.map((task, index) => (
                <article key={task.id} className="rounded-xl border border-slate-200 p-5">
                  <div className="text-sm text-slate-500">Project {index + 1}</div>
                  <h3 className="mt-1 font-semibold">{task.title}</h3>
                  {task.dueAt ? <div className="mt-3 text-sm text-slate-500">Deadline: {new Date(task.dueAt).toLocaleDateString("en-IN")}</div> : null}
                  <div className="mt-3 text-sm text-slate-500">Assigned to: {task.assignee || "Unassigned"}</div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{task.brief}</p>
                </article>
              ))}
              {!approvedIdeas.length ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 lg:col-span-2">
                  No approved ideas yet.
                </div>
              ) : null}
            </div>
          </div>
        </section>
        <aside className="space-y-6">
          <MarketingTaskForm />
          <MarketingMediaPanel tasks={tasks.map((task) => ({ id: task.id, title: task.title }))} />
        </aside>
      </div>
    </main>
  );
}
