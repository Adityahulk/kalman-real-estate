import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { prisma } from "@/server/db";
import { requireAnyPagePermission } from "@/server/page-auth";
import { MarketingIdeaActions } from "./marketing-actions";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const session = await requireAnyPagePermission(["marketing.manage", "marketing.execute"]);

  const tasks = await prisma.marketingTask.findMany({
    where: {
      tenantId: session.tenantId,
      archivedAt: null,
      ...(Array.isArray(session.projectIds) ? { projectId: { in: session.projectIds } } : {}),
    },
    include: { media: true, comments: true, project: true },
    orderBy: { updatedAt: "desc" },
  });
  const mediaFileIds = tasks.flatMap((task) => task.media.map((media) => media.fileAssetId));
  const activeMediaFiles = mediaFileIds.length
    ? await prisma.fileAsset.findMany({
        where: { tenantId: session.tenantId, id: { in: mediaFileIds }, deletedAt: null },
        select: { id: true },
      })
    : [];
  const activeMediaIds = new Set(activeMediaFiles.map((file) => file.id));
  const mediaCount = activeMediaIds.size;
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
        <Link className="btn-primary h-10 px-4" href="/app/marketing/new">
          <Plus size={16} />
          Add new project idea
        </Link>
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
                    <span className="chip bg-slate-100 text-slate-700">{marketingStatusLabel(task.status)}</span>
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
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Deadline</th>
                    <th className="px-4 py-3">Media</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
              {approvedIdeas.map((task, index) => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link className="font-medium text-navy-900 hover:text-navy-700" href={`/app/marketing/${task.id}`}>
                        Project {index + 1} · {task.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {task.dueAt ? new Date(task.dueAt).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {task.media.filter((media) => activeMediaIds.has(media.fileAssetId)).length}
                    </td>
                  </tr>
              ))}
                </tbody>
              </table>
              {!approvedIdeas.length ? <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No approved ideas yet.</div> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function marketingStatusLabel(status: string) {
  if (status === "APPROVED") return "APPROVED";
  return "TEAM IDEA";
}
