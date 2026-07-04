"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, MessageCircle } from "lucide-react";

export function FileShareActions({ fileId, fileName }: { fileId: string; fileName: string }) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const share = useMemo(() => {
    const url = origin ? `${origin}/api/v1/files/${fileId}/download` : `/api/v1/files/${fileId}/download`;
    const text = `${fileName}: ${url}`;
    return {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
      email: `mailto:?subject=${encodeURIComponent(fileName)}&body=${encodeURIComponent(text)}`,
    };
  }, [fileId, fileName, origin]);

  return (
    <>
      <a className="btn-outline h-8 px-3 text-xs" href={share.whatsapp} target="_blank" rel="noreferrer">
        <MessageCircle size={13} />
        WhatsApp
      </a>
      <a className="btn-outline h-8 px-3 text-xs" href={share.email}>
        <Mail size={13} />
        Email
      </a>
    </>
  );
}
