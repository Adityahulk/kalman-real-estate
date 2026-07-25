"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileStack,
  FolderArchive,
  Loader2,
  Pencil,
  Plus,
  Search,
  Upload,
  UserRound,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";

export type EngineeringAssignee = {
  id: string;
  name: string;
  role: string;
  department: string | null;
  designation: string | null;
};

type EngineeringFile = {
  id: string;
  fileName: string;
  mimeType: string;
  categoryKey: string | null;
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
  assignedToId: string | null;
  assignedTo: string | null;
  files: EngineeringFile[];
};

type TaskUpdate = {
  id: string;
  progressPct: number;
  quantityDone: string | null;
  recordedAt: string | null;
  remarks: string;
  attachments: Array<{ id: string; fileName: string }>;
  videos: Array<{ id: string; fileName: string }>;
  materialUsed: string | null;
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
  assignedToId?: string;
  status?: string;
  priority?: string;
};

const TERMINAL_STATUSES = new Set(["COMPLETED", "CLOSED"]);
const FILE_CATEGORIES = [
  { key: "development-drawing", label: "Drawings" },
  { key: "development-boq", label: "BOQs" },
  { key: "development-estimate", label: "Estimates" },
] as const;

export function DevelopmentTaskDashboard({
  projectId,
  projectName,
  projectLocation,
  categories,
  tasks,
  assignees,
  canManage,
  canAssign,
}: {
  projectId: string;
  projectName: string;
  projectLocation: string;
  categories: string[];
  tasks: TaskItem[];
  assignees: EngineeringAssignee[];
  canManage: boolean;
  canAssign: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskFormInput | null>(null);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const matchesQuery = !query.trim()
      || `${task.name} ${task.category} ${task.assignedTo ?? ""} ${task.status}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCategory = category === "all" || task.category === category;
    const matchesStatus = status === "all" || task.status === status;
    const isDelayed = Boolean(task.deadline && new Date(task.deadline) < new Date() && !TERMINAL_STATUSES.has(task.status));
    return matchesQuery && matchesCategory && matchesStatus && (!delayedOnly || isDelayed);
  }), [category, delayedOnly, query, status, tasks]);

  const ongoingTasks = filteredTasks.filter((task) => ["IN_PROGRESS", "RETURNED", "SENT_FOR_VERIFICATION"].includes(task.status));
  const upcomingTasks = filteredTasks.filter((task) => task.status === "PLANNED").sort(compareDeadlines);
  const delayedTasks = filteredTasks.filter((task) => task.deadline && new Date(task.deadline) < new Date() && !TERMINAL_STATUSES.has(task.status));
  const statuses = Array.from(new Set(tasks.map((task) => task.status))).sort();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm text-slate-500">{projectLocation}</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{projectName} development</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Assign work, monitor progress, verify completion, and keep every engineering file together.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="btn-outline h-10 px-4" href={`/app/projects/${projectId}/development/plans`}>
            <FileStack size={16} />
            Engineering files
          </Link>
          {canManage ? (
            <Link className="btn-primary h-10 px-4" href={`/app/projects/${projectId}/development/new-task`}>
              <Plus size={16} />
              Add task
            </Link>
          ) : null}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Wrench} label="Ongoing tasks" value={ongoingTasks.length} accent="text-navy-900" />
        <MetricCard icon={AlertTriangle} label="Delayed tasks" value={delayedTasks.length} accent="text-amber-600" />
        <MetricCard icon={Clock3} label="Upcoming tasks" value={upcomingTasks.length} accent="text-slate-700" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <h2 className="font-semibold">Search and filters</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_170px_190px_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={16} />
              <input className="input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search every task" />
            </label>
            <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All statuses</option>
              {statuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700">
              <input type="checkbox" checked={delayedOnly} onChange={(event) => setDelayedOnly(event.target.checked)} />
              Delayed only
            </label>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <TaskListCard title="Ongoing tasks" empty="No ongoing tasks." tasks={ongoingTasks} projectId={projectId} />
        <TaskListCard title="Upcoming tasks" empty="No upcoming tasks." tasks={upcomingTasks} projectId={projectId} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">All tasks</h2>
            <p className="mt-1 text-sm text-slate-500">Planned, active, awaiting approval, returned, completed, and closed work.</p>
          </div>
          <span className="chip">{filteredTasks.length}</span>
        </div>
        <div className="mt-4 space-y-3">
          {filteredTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              projectId={projectId}
              assignees={assignees}
              canManage={canManage}
              canAssign={canAssign}
              onEdit={() => setEditingTask(toTaskFormInput(task))}
            />
          ))}
          {!filteredTasks.length ? <EmptyBlock label="No tasks match these filters." /> : null}
        </div>
      </section>

      {editingTask ? (
        <DevelopmentTaskForm
          projectId={projectId}
          categories={categories}
          assignees={assignees}
          canAssign={canAssign}
          initialTask={editingTask}
          onDone={() => setEditingTask(null)}
        />
      ) : null}
    </div>
  );
}

function TaskListCard({ title, tasks, empty, projectId }: { title: string; tasks: TaskItem[]; empty: string; projectId: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {tasks.map((task) => (
          <Link className="block rounded-lg border border-slate-200 p-4 transition hover:border-navy-300 hover:bg-slate-50" href={`/app/projects/${projectId}/development/assets/${task.id}`} key={task.id}>
            <TaskSummary task={task} />
          </Link>
        ))}
        {!tasks.length ? <EmptyBlock label={empty} /> : null}
      </div>
    </section>
  );
}

function TaskRow({
  task,
  projectId,
  assignees,
  canManage,
  canAssign,
  onEdit,
}: {
  task: TaskItem;
  projectId: string;
  assignees: EngineeringAssignee[];
  canManage: boolean;
  canAssign: boolean;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignedToId, setAssignedToId] = useState(task.assignedToId ?? "");

  async function assignTask() {
    if (!assignedToId) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/development/site-assets/${task.id}/assign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assignedToId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not assign task.");
      setAssigning(false);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not assign task.");
    } finally {
      setBusy(false);
    }
  }

  async function closeTask() {
    if (!window.confirm(`Close "${task.name}"? Its files and progress history will be preserved.`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/development/site-assets/${task.id}/close`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not close task.");
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not close task.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <Link className="min-w-0 flex-1" href={`/app/projects/${projectId}/development/assets/${task.id}`}>
          <TaskSummary task={task} />
        </Link>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canManage ? <button className="btn-outline h-8 px-3 text-xs" type="button" onClick={onEdit} disabled={busy}><Pencil size={13} /> Edit</button> : null}
          {canAssign && !TERMINAL_STATUSES.has(task.status) ? (
            <button className="btn-outline h-8 px-3 text-xs" type="button" onClick={() => setAssigning((value) => !value)} disabled={busy}>
              <UserRound size={13} /> {task.assignedToId ? "Reassign" : "Assign"}
            </button>
          ) : null}
          {canManage && task.status !== "CLOSED" ? (
            <button className="btn-outline h-8 px-3 text-xs text-slate-700" type="button" onClick={() => void closeTask()} disabled={busy}>
              <FolderArchive size={13} /> Close
            </button>
          ) : null}
        </div>
      </div>
      {assigning ? (
        <div className="mt-4 flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row">
          <select className="input flex-1" value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)}>
            <option value="">Select registered user</option>
            {assignees.map((user) => <option value={user.id} key={user.id}>{assigneeLabel(user)}</option>)}
          </select>
          <button className="btn-primary sm:w-auto" type="button" disabled={busy || !assignedToId} onClick={() => void assignTask()}>
            {busy ? <Loader2 className="animate-spin" size={15} /> : <UserRound size={15} />}
            Save assignment
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TaskSummary({ task }: { task: TaskItem }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-medium text-slate-900">{task.name}</div>
        <span className={statusChipClass(task.status)}>{statusLabel(task.status)}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-2 py-1">{task.category}</span>
        {task.deadline ? <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {formatDate(task.deadline)}</span> : null}
        <span className="inline-flex items-center gap-1"><UserRound size={12} /> {task.assignedTo ?? "Unassigned"}</span>
        <span>{task.totalArea ?? "-"} {task.units ?? ""}</span>
        <span className="font-semibold text-slate-700">{task.progressPct}%</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-gold-shine" style={{ width: `${task.progressPct}%` }} />
      </div>
    </>
  );
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: typeof Wrench; label: string; value: number; accent: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
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
  assignees,
  canAssign,
  initialTask,
  onDone,
}: {
  projectId: string;
  categories: string[];
  assignees: EngineeringAssignee[];
  canAssign: boolean;
  initialTask?: TaskFormInput;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialTask?.name ?? "");
  const [totalArea, setTotalArea] = useState(initialTask?.totalArea ?? "");
  const [units, setUnits] = useState(initialTask?.units ?? "");
  const [deadline, setDeadline] = useState(initialTask?.deadline ?? "");
  const [category, setCategory] = useState(initialTask?.category ?? categories[0] ?? "");
  const [assignedToId, setAssignedToId] = useState(initialTask?.assignedToId ?? "");
  const [priority, setPriority] = useState(initialTask?.priority ?? "MEDIUM");
  const [drawings, setDrawings] = useState<File[]>([]);
  const [boqs, setBoqs] = useState<File[]>([]);
  const [estimates, setEstimates] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const payload = {
        projectId,
        name,
        totalArea: Number(totalArea),
        units,
        deadline: deadline ? new Date(`${deadline}T00:00:00`).toISOString() : undefined,
        category,
        assignedToId: assignedToId || null,
        status: initialTask?.status ?? (assignedToId ? "IN_PROGRESS" : "PLANNED"),
        priority,
      };
      const response = await fetch(initialTask?.id ? `/api/v1/development/site-assets/${initialTask.id}` : "/api/v1/development/site-assets", {
        method: initialTask?.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not save task.");

      const taskId = body.data?.id;
      if (!taskId) throw new Error("Task was saved, but its file workspace could not be identified.");
      await Promise.all([
        drawings.length ? uploadFilesForOwner(taskId, "SiteAsset", "development-drawing", drawings) : Promise.resolve([]),
        boqs.length ? uploadFilesForOwner(taskId, "SiteAsset", "development-boq", boqs) : Promise.resolve([]),
        estimates.length ? uploadFilesForOwner(taskId, "SiteAsset", "development-estimate", estimates) : Promise.resolve([]),
      ]);

      setMessage(initialTask?.id ? "Task and engineering files updated." : "Task created.");
      setDrawings([]);
      setBoqs([]);
      setEstimates([]);
      if (!initialTask) {
        setName("");
        setTotalArea("");
        setUnits("");
        setDeadline("");
        setAssignedToId("");
      }
      onDone?.();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save task.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-5" onSubmit={submit}>
      <h2 className="font-semibold">{initialTask ? "Edit task" : "Add task"}</h2>
      <div className="mt-4 grid gap-3">
        <label><span className="label">Name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className="label">Area</span><input className="input" type="number" min="0" step="any" value={totalArea} onChange={(event) => setTotalArea(event.target.value)} required /></label>
          <label><span className="label">Units</span><input className="input" value={units} onChange={(event) => setUnits(event.target.value)} placeholder="sq ft / running ft / meters" required /></label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className="label">Deadline</span><input className="input" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label>
          <label><span className="label">Category</span><select className="input" value={category} onChange={(event) => setCategory(event.target.value)} required>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
        <label>
          <span className="label">Priority</span>
          <select className="input" value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </label>
        {canAssign ? (
          <label>
            <span className="label">Assign to <span className="font-normal text-slate-400">(optional)</span></span>
            <select className="input" value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)}>
              <option value="">Leave unassigned</option>
              {assignees.map((user) => <option value={user.id} key={user.id}>{assigneeLabel(user)}</option>)}
            </select>
          </label>
        ) : null}

        <fieldset className="mt-2 rounded-lg border border-slate-200 p-4">
          <legend className="px-2 text-sm font-semibold text-slate-800">Engineering files</legend>
          <div className="grid gap-4 md:grid-cols-3">
            <FileInput label="Drawings" files={drawings} onChange={setDrawings} />
            <FileInput label="BOQs" files={boqs} onChange={setBoqs} />
            <FileInput label="Estimates" files={estimates} onChange={setEstimates} />
          </div>
        </fieldset>
      </div>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4 w-full" disabled={loading || !name || !totalArea || !units || !category}>
        {loading ? <Loader2 className="animate-spin" size={16} /> : initialTask ? <Pencil size={16} /> : <Plus size={16} />}
        {initialTask ? "Save task" : "Add task"}
      </button>
    </form>
  );
}

function FileInput({ label, files, onChange }: { label: string; files: File[]; onChange: (files: File[]) => void }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="input pt-2" type="file" multiple onChange={(event) => onChange(Array.from(event.target.files ?? []))} />
      {files.length ? <span className="mt-1 block text-xs text-slate-500">{files.length} file{files.length === 1 ? "" : "s"} selected</span> : null}
    </label>
  );
}

export function DevelopmentTaskUpdateForm({
  task,
  canManage = false,
  canUpdate = false,
  canVerify = false,
}: {
  task: TaskDetail;
  canManage?: boolean;
  canUpdate?: boolean;
  canVerify?: boolean;
}) {
  const router = useRouter();
  const [areaDone, setAreaDone] = useState(task.totalArea ?? "");
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [videoAttachments, setVideoAttachments] = useState<File[]>([]);
  const [materialUsed, setMaterialUsed] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const awaitingVerification = task.status === "SENT_FOR_VERIFICATION";
  const terminal = TERMINAL_STATUSES.has(task.status);
  const canSubmitForVerification = canUpdate
    && task.progressPct >= 95
    && ["IN_PROGRESS", "RETURNED"].includes(task.status);

  async function submitForVerification() {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/development/site-assets/${task.id}/submit-verification`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not submit task for approval.");
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not submit task for approval.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(decision: "APPROVE" | "RETURN") {
    const notes = decision === "RETURN" ? window.prompt("Reason for returning this task:") ?? "" : "";
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/development/site-assets/${task.id}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, notes }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not verify task.");
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not verify task.");
    } finally {
      setLoading(false);
    }
  }

  async function closeTask() {
    if (!window.confirm(`Close "${task.name}"? Progress and files will remain available.`)) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/development/site-assets/${task.id}/close`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not close task.");
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not close task.");
    } finally {
      setLoading(false);
    }
  }

  const numericTotalArea = Number(task.totalArea || 0);
  const nextProgress = numericTotalArea > 0 && Number(areaDone || 0) >= 0
    ? Math.max(0, Math.min(100, Math.round((Number(areaDone || 0) / numericTotalArea) * 100)))
    : task.progressPct;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const [photos, videos] = await Promise.all([
        attachments.length ? uploadFilesForOwner(task.id, "SiteAsset", "development-site-photo", attachments) : Promise.resolve([]),
        videoAttachments.length ? uploadFilesForOwner(task.id, "SiteAsset", "development-site-video", videoAttachments) : Promise.resolve([]),
      ]);
      const response = await fetch(`/api/v1/development/site-assets/${task.id}/progress`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          areaDone: Number(areaDone),
          recordedAt: new Date(`${recordedAt}T00:00:00`).toISOString(),
          summary: remarks,
          photoFileIds: photos.map((file) => file.id),
          videoFileIds: videos.map((file) => file.id),
          materialUsed: materialUsed || undefined,
          visibleToOwner: false,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not update task.");
      setAttachments([]);
      setVideoAttachments([]);
      setMaterialUsed("");
      setRemarks("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update task.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Task details</h2>
          <div className="flex flex-wrap items-center gap-2">
            {canSubmitForVerification ? (
              <button className="btn-primary h-9 px-3 text-xs" type="button" disabled={loading} onClick={() => void submitForVerification()}>
                <CheckCircle2 size={14} /> Send for approval
              </button>
            ) : null}
            {awaitingVerification && canVerify ? (
              <>
                <button className="btn-primary h-9 px-3 text-xs" type="button" disabled={loading} onClick={() => void verify("APPROVE")}>
                  <CheckCircle2 size={14} /> Approve completed work
                </button>
                <button className="btn-outline h-9 px-3 text-xs" type="button" disabled={loading} onClick={() => void verify("RETURN")}>
                  Return
                </button>
              </>
            ) : null}
            {awaitingVerification && !canVerify ? <span className="chip bg-amber-50 text-amber-800">Awaiting approval</span> : null}
            {canManage && task.status !== "CLOSED" ? (
              <button className="btn-outline h-9 px-3 text-xs" type="button" disabled={loading} onClick={() => void closeTask()}>
                <FolderArchive size={14} /> Close
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Fact label="Task" value={task.name} />
          <Fact label="Category" value={task.category} />
          <Fact label="Area" value={`${task.totalArea ?? "-"} ${task.units ?? ""}`.trim()} />
          <Fact label="Deadline" value={task.deadline ? formatDate(task.deadline) : "-"} />
          <Fact label="Assigned to" value={task.assignedTo ?? "Unassigned"} />
          <Fact label="Status" value={statusLabel(task.status)} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <h2 className="font-semibold">Progress</h2>
          <p className="mt-1 text-sm text-slate-500">{task.progressPct}% done</p>
        </div>
        <div className="mt-4 h-3 rounded-full bg-slate-100">
          <div className="h-3 rounded-full bg-gold-shine" style={{ width: `${task.progressPct}%` }} />
        </div>
        {terminal ? (
          <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            This task is {task.status.toLowerCase()}. Its progress and files remain available as a permanent record.
          </div>
        ) : canUpdate ? (
          <form className="mt-5 grid gap-3" onSubmit={submit}>
            <div className="grid gap-3 md:grid-cols-2">
              <label><span className="label">Area done</span><input className="input" type="number" min="0" step="any" value={areaDone} onChange={(event) => setAreaDone(event.target.value)} /></label>
              <label><span className="label">Date</span><input className="input" type="date" value={recordedAt} onChange={(event) => setRecordedAt(event.target.value)} /></label>
            </div>
            <label><span className="label">Remarks</span><textarea className="input min-h-24" value={remarks} onChange={(event) => setRemarks(event.target.value)} /></label>
            <label><span className="label">Material used</span><textarea className="input min-h-20" value={materialUsed} onChange={(event) => setMaterialUsed(event.target.value)} placeholder="Materials and quantities used today" /></label>
            <div className="grid gap-3 md:grid-cols-2">
              <label><span className="label">Site photos</span><input className="input pt-2" type="file" multiple accept="image/*" onChange={(event) => setAttachments(Array.from(event.target.files ?? []))} /></label>
              <label><span className="label">Site videos</span><input className="input pt-2" type="file" multiple accept="video/*" onChange={(event) => setVideoAttachments(Array.from(event.target.files ?? []))} /></label>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              This update will set progress to {nextProgress}% based on {areaDone || "0"} / {task.totalArea || "0"} {task.units ?? ""}.
            </div>
            {message ? <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</div> : null}
            <button className="btn-primary w-fit" disabled={loading || !areaDone || !remarks}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              Update task
            </button>
          </form>
        ) : (
          <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">You have view-only access to this task.</div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Progress history</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Area done</th>
                <th className="px-3 py-2">Progress</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Remarks</th>
                <th className="px-3 py-2">Material</th>
                <th className="px-3 py-2">Attachments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {task.updates.map((update) => (
                <tr key={update.id}>
                  <td className="px-3 py-2">{update.quantityDone ?? "-"} {task.units ?? ""}</td>
                  <td className="px-3 py-2">{update.progressPct}%</td>
                  <td className="px-3 py-2">{update.recordedAt ? formatDate(update.recordedAt) : "-"}</td>
                  <td className="px-3 py-2">{update.remarks}</td>
                  <td className="px-3 py-2">{update.materialUsed ?? "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {update.attachments.map((file) => (
                        <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/files/${file.id}/download?disposition=inline&proxy=1`} key={file.id} target="_blank" rel="noreferrer">
                          {file.fileName}
                        </a>
                      ))}
                      {update.videos.map((file) => (
                        <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/files/${file.id}/download?disposition=inline&proxy=1`} key={file.id} target="_blank" rel="noreferrer">
                          {file.fileName}
                        </a>
                      ))}
                      {!update.attachments.length && !update.videos.length ? <span className="text-slate-400">-</span> : null}
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
    assignedToId: task.assignedToId ?? "",
    status: task.status,
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

function assigneeLabel(user: EngineeringAssignee) {
  const position = user.designation ?? user.department ?? user.role.replaceAll("_", " ");
  return `${user.name} · ${position}`;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusChipClass(status: string) {
  const colour = status === "COMPLETED"
    ? "bg-emerald-50 text-emerald-700"
    : status === "SENT_FOR_VERIFICATION"
      ? "bg-amber-50 text-amber-800"
      : status === "RETURNED"
        ? "bg-rose-50 text-rose-700"
        : status === "CLOSED"
          ? "bg-slate-200 text-slate-700"
          : status === "IN_PROGRESS"
            ? "bg-blue-50 text-blue-700"
            : "bg-slate-100 text-slate-600";
  return `rounded-full px-2 py-1 text-xs font-medium ${colour}`;
}

export function engineeringFileLabel(categoryKey: string | null) {
  if (categoryKey === "development-boq") return "BOQ";
  if (categoryKey === "development-estimate") return "Estimate";
  if (categoryKey === "development-site-photo") return "Site photo";
  return "Drawing";
}

export const engineeringFileCategories = FILE_CATEGORIES;

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
        notes: `Uploaded from Engineering (${categoryKey})`,
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
