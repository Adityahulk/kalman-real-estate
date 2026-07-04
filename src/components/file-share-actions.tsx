"use client";

import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";

export function FileShareActions({ fileId, fileName }: { fileId: string; fileName: string }) {
  const [loading, setLoading] = useState<"whatsapp" | "email" | null>(null);

  async function createPublicShareText() {
    const response = await fetch(`/api/v1/files/${fileId}/share`);
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.data?.url) throw new Error(body?.error ?? "Could not create share link.");
    return `${fileName}: ${body.data.url}`;
  }

  async function share(target: "whatsapp" | "email") {
    setLoading(target);
    const popup = target === "whatsapp" ? window.open("about:blank", "_blank") : null;
    try {
      const text = await createPublicShareText();
      const url = target === "whatsapp"
        ? `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
        : `mailto:?subject=${encodeURIComponent(fileName)}&body=${encodeURIComponent(text)}`;
      if (popup) popup.location.href = url;
      else window.open(url, "_self");
    } catch (error) {
      popup?.close();
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
