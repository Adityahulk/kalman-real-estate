"use client";

import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { createFileBundleShareLinks, openWhatsAppWithLink } from "@/lib/file-sharing";

export function FileShareActions({ fileId, fileName }: { fileId: string; fileName: string }) {
  const [loading, setLoading] = useState<"whatsapp" | "email" | null>(null);
  const [message, setMessage] = useState("");

  async function share(target: "whatsapp" | "email") {
    setLoading(target);
    setMessage("");
    try {
      const file = { id: fileId, fileName };
      const [link] = await createFileBundleShareLinks([file]);
      const text = `${fileName}:\n${link.url}`;
      if (target === "whatsapp") {
        openWhatsAppWithLink(text);
      } else {
        window.location.href = `mailto:?subject=${encodeURIComponent(fileName)}&body=${encodeURIComponent(text)}`;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the WhatsApp download link.");
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
      {message ? <p className="w-full text-xs text-amber-700">{message}</p> : null}
    </>
  );
}
