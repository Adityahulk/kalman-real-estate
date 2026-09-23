"use client";

import { isNative } from "@/lib/native";

export type ShareableFile = { id: string; fileName: string; mimeType?: string };
export type FileBundleShareLink = { url: string; count: number };

// WhatsApp's URL API accepts text only. To send an attachment, the file must be passed to the
// platform share sheet. This works in supported browsers and in both Capacitor mobile shells.
export async function shareFiles(files: ShareableFile[], title = "Shared files"): Promise<boolean> {
  if (!files.length) return false;
  try {
    if (isNative()) return await shareNativeFiles(files, title);

    const attachments = await downloadFiles(files);
    if (navigator.canShare?.({ files: attachments })) {
      await navigator.share({ title, files: attachments });
      return true;
    }
    return false;
  } catch (error) {
    // Closing a system share sheet, or tapping Share twice while it is open, is normal user
    // behaviour. Treat it as handled instead of surfacing misleading "failed" alerts.
    if (isShareCancellation(error)) return true;
    throw error;
  }
}

/** Creates short public pages in groups of 10 so large selections remain easy to share. */
export async function createFileBundleShareLinks(files: ShareableFile[]): Promise<FileBundleShareLink[]> {
  const response = await fetch("/api/v1/files/share-bundle", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fileIds: files.map((file) => file.id) }),
  });
  const body = await response.json().catch(() => null);
  const rawLinks = Array.isArray(body?.data?.links)
    ? body.data.links
    : body?.data?.url
      ? [{ url: body.data.url, count: files.length }]
      : [];
  if (!response.ok || !rawLinks.length) throw new Error(body?.error ?? "Could not create secure download links.");

  return rawLinks.map((item: { url?: unknown; count?: unknown }) => {
    if (typeof item.url !== "string") throw new Error("The server returned an invalid share link.");
    const url = new URL(item.url);
    if (url.protocol !== "https:" || isLocalHost(url.hostname)) {
      throw new Error("Shared links require the app to be served from its public HTTPS URL. Configure PUBLIC_APP_URL on the deployed app.");
    }
    return { url: url.toString(), count: Number(item.count) || 1 };
  });
}

export function formatFileBundleShareMessage(links: FileBundleShareLink[], totalFiles: number) {
  const heading = "WIDESTATE OS | Secure file share";
  const fileLabel = `${totalFiles} file${totalFiles === 1 ? " is" : "s are"} ready to view`;
  if (links.length === 1) {
    return `${heading}\n\n${fileLabel}:\n${links[0].url}\n\nLink expires in 30 days.`;
  }

  const parts = links.map((link, index) => (
    `${index + 1} of ${links.length} - ${link.count} file${link.count === 1 ? "" : "s"}\n${link.url}`
  ));
  return `${heading}\n\n${fileLabel} in ${links.length} links:\n\n${parts.join("\n\n")}\n\nLinks expire in 30 days.`;
}

/** WhatsApp supports text URLs, not browser-side file attachments. Use this only for public links. */
export function openWhatsAppWithLink(text: string) {
  const encoded = encodeURIComponent(text);
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const href = isMobile ? `whatsapp://send?text=${encoded}` : `https://web.whatsapp.com/send?text=${encoded}`;
  window.open(href, "_blank", "noopener,noreferrer");
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

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isShareCancellation(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || error.name === "InvalidStateError" || /cancel|abort|share.*in progress/i.test(error.message);
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
