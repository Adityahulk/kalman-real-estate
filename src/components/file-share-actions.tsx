"use client";

import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";

export function FileShareActions({ fileId, fileName }: { fileId: string; fileName: string }) {
  const [loading, setLoading] = useState<"whatsapp" | "email" | null>(null);

  async function createPublicShareText() {
    // Use the bundle endpoint (single-file bundle) so the recipient gets one short, reliably
    // clickable link to a download page rather than a long raw signed URL that some apps mangle.
    const response = await fetch("/api/v1/files/share-bundle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileIds: [fileId] }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.data?.url) throw new Error(body?.error ?? "Could not create share link.");
    return `${fileName}:\n${body.data.url}`;
  }

  async function share(target: "whatsapp" | "email") {
    setLoading(target);
    try {
      const text = await createPublicShareText();
      const url = target === "whatsapp"
        ? whatsAppShareUrl(text)
        : `mailto:?subject=${encodeURIComponent(fileName)}&body=${encodeURIComponent(text)}`;
      window.location.href = url;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not create share link.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <button className="btn-outline h-9 w-full justify-center px-3 text-xs sm:h-8 sm:w-auto" type="button" disabled={Boolean(loading)} onClick={() => void share("whatsapp")}>
        <MessageCircle size={13} />
        {loading === "whatsapp" ? "Preparing" : "WhatsApp"}
      </button>
      <button className="btn-outline h-9 w-full justify-center px-3 text-xs sm:h-8 sm:w-auto" type="button" disabled={Boolean(loading)} onClick={() => void share("email")}>
        <Mail size={13} />
        {loading === "email" ? "Preparing" : "Email"}
      </button>
    </>
  );
}

function whatsAppShareUrl(text: string) {
  const encoded = encodeURIComponent(text);
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return isMobile ? `whatsapp://send?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
}
