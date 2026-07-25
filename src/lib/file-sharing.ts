"use client";

import { isNative } from "@/lib/native";

export type ShareableFile = { id: string; fileName: string; mimeType?: string };

// WhatsApp's URL API accepts text only. To send an attachment, the file must be passed to the
// platform share sheet. This works in supported browsers and in both Capacitor mobile shells.
export async function shareFiles(files: ShareableFile[], title = "Shared files"): Promise<boolean> {
  if (!files.length) return false;
  if (isNative()) return shareNativeFiles(files, title);

  const attachments = await downloadFiles(files);
  if (navigator.canShare?.({ files: attachments })) {
    await navigator.share({ title, files: attachments });
    return true;
  }
  return false;
}

export async function createDirectShareLinks(files: ShareableFile[]): Promise<string[]> {
  return Promise.all(files.map(async (file) => {
    const response = await fetch(`/api/v1/files/${file.id}/share`);
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.data?.url) throw new Error(body?.error ?? "Could not create a direct download link.");
    return body.data.url as string;
  }));
}

export function whatsappTextShare(text: string) {
  const encoded = encodeURIComponent(text);
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  window.location.href = isMobile ? `whatsapp://send?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
}

async function downloadFiles(files: ShareableFile[]): Promise<File[]> {
  return Promise.all(files.map(async (file) => {
    const response = await fetch(`/api/v1/files/${file.id}/download?proxy=1`);
    if (!response.ok) throw new Error(`Could not prepare ${file.fileName} for sharing.`);
    const blob = await response.blob();
    return new File([blob], file.fileName, { type: file.mimeType || blob.type || "application/octet-stream" });
  }));
}

async function shareNativeFiles(files: ShareableFile[], title: string): Promise<boolean> {
  const [attachments, filesystem, share] = await Promise.all([
    downloadFiles(files),
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const paths = await Promise.all(attachments.map(async (file, index) => {
    const stored = await filesystem.Filesystem.writeFile({
      // Keep the original extension so WhatsApp and the receiving app identify the file correctly.
      path: `shared/${Date.now()}-${index}-${safeFileName(file.name)}`,
      directory: filesystem.Directory.Cache,
      data: await toBase64(file),
      recursive: true,
    });
    return stored.uri;
  }));
  const supported = await share.Share.canShare();
  if (!supported.value) return false;
  await share.Share.share({ title, dialogTitle: "Share files", files: paths });
  return true;
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "attachment";
}

async function toBase64(file: Blob) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}
