"use client";

import { FormEvent, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FileUploader } from "@/components/file-uploader";

export function MarketingTaskForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assignee, setAssignee] = useState("");
  const [links, setLinks] = useState<string[]>([""]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/v1/marketing/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        brief,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        assignee: assignee || undefined,
        links: links.map((item) => item.trim()).filter(Boolean),
      }),
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(payload.error ?? "Project idea creation failed");
      return;
    }
    setMessage(`Added to team ideas: ${payload.data.title}`);
    setTitle("");
    setBrief("");
    setDueAt("");
    setAssignee("");
    setLinks([""]);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="font-semibold">Add new project idea</h2>
      <label className="mt-3 block">
        <span className="label">Project name</span>
        <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="mt-3 block">
        <span className="label">Deadline</span>
        <input className="input" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
      </label>
      <label className="mt-3 block">
        <span className="label">Project idea</span>
        <textarea className="input min-h-24" value={brief} onChange={(event) => setBrief(event.target.value)} />
      </label>
      <label className="mt-3 block">
        <span className="label">Assign to</span>
        <input className="input" value={assignee} onChange={(event) => setAssignee(event.target.value)} />
      </label>
      <div className="mt-3">
        <span className="label">Add links</span>
        <div className="mt-2 space-y-2">
          {links.map((link, index) => (
            <div className="flex gap-2" key={index}>
              <input
                className="input"
                value={link}
                onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                placeholder="https://..."
              />
              {links.length > 1 ? (
                <button
                  className="btn-outline h-10 px-3"
                  type="button"
                  onClick={() => setLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <button className="btn-outline mt-3 h-9 px-3 text-sm" type="button" onClick={() => setLinks((current) => [...current, ""])}>
          <Plus size={15} />
          Add link
        </button>
      </div>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4" disabled={loading || !title || !brief}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
        Add to team ideas
      </button>
    </form>
  );
}

export function MarketingMediaPanel({ tasks }: { tasks: { id: string; title: string }[] }) {
  const router = useRouter();
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const [kind, setKind] = useState("RAW");
  const [message, setMessage] = useState("");

  async function attach(file: { id: string; fileName: string }) {
    const response = await fetch(`/api/v1/marketing/tasks/${taskId}/media`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileAssetId: file.id, kind }),
    });
    const body = await response.json();
    setMessage(response.ok ? `${kind} media attached: ${file.fileName}` : body.error ?? "Media attach failed");
    if (response.ok) router.refresh();
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold">Upload task media</h2>
      {!tasks.length ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          Add a team idea first to upload task media.
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <label>
            <span className="label">Task</span>
            <select className="input" value={taskId} onChange={(event) => setTaskId(event.target.value)}>
              {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Media stage</span>
            <select className="input" value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="RAW">Raw footage</option>
              <option value="DRAFT">Editor draft</option>
              <option value="FINAL">Final video</option>
            </select>
          </label>
          <FileUploader label="Upload media file" visibility="TEAM" ownerType="MarketingTask" ownerId={taskId} accept="video/*,image/*" onUploaded={attach} />
        </div>
      )}
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
    </div>
  );
}

export function MarketingIdeaActions({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"" | "approve" | "reject">("");
  const [message, setMessage] = useState("");

  async function submit(kind: "approve" | "reject") {
    setLoading(kind);
    setMessage("");
    const response = await fetch(`/api/v1/marketing/tasks/${taskId}/${kind}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(kind === "approve" ? { status: "APPROVED" } : { notes: "Idea rejected." }),
    });
    const body = await response.json().catch(() => ({}));
    setLoading("");
    if (!response.ok) {
      setMessage(body.error ?? "Could not update idea.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary h-9 px-3 text-sm" type="button" disabled={Boolean(loading)} onClick={() => void submit("approve")}>
          {loading === "approve" ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}
          Approve
        </button>
        <button className="btn-outline h-9 px-3 text-sm text-rose-700" type="button" disabled={Boolean(loading)} onClick={() => void submit("reject")}>
          {loading === "reject" ? <Loader2 className="animate-spin" size={15} /> : <X size={15} />}
          Reject
        </button>
      </div>
      {message ? <div className="text-sm text-rose-700">{message}</div> : null}
    </div>
  );
}

export function MarketingProjectDetailEditor({
  task,
}: {
  task: { id: string; title: string; brief: string; assignee: string | null; dueAt: string | null; links: string[]; status: string };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [brief, setBrief] = useState(task.brief);
  const [dueAt, setDueAt] = useState(task.dueAt ? task.dueAt.slice(0, 10) : "");
  const [assignee, setAssignee] = useState(task.assignee ?? "");
  const [links, setLinks] = useState<string[]>(task.links.length ? task.links : [""]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/v1/marketing/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        brief,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        assignee: assignee || undefined,
        links: links.map((item) => item.trim()).filter(Boolean),
        status: task.status,
      }),
    });
    const body = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setMessage(body.error ?? "Could not save project details.");
      return;
    }
    setMessage("Project details updated.");
    router.refresh();
  }

  async function removeTask() {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    setDeleting(true);
    const response = await fetch(`/api/v1/marketing/tasks/${task.id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));
    setDeleting(false);
    if (!response.ok) {
      setMessage(body.error ?? "Could not delete project.");
      return;
    }
    router.push("/app/marketing");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold">Project details</h2>
        <button className="btn-outline h-9 px-3 text-sm text-rose-700" type="button" onClick={() => void removeTask()} disabled={deleting || loading}>
          {deleting ? <Loader2 className="animate-spin" size={15} /> : <X size={15} />}
          Delete
        </button>
      </div>
      <label className="mt-4 block">
        <span className="label">Project name</span>
        <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="mt-3 block">
        <span className="label">Deadline</span>
        <input className="input" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
      </label>
      <label className="mt-3 block">
        <span className="label">Project idea</span>
        <textarea className="input min-h-24" value={brief} onChange={(event) => setBrief(event.target.value)} />
      </label>
      <label className="mt-3 block">
        <span className="label">Assign to</span>
        <input className="input" value={assignee} onChange={(event) => setAssignee(event.target.value)} />
      </label>
      <div className="mt-3">
        <span className="label">Links</span>
        <div className="mt-2 space-y-2">
          {links.map((link, index) => (
            <div className="flex gap-2" key={index}>
              <input
                className="input"
                value={link}
                onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
              />
              {links.length > 1 ? (
                <button className="btn-outline h-10 px-3" type="button" onClick={() => setLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  <X size={16} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <button className="btn-outline mt-3 h-9 px-3 text-sm" type="button" onClick={() => setLinks((current) => [...current, ""])}>
          <Plus size={15} />
          Add link
        </button>
      </div>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4" disabled={loading || !title || !brief}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />}
        Save project details
      </button>
    </form>
  );
}
