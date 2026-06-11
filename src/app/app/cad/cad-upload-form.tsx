"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CadFormat, CadScope } from "@prisma/client";
import { Loader2, Upload } from "lucide-react";

type ProjectOption = { id: string; name: string };

export function CadUploadForm({
  projects,
  fixedProjectId,
  fixedParentType,
  fixedParentId,
  title = "Upload recursive Map",
  description = "Create a site, plot, unit, floor, room, or asset Map job against the selected parent.",
  simple = false,
  redirectToReview = false,
}: {
  projects: ProjectOption[];
  fixedProjectId?: string;
  fixedParentType?: CadScope;
  fixedParentId?: string;
  title?: string;
  description?: string;
  simple?: boolean;
  redirectToReview?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectId, setProjectId] = useState(fixedProjectId ?? searchParams.get("projectId") ?? projects[0]?.id ?? "");
  const [parentType, setParentType] = useState<CadScope>(fixedParentType ?? (searchParams.get("parentType") as CadScope | null) ?? "PROJECT");
  const [parentId, setParentId] = useState(fixedParentId ?? searchParams.get("parentId") ?? fixedProjectId ?? projects[0]?.id ?? "");
  const [format, setFormat] = useState<CadFormat>("DXF");
  const [originalName, setOriginalName] = useState("master-plan.dxf");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [stage, setStage] = useState<"idle" | "preparing" | "uploading" | "queueing" | "done">("idle");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setMessage("Choose a DXF or PDF drawing first.");
      return;
    }
    setLoading(true);
    setMessage("");
    setStage("uploading");
    const form = new FormData();
    form.set("file", selectedFile);
    form.set("projectId", (fixedProjectId ?? projectId) || "");
    form.set("parentType", fixedParentType ?? parentType);
    form.set("parentId", (fixedParentId ?? parentId) || projectId);
    form.set("format", format);
    const response = await fetch("/api/v1/cad/upload", {
      method: "POST",
      body: form,
    });
    const payload = await readApiResponse(response);

    if (!response.ok) {
      setLoading(false);
      setStage("idle");
      setMessage(payload.error ?? "Map upload failed");
      return;
    }

    setLoading(false);
    setStage("done");
    setMessage(
      payload.data.queue?.queued
        ? `Uploaded ${payload.data.cadFile.originalName}. Map processing has been queued.`
        : `Uploaded ${payload.data.cadFile.originalName}, but processing could not be queued: ${payload.data.queue?.reason ?? "queue unavailable"}.`,
    );
    if (redirectToReview) router.push(`/app/cad/${payload.data.cadFile.id}`);
    router.refresh();
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".dxf") && !lower.endsWith(".pdf")) {
        setSelectedFile(null);
        setMessage("Please upload a DXF or PDF drawing. Mixed raster/vector PDFs are supported. DWG is disabled in this deployment.");
        return;
      }
      setOriginalName(file.name);
      if (lower.endsWith(".pdf")) setFormat("VECTOR_PDF");
      else setFormat("DXF");
      setMessage("");
    }
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {!simple ? (
          <>
            <label>
              <span className="label">Project</span>
              <select
                className="input"
                value={projectId}
                onChange={(event) => {
                  setProjectId(event.target.value);
                  if (parentType === "PROJECT") setParentId(event.target.value);
                }}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Map scope</span>
              <select className="input" value={parentType} onChange={(event) => setParentType(event.target.value as CadScope)}>
                {Object.values(CadScope).map((scope) => (
                  <option key={scope} value={scope}>{scope.replaceAll("_", " ")}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Parent record id</span>
              <input className="input" value={parentId} onChange={(event) => setParentId(event.target.value)} />
            </label>
            <label>
              <span className="label">Format</span>
              <select className="input" value={format} onChange={(event) => setFormat(event.target.value as CadFormat)}>
                {[CadFormat.DXF, CadFormat.VECTOR_PDF].map((item) => (
                  <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2">
              <span className="label">Original file name</span>
              <input className="input" value={originalName} onChange={(event) => setOriginalName(event.target.value)} />
            </label>
          </>
        ) : null}
        <label className="md:col-span-2">
          <span className="label">Map file</span>
          <input className="input" type="file" accept=".dxf,.pdf" onChange={chooseFile} />
          {selectedFile ? (
            <span className="mt-2 block text-xs text-slate-500">
              {selectedFile.name} · {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          ) : null}
        </label>
      </div>

      {loading ? (
        <div className="mt-4 rounded-lg bg-gold-50 px-3 py-2 text-sm text-navy-900">
          {stage === "preparing" ? "Preparing Map upload..." : null}
          {stage === "uploading" ? "Uploading Map file and queueing extraction..." : null}
          {stage === "queueing" ? "Queueing extraction worker..." : null}
        </div>
      ) : null}
      {message ? <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}

      <button className="btn-primary mt-5 w-full" disabled={loading || !projects.length || !selectedFile}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Upload size={17} />}
        {selectedFile ? "Upload and process Map" : "Choose Map file first"}
      </button>
    </form>
  );
}

async function readApiResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: response.status === 413
        ? "The Map file is larger than the server upload limit."
        : `Map upload failed with HTTP ${response.status}.`,
    };
  }
}
