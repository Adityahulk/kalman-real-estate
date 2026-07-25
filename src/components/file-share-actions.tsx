"use client";

import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { createDirectShareLinks, shareFiles } from "@/lib/file-sharing";

export function FileShareActions({ fileId, fileName }: { fileId: string; fileName: string }) {
  const [loading, setLoading] = useState<"whatsapp" | "email" | null>(null);
  const [message, setMessage] = useState("");

  async function share(target: "whatsapp" | "email") {
    setLoading(target);
    setMessage("");
    try {
      const file = { id: fileId, fileName };
      if (target === "whatsapp") {
        const shared = await shareFiles([file], fileName);
        if (!shared) setMessage("This browser cannot attach files to a share target. Use the mobile app or a browser that supports file sharing.");
      } else {
        const [url] = await createDirectShareLinks([file]);
        window.location.href = `mailto:?subject=${encodeURIComponent(fileName)}&body=${encodeURIComponent(`${fileName}:\n${url}`)}`;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not prepare the file for sharing.");
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
