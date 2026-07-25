"use client";

import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { createDirectShareLinks, shareFiles, whatsappTextShare } from "@/lib/file-sharing";

export function FileShareActions({ fileId, fileName }: { fileId: string; fileName: string }) {
  const [loading, setLoading] = useState<"whatsapp" | "email" | null>(null);

  async function share(target: "whatsapp" | "email") {
    setLoading(target);
    try {
      const file = { id: fileId, fileName };
      if (target === "whatsapp" && await shareFiles([file], fileName)) return;
      const [url] = await createDirectShareLinks([file]);
      const text = `${fileName}:\n${url}`;
      if (target === "whatsapp") whatsappTextShare(text);
      else window.location.href = `mailto:?subject=${encodeURIComponent(fileName)}&body=${encodeURIComponent(text)}`;
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
