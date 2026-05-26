"use client";

import { FormEvent, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { FileUploader } from "@/components/file-uploader";

export function MarketingTaskForm({ projects }: { projects: { id: string; name: string }[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/v1/marketing/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId, title, brief }),
    });
    const payload = await response.json();
    setLoading(false);
    setMessage(response.ok ? `Task created: ${payload.data.title}` : payload.error ?? "Task creation failed");
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="font-semibold">Create marketing task</h2>
      <label className="mt-4 block">
        <span className="label">Project</span>
        <select className="input" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>
      <label className="mt-3 block">
        <span className="label">Title</span>
        <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="mt-3 block">
        <span className="label">Brief</span>
        <textarea className="input min-h-24" value={brief} onChange={(event) => setBrief(event.target.value)} />
      </label>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4" disabled={loading || !projectId || !title || !brief}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
        Create task
      </button>
    </form>
  );
}

export function MarketingMediaPanel({ tasks }: { tasks: { id: string; title: string }[] }) {
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
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold">Upload task media</h2>
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
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
    </div>
  );
}
