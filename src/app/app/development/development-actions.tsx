"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, ExternalLink, FileStack, Loader2, Pencil, Plus, Search, Trash2, Upload, UserRound, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";

type PlanFile = {
  id: string;
  fileName: string;
  mimeType: string;
  taskId: string;
  taskName: string;
};

type TaskItem = {
  id: string;
  name: string;
  category: string;
  totalArea: string | null;
  units: string | null;
  deadline: string | null;
  status: string;
  progressPct: number;
  assignedTo: string | null;
  planFiles: PlanFile[];
};

type TaskUpdate = {
  id: string;
  progressPct: number;
  quantityDone: string | null;
  recordedAt: string | null;
  remarks: string;
  attachments: Array<{ id: string; fileName: string }>;
};

type TaskDetail = TaskItem & {
  projectId: string;
  updates: TaskUpdate[];
};

type TaskFormInput = {
  id?: string;
  name: string;
  category: string;
  totalArea: string;
  units: string;
  deadline: string;
  assignedTo?: string;
  status?: "PLANNED" | "IN_PROGRESS" | "COMPLETED";
};

export function DevelopmentTaskDashboard({
  projectId,
  projectName,
  projectLocation,
  categories,
  tasks,
}: {
  projectId: string;
  projectName: string;
  projectLocation: string;
  categories: string[];
  tasks: TaskItem[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskFormInput | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const matchesQuery = !query.trim() || `${task.name} ${task.category} ${task.assignedTo ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCategory = category === "all" || task.category === category;
    const isDelayed = Boolean(task.deadline && new Date(task.deadline) < new Date() && task.status !== "COMPLETED");
    return matchesQuery && matchesCategory && (!delayedOnly || isDelayed);
  }), [category, delayedOnly, query, tasks]);

  const ongoingTasks = filteredTasks.filter((task) => task.status === "IN_PROGRESS");
  const upcomingTasks = filteredTasks.filter((task) => task.status === "PLANNED").sort(compareDeadlines);
  const delayedTasks = filteredTasks.filter((task) => task.deadline && new Date(task.deadline) < new Date() && task.status !== "COMPLETED");
  const planFiles = filteredTasks.flatMap((task) => task.planFiles);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm text-slate-500">{projectLocation}</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{projectName} development</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Track plans, assign work, monitor delays, and record site progress in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className={showPlans ? "btn-primary" : "btn-outline"}
            type="button"
            onClick={() => setShowPlans((current) => !current)}
          >
            <FileStack size={16} />
            View plans
          </button>
          <button
            className={showTaskForm || editingTask ? "btn-primary" : "btn-outline"}
            type="button"
            onClick={() => {
              setEditingTask(null);
              setShowTaskForm((current) => !current);
            }}
          >
            <Plus size={16} />
            Add task
          </button>
        </div>
      </header>

      {showPlans || showTaskForm || editingTask ? (
        <section className="grid gap-6 xl:grid-cols-2">
          {showPlans ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <FileStack size={18} />
                <h2 className="font-semibold">View plans</h2>
              </div>
              <div className="space-y-3">
                {planFiles.map((file) => (
                  <div className="rounded-lg border border-slate-200 p-3 text-sm" key={file.id}>
                    <div className="font-medium">{file.taskName}</div>
                    <div className="mt-1 text-slate-500">{file.fileName}</div>
                    <div className="mt-3">
                      <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/files/${file.id}/download?disposition=inline&proxy=1`} target="_blank" rel="noreferrer">
                        <ExternalLink size={13} />
                        Open plan
                      </a>
                    </div>
                  </div>
                ))}
                {!planFiles.length ? <EmptyBlock label="No task plans uploaded yet." /> : null}
              </div>
            </section>
          ) : null}

          {showTaskForm || editingTask ? (
            <DevelopmentTaskForm
              projectId={projectId}
              categories={categories}
              initialTask={editingTask ?? undefined}
              onDone={() => {
                setEditingTask(null);
                setShowTaskForm(false);
              }}
            />
          ) : null}
        </section>
      ) : null}

      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard icon={Wrench} label="Ongoing task" value={ongoingTasks.length} accent="text-navy-900" />
          <MetricCard icon={AlertTriangle} label="Delayed tasks" value={delayedTasks.length} accent="text-amber-600" />
          <MetricCard icon={Clock3} label="Upcoming tasks" value={upcomingTasks.length} accent="text-slate-700" />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="font-semibold">Search and filters</h2>
            <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_auto]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
                <input className="input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" />
              </label>
              <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">All categories</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700">
                <input type="checkbox" checked={delayedOnly} onChange={(event) => setDelayedOnly(event.target.checked)} />
                Delayed only
              </label>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <TaskListCard
            title="All ongoing tasks"
            empty="No ongoing tasks yet."
            tasks={ongoingTasks}
            projectId={projectId}
            onEdit={(task) => {
              setEditingTask(toTaskFormInput(task));
              setShowTaskForm(true);
            }}
            showManageActions={false}
          />
          <TaskListCard
            title="All upcoming tasks"
            empty="No upcoming tasks yet."
            tasks={upcomingTasks}
            onEdit={(task) => {
              setEditingTask(toTaskFormInput(task));
              setShowTaskForm(true);
            }}
            projectId={projectId}
            showManageActions
          />
        </section>
      </div>
    </div>
  );
}

function TaskListCard({
  title,
  tasks,
  empty,
  projectId,
  onEdit,
  showManageActions,
}: {
  title: string;
  tasks: TaskItem[];
  empty: string;
  projectId?: string;
  onEdit: (task: TaskItem) => void;
  showManageActions: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            projectId={projectId}
            onEdit={() => onEdit(task)}
            showManageActions={showManageActions}
          />
        ))}
        {!tasks.length ? <EmptyBlock label={empty} /> : null}
      </div>
    </section>
  );
}

function TaskRow({
  task,
  projectId,
  onEdit,
  showManageActions,
}: {
  task: TaskItem;
  projectId?: string;
  onEdit: () => void;
  showManageActions: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function assignTask() {
    const assignedTo = window.prompt("Assign task to", task.assignedTo ?? "");
    if (!assignedTo?.trim()) return;
    setBusy(true);
    const response = await fetch(`/api/v1/development/site-assets/${task.id}/assign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assignedTo: assignedTo.trim() }),
    });
    setBusy(false);
    if (!response.ok) window.alert((await response.json()).error ?? "Could not assign task.");
    else router.refresh();
  }

  async function deleteTask() {
    if (!window.confirm(`Delete "${task.name}"?`)) return;
    setBusy(true);
    const response = await fetch(`/api/v1/development/site-assets/${task.id}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) window.alert((await response.json()).error ?? "Could not delete task.");
    else router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <Link className="min-w-0 flex-1" href={`/app/projects/${projectId ?? ""}/development/assets/${task.id}`}>
          <div className="font-medium text-slate-900">{task.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-1">{task.category}</span>
            {task.deadline ? <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {formatDate(task.deadline)}</span> : null}
            {task.assignedTo ? <span className="inline-flex items-center gap-1"><UserRound size={12} /> {task.assignedTo}</span> : null}
          </div>
        </Link>
        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold text-slate-900">{task.progressPct}%</div>
          <div className="text-xs text-slate-500">{task.totalArea ?? "-"} {task.units ?? ""}</div>
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-gold-shine" style={{ width: `${task.progressPct}%` }} />
      </div>
      {showManageActions ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-outline h-8 px-3 text-xs" type="button" onClick={onEdit} disabled={busy}><Pencil size={13} /> Edit</button>
          <button className="btn-outline h-8 px-3 text-xs" type="button" onClick={() => void assignTask()} disabled={busy}><UserRound size={13} /> Assign</button>
          <button className="btn-outline h-8 px-3 text-xs text-rose-700" type="button" onClick={() => void deleteTask()} disabled={busy}><Trash2 size={13} /> Delete</button>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: typeof Wrench; label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <Icon className={accent} size={20} />
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">{label}</div>;
}

export function DevelopmentTaskForm({
  projectId,
  categories,
  initialTask,
  onDone,
}: {
  projectId: string;
  categories: string[];
  initialTask?: TaskFormInput;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialTask?.name ?? "");
  const [totalArea, setTotalArea] = useState(initialTask?.totalArea ?? "");
  const [units, setUnits] = useState(initialTask?.units ?? "");
  const [deadline, setDeadline] = useState(initialTask?.deadline ?? "");
  const [category, setCategory] = useState(initialTask?.category ?? categories[0] ?? "");
  const [assignedTo, setAssignedTo] = useState(initialTask?.assignedTo ?? "");
  const [planFiles, setPlanFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const payload = {
      name,
      totalArea: Number(totalArea),
      units,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      category,
      assignedTo: assignedTo || undefined,
      status: assignedTo ? "IN_PROGRESS" : "PLANNED",
      type: category,
      progressPct: initialTask ? undefined : 0,
      contractorId: assignedTo || undefined,
    };
    const response = await fetch(initialTask?.id ? `/api/v1/development/site-assets/${initialTask.id}` : `/api/v1/projects/${projectId}/site-assets`, {
      method: initialTask?.id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(initialTask?.id ? payload : {
        name: payload.name,
        totalArea: payload.totalArea,
        units: payload.units,
        deadline: payload.deadline,
        type: payload.category,
        contractorId: payload.contractorId,
        status: payload.status,
        progressPct: 0,
      }),
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(body.error ?? "Could not save task.");
      return;
    }

    const taskId = body.data?.id ?? body.data?.asset?.id ?? body.data?.assetId ?? body.data?.siteAsset?.id;
    if (taskId && planFiles.length) await uploadFilesForOwner(taskId, "SiteAsset", "development-plan", planFiles);
    setMessage(initialTask?.id ? "Task updated." : "Task created.");
    setPlanFiles([]);
    if (!initialTask) {
      setName("");
      setTotalArea("");
      setUnits("");
      setDeadline("");
      setAssignedTo("");
      if (categories[0]) setCategory(categories[0]);
    }
    onDone?.();
    router.refresh();
  }

  return (
    <form className="rounded-xl border border-slate-200 bg-white p-5" onSubmit={submit}>
      <h2 className="font-semibold">{initialTask ? "Edit task" : "Add task"}</h2>
      <div className="mt-4 grid gap-3">
        <label><span className="label">Name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} /></label>
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className="label">Area</span><input className="input" inputMode="decimal" value={totalArea} onChange={(event) => setTotalArea(event.target.value)} /></label>
          <label><span className="label">Units</span><input className="input" value={units} onChange={(event) => setUnits(event.target.value)} placeholder="sq ft / running ft / meters" /></label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className="label">Deadline</span><input className="input" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label>
          <label><span className="label">Category</span><select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
        <label><span className="label">Assign to <span className="font-normal text-slate-400">(optional)</span></span><input className="input" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="Engineer / contractor / staff name" /></label>
        <label><span className="label">Add plan file</span><input className="input pt-2" type="file" multiple onChange={(event) => setPlanFiles(Array.from(event.target.files ?? []))} /></label>
      </div>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4 w-full" disabled={loading || !name || !totalArea || !units || !category}>
        {loading ? <Loader2 className="animate-spin" size={16} /> : initialTask ? <Pencil size={16} /> : <Plus size={16} />}
        {initialTask ? "Save task" : "Add task"}
      </button>
    </form>
  );
}

export function DevelopmentTaskUpdateForm({ task }: { task: TaskDetail }) {
  const router = useRouter();
  const [areaDone, setAreaDone] = useState(task.totalArea ?? "");
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const numericTotalArea = Number(task.totalArea || 0);
  const nextProgress = numericTotalArea > 0 && Number(areaDone || 0) >= 0 ? Math.max(0, Math.min(100, Math.round((Number(areaDone || 0) / numericTotalArea) * 100))) : task.progressPct;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/v1/development/site-assets/${task.id}/progress`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        areaDone: Number(areaDone),
        recordedAt: new Date(recordedAt).toISOString(),
        summary: remarks,
        visibleToOwner: false,
      }),
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(body.error ?? "Could not update task.");
      return;
    }
    const progressId = body.data?.update?.id ?? body.data?.id;
    if (progressId && attachments.length) {
      const files = await uploadFilesForOwner(progressId, "ProgressUpdate", "development-progress", attachments);
      if (files.length) {
        await fetch(`/api/v1/development/progress/${progressId}/photos`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fileAssetIds: files.map((file) => file.id), visibleToOwner: false, summary: remarks || "Progress attachments uploaded." }),
        });
      }
    }
    router.refresh();
  }

  async function markComplete() {
    setLoading(true);
    const response = await fetch(`/api/v1/development/site-assets/${task.id}/complete`, { method: "POST" });
    setLoading(false);
    if (!response.ok) window.alert((await response.json()).error ?? "Could not mark task complete.");
    else router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Task details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Fact label="Task" value={task.name} />
          <Fact label="Category" value={task.category} />
          <Fact label="Area" value={`${task.totalArea ?? "-"} ${task.units ?? ""}`.trim()} />
          <Fact label="Deadline" value={task.deadline ? formatDate(task.deadline) : "-"} />
          <Fact label="Assigned to" value={task.assignedTo ?? "-"} />
          <Fact label="Status" value={task.status.replaceAll("_", " ")} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Progress boundary</h2>
            <p className="mt-1 text-sm text-slate-500">{task.progressPct}% done</p>
          </div>
          {task.progressPct >= 95 && task.progressPct < 100 ? <button className="btn-primary" type="button" onClick={() => void markComplete()} disabled={loading}><CheckCircle2 size={16} />Mark as complete</button> : null}
        </div>
        <div className="mt-4 h-3 rounded-full bg-slate-100">
          <div className="h-3 rounded-full bg-gold-shine" style={{ width: `${task.progressPct}%` }} />
        </div>
        <form className="mt-5 grid gap-3" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-2">
            <label><span className="label">Area done</span><input className="input" inputMode="decimal" value={areaDone} onChange={(event) => setAreaDone(event.target.value)} /></label>
            <label><span className="label">Date</span><input className="input" type="date" value={recordedAt} onChange={(event) => setRecordedAt(event.target.value)} /></label>
          </div>
          <label><span className="label">Remarks</span><textarea className="input min-h-24" value={remarks} onChange={(event) => setRemarks(event.target.value)} /></label>
          <label><span className="label">Attachments</span><input className="input pt-2" type="file" multiple accept="image/*" onChange={(event) => setAttachments(Array.from(event.target.files ?? []))} /></label>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">This update will set progress to {nextProgress}% based on {areaDone || "0"} / {task.totalArea || "0"} {task.units ?? ""}.</div>
          {message ? <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
          <button className="btn-primary w-fit" disabled={loading || !areaDone || !remarks}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
            Update task
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Area, date, remarks history</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Area done</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Remarks</th>
                <th className="px-3 py-2">Attachments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {task.updates.map((update) => (
                <tr key={update.id}>
                  <td className="px-3 py-2">{update.quantityDone ?? "-"} {task.units ?? ""}</td>
                  <td className="px-3 py-2">{update.recordedAt ? formatDate(update.recordedAt) : "-"}</td>
                  <td className="px-3 py-2">{update.remarks}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {update.attachments.map((file) => (
                        <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/files/${file.id}/download?disposition=inline&proxy=1`} key={file.id} target="_blank" rel="noreferrer">
                          {file.fileName}
                        </a>
                      ))}
                      {!update.attachments.length ? <span className="text-slate-400">-</span> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!task.updates.length ? <div className="mt-3 text-sm text-slate-500">No updates recorded yet.</div> : null}
        </div>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-slate-900">{value}</div></div>;
}

function toTaskFormInput(task: TaskItem): TaskFormInput {
  return {
    id: task.id,
    name: task.name,
    category: task.category,
    totalArea: task.totalArea ?? "",
    units: task.units ?? "",
    deadline: task.deadline ? task.deadline.slice(0, 10) : "",
    assignedTo: task.assignedTo ?? "",
    status: task.status === "COMPLETED" ? "COMPLETED" : task.status === "IN_PROGRESS" ? "IN_PROGRESS" : "PLANNED",
  };
}

function compareDeadlines(a: TaskItem, b: TaskItem) {
  if (!a.deadline && !b.deadline) return a.name.localeCompare(b.name);
  if (!a.deadline) return 1;
  if (!b.deadline) return -1;
  return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN");
}

async function uploadFilesForOwner(ownerId: string, ownerType: string, categoryKey: string, files: File[]) {
  const uploaded: Array<{ id: string; fileName: string }> = [];
  for (const file of files) {
    const metaResponse = await fetch("/api/v1/files/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        visibility: "TEAM",
        ownerType,
        ownerId,
        categoryKey,
        notes: `Uploaded from development task workflow (${categoryKey})`,
      }),
    });
    const metaBody = await metaResponse.json();
    if (!metaResponse.ok) throw new Error(metaBody.error ?? `Could not prepare upload for ${file.name}`);
    const uploadedTo = await uploadToPlan(metaBody.data.upload, file);
    const completeResponse = await fetch(`/api/v1/files/${metaBody.data.file.id}/upload-complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        storageProvider: uploadedTo.provider,
        storageKey: uploadedTo.storageKey || metaBody.data.file.storageKey,
        sizeBytes: file.size,
      }),
    });
    const completeBody = await completeResponse.json();
    if (!completeResponse.ok) throw new Error(completeBody.error ?? `Could not save ${file.name}.`);
    uploaded.push({ id: completeBody.data.id, fileName: completeBody.data.fileName });
  }
  return uploaded;
}

async function uploadToPlan(upload: string | { primary: UploadTarget; fallback?: UploadTarget }, file: File): Promise<UploadTarget> {
  const contentType = file.type || "application/octet-stream";
  if (typeof upload === "string") {
    const response = await fetch(upload, { method: "PUT", headers: { "content-type": contentType }, body: file });
    if (!response.ok) throw new Error(`Upload failed for ${file.name}`);
    return { provider: upload.includes("/api/v1/storage/upload") ? "LOCAL" : "S3", storageKey: "", url: upload };
  }
  try {
    await putUploadFile(upload.primary, file, contentType);
    return upload.primary;
  } catch (error) {
    if (!upload.fallback) throw error;
    await putUploadFile(upload.fallback, file, contentType);
    return upload.fallback;
  }
}

async function putUploadFile(target: UploadTarget, file: File, contentType: string) {
  const response = await fetch(target.url, { method: "PUT", headers: { "content-type": contentType }, body: file });
  if (!response.ok) throw new Error(`${file.name} upload failed`);
}

type UploadTarget = {
  provider: "LOCAL" | "S3";
  storageKey: string;
  url: string;
};
