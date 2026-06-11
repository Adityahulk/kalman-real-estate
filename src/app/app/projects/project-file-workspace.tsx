"use client";

import { useState } from "react";
import { Download, File, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FileUploader } from "@/components/file-uploader";

type FileItem = { id: string; fileName: string; mimeType: string; createdAt: Date | string };

export function ProjectFileWorkspace({ projectId, label, categoryKey, files }: { projectId: string; label: string; categoryKey: string; files: FileItem[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(files[0]?.id ?? "");
  const selected = files.find((file) => file.id === selectedId) ?? files[0];

  async function remove(id: string) {
    if (!window.confirm("Delete this file version?")) return;
    const response = await fetch(`/api/v1/files/${id}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason: "Deleted from project file workspace" }) });
    if (response.ok) router.refresh();
  }

  return (
    <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="font-semibold">{selected ? selected.fileName : `No ${label} uploaded`}</h2>{selected ? <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/files/${selected.id}/download`}><Download size={14} /> Download</a> : null}</div>
        {selected ? <iframe className="h-[calc(100vh-16rem)] w-full bg-slate-50" src={`/api/v1/files/${selected.id}/download?disposition=inline&proxy=1`} title={selected.fileName} /> : <div className="flex h-[calc(100vh-16rem)] items-center justify-center text-sm text-slate-500">Upload the first file to preview it here.</div>}
      </section>
      <aside className="min-h-0 space-y-4 overflow-auto">
        <FileUploader label={`Upload new ${label}`} ownerType="Project" ownerId={projectId} visibility="TEAM" metadata={{ categoryKey }} onUploaded={() => router.refresh()} />
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 font-semibold">Previous files</div>
          <div className="divide-y divide-slate-100">
            {files.map((file) => <div className={`p-3 ${selected?.id === file.id ? "bg-navy-100" : ""}`} key={file.id}><button className="flex w-full items-start gap-2 text-left" type="button" onClick={() => setSelectedId(file.id)}><File className="mt-0.5 shrink-0" size={15} /><span className="min-w-0"><span className="block truncate text-sm font-medium">{file.fileName}</span><span className="text-xs text-slate-500">{new Date(file.createdAt).toLocaleString()}</span></span></button><div className="mt-2 flex gap-2"><a className="btn-ghost h-7 px-2 text-xs" href={`/api/v1/files/${file.id}/download`}><Download size={13} /> Download</a><button className="btn-ghost h-7 px-2 text-xs text-rose-700" type="button" onClick={() => void remove(file.id)}><Trash2 size={13} /> Delete</button></div></div>)}
            {!files.length ? <div className="p-4 text-sm text-slate-500">No files yet.</div> : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
