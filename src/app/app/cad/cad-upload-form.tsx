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
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

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
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error ?? "CAD upload setup failed");
      return;
    }

    if (selectedFile) {
      const putResponse = await fetch(payload.data.upload, {
        method: "PUT",
        headers: { "content-type": selectedFile.type || "application/octet-stream" },
        body: selectedFile,
      });
      if (!putResponse.ok) {
        setMessage("CAD record created, but object storage upload failed. Check S3/MinIO.");
        return;
      }
    }

    setMessage(`${selectedFile ? "Uploaded" : "Upload prepared"} for ${payload.data.cadFile.originalName}. Processing has been queued.`);
    if (redirectToReview) router.push(`/app/cad/${payload.data.cadFile.id}`);
    router.refresh();
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      setOriginalName(file.name);
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".pdf")) setFormat("VECTOR_PDF");
      else if (lower.endsWith(".dwg")) setFormat("DWG");
      else setFormat("DXF");
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
                {Object.values(CadFormat).map((item) => (
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
          <input className="input" type="file" accept=".dxf,.pdf,.dwg" onChange={chooseFile} />
        </label>
      </div>

      {message ? <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}

      <button className="btn-primary mt-5 w-full" disabled={loading || !projects.length}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Upload size={17} />}
        {selectedFile ? "Upload and process CAD" : "Choose CAD file first"}
      </button>
    </form>
  );
}
