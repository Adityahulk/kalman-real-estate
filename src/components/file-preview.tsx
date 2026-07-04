"use client";

import { Download, ExternalLink, Minus, Plus } from "lucide-react";
import { useState } from "react";

export function FilePreview({ id, fileName, mimeType }: { id: string; fileName: string; mimeType: string }) {
  const [zoom, setZoom] = useState(100);
  const url = `/api/v1/files/${id}/download?disposition=inline&proxy=1`;
  const openUrl = `/api/v1/files/${id}/download?disposition=inline`;
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

  return <div className="flex h-[calc(100vh-16rem)] min-h-[520px] flex-col bg-slate-50 max-sm:h-[78vh] max-sm:min-h-[620px]">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-1">
        <button className="btn-outline h-8 px-2" type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(25, value - 25))}><Minus size={14} /></button>
        <span className="w-14 text-center text-xs">{zoom}%</span>
        <button className="btn-outline h-8 px-2" type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(400, value + 25))}><Plus size={14} /></button>
      </div>
      <div className="flex gap-1">
        <a className="btn-outline h-8 px-2 text-xs" href={openUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Open</a>
        <a className="btn-outline h-8 px-2 text-xs" href={`/api/v1/files/${id}/download`}><Download size={13} /> Download</a>
      </div>
    </div>
    <div className="pdf-scroll-viewer min-h-0 flex-1 overflow-auto">
      {isImage ? <img className="mx-auto block max-w-none object-contain p-4" src={url} alt={fileName} style={{ width: `${zoom}%`, minWidth: zoom >= 100 ? "100%" : undefined }} /> : null}
      {isPdf ? <iframe className="h-full min-h-[900px] border-0 bg-white max-sm:min-h-[1200px]" src={`${url}#toolbar=1&navpanes=0&zoom=${zoom}`} title={fileName} scrolling="yes" style={{ width: `${Math.max(100, zoom)}%` }} /> : null}
      {!isImage && !isPdf ? <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500"><div><p>This file type cannot be previewed directly in the browser.</p><a className="btn-primary mt-4" href={url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open file</a></div></div> : null}
    </div>
  </div>;
}
