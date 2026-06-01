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
  title = "Upload recursive CAD",
  description = "Create a site, plot, unit, floor, room, or asset CAD job against the selected parent.",
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
      setMessage("Choose a DXF or vector PDF file first.");
      return;
    }
    setLoading(true);
    setMessage("");
    setStage("preparing");

    const response = await fetch("/api/v1/cad/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectId: (fixedProjectId ?? projectId) || undefined,
        parentType: fixedParentType ?? parentType,
        parentId: (fixedParentId ?? parentId) || projectId,
        format,
        originalName: selectedFile?.name ?? originalName,
        contentType: selectedFile?.type || (format === "VECTOR_PDF" ? "application/pdf" : "application/octet-stream"),
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setLoading(false);
      setStage("idle");
      setMessage(payload.error ?? "CAD upload setup failed");
      return;
    }

    setStage("uploading");
    const putResponse = await fetch(payload.data.upload, {
      method: "PUT",
      headers: { "content-type": selectedFile.type || "application/octet-stream" },
      body: selectedFile,
    });
    if (!putResponse.ok) {
      setLoading(false);
      setStage("idle");
      setMessage("CAD record created, but file upload failed. Check storage configuration and retry.");
      return;
    }

    setStage("queueing");
    const queueResponse = await fetch(`/api/v1/cad/${payload.data.cadFile.id}/process`, { method: "POST" });
    const queuePayload = await queueResponse.json();
    if (!queueResponse.ok) {
      setLoading(false);
      setStage("idle");
      setMessage(queuePayload.error ?? "File uploaded, but processing could not be queued.");
      return;
    }

    setLoading(false);
    setStage("done");
    setMessage(`Uploaded ${payload.data.cadFile.originalName}. CAD processing has been queued.`);
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
        setMessage("Please upload DXF for CAD extraction. Vector PDF is supported as a secondary option. DWG is disabled in this deployment.");
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
              <span className="label">CAD scope</span>
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
          <span className="label">CAD file</span>
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
          {stage === "preparing" ? "Preparing CAD record..." : null}
          {stage === "uploading" ? "Uploading CAD file..." : null}
          {stage === "queueing" ? "Queueing extraction worker..." : null}
        </div>
      ) : null}
      {message ? <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}

      <button className="btn-primary mt-5 w-full" disabled={loading || !projects.length || !selectedFile}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Upload size={17} />}
        {selectedFile ? "Upload and process CAD" : "Choose CAD file first"}
      </button>
    </form>
  );
}
