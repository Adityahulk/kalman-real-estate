"use client";

import { ChangeEvent, useState } from "react";
import { FileStorageProvider, FileVisibility } from "@prisma/client";
import { CheckCircle2, Loader2, UploadCloud, XCircle } from "lucide-react";

type UploadedFile = {
  id: string;
  fileName: string;
  storageKey: string;
};

type UploadTarget = {
  provider: FileStorageProvider;
  storageKey: string;
  url: string;
};

type UploadPlan =
  | string
  | {
      primary: UploadTarget;
      fallback?: UploadTarget;
      preferredProvider?: FileStorageProvider;
    };

export function FileUploader({
  label,
  visibility = "TEAM",
  ownerType,
  ownerId,
  metadata,
  accept,
  onUploaded,
}: {
  label: string;
  visibility?: FileVisibility;
  ownerType?: string;
  ownerId?: string;
  metadata?: Record<string, unknown>;
  accept?: string;
  onUploaded?: (file: UploadedFile) => void;
}) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("uploading");
    setProgress(10);
    setMessage(file.name);

    try {
      const metaResponse = await fetch("/api/v1/files/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          visibility,
          ownerType,
          ownerId,
          ...(metadata ?? {}),
        }),
      });
      const meta = await metaResponse.json();
      if (!metaResponse.ok) throw new Error(meta.error ?? "File metadata creation failed");
      setProgress(35);

      const uploadedTo = await uploadToTarget(meta.data.upload as UploadPlan, file);
      setProgress(85);
      const completeResponse = await fetch(`/api/v1/files/${meta.data.file.id}/upload-complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storageProvider: uploadedTo.provider,
          storageKey: uploadedTo.storageKey || meta.data.file.storageKey,
          sizeBytes: file.size,
        }),
      });
      const completeBody = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(completeBody.error ?? "Upload completed, but file metadata could not be updated");

      setProgress(100);
      setStatus("done");
      onUploaded?.(completeBody.data ?? meta.data.file);
    } catch (error) {
      setStatus("error");
      setProgress(0);
      setMessage(error instanceof Error ? error.message : "Upload failed");
    }
  }

  const icon = status === "uploading" ? <Loader2 className="animate-spin" size={17} /> : status === "done" ? <CheckCircle2 size={17} /> : status === "error" ? <XCircle size={17} /> : <UploadCloud size={17} />;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {icon}
          {label}
        </span>
        <input className="hidden" type="file" accept={accept} onChange={upload} />
        <span className="btn-outline h-8 px-3 text-xs">Choose file</span>
      </label>
      {message ? <div className="mt-2 text-xs text-slate-500">{message}</div> : null}
      {status === "uploading" ? (
        <div className="mt-2 h-1.5 rounded-full bg-slate-100">
          <div className="h-1.5 rounded-full bg-gold-shine" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </div>
  );
}

async function uploadToTarget(upload: UploadPlan, file: File): Promise<UploadTarget> {
  const contentType = file.type || "application/octet-stream";
  if (typeof upload === "string") {
    const response = await fetch(upload, { method: "PUT", headers: { "content-type": contentType }, body: file });
    if (!response.ok) throw new Error("Object storage upload failed");
    return {
      provider: upload.includes("/api/v1/storage/upload") ? FileStorageProvider.LOCAL : FileStorageProvider.S3,
      storageKey: "",
      url: upload,
    };
  }

  try {
    await putFile(upload.primary, file, contentType);
    return upload.primary;
  } catch (primaryError) {
    if (!upload.fallback) throw primaryError;
    await putFile(upload.fallback, file, contentType);
    return upload.fallback;
  }
}

async function putFile(target: UploadTarget, file: File, contentType: string) {
  const response = await fetch(target.url, { method: "PUT", headers: { "content-type": contentType }, body: file });
  if (!response.ok) throw new Error(`${target.provider} upload failed`);
}
