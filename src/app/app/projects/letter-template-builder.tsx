"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Loader2, Plus, Save, Trash2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { loadBrowserPdfJs } from "@/lib/pdfjs-browser";

type TemplateField = { id: string; label: string; sourceText?: string; key: string; mapping: string | null };
type Template = { id: string; name: string; body: string; sourceFileId?: string | null; sourceFileName?: string; fields: TemplateField[]; createdAt: string };
type FieldCategory = { id: string; name: string; fields: Array<{ id: string; label: string; mapping: string | null }> };

export function LetterTemplateBuilder({ projectId, templates, categories }: { projectId: string; templates: Template[]; categories: FieldCategory[] }) {
  const router = useRouter();
  const viewerRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const [name, setName] = useState("Allotment letter");
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [sourceFileId, setSourceFileId] = useState<string | undefined>();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  async function readPdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setMessage("");
    try {
      if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") throw new Error("Upload a PDF file.");
      const [uploadedId] = await Promise.all([
        uploadTemplateSource(file),
        renderPdfInViewer(file),
      ]);
      setSourceFileId(uploadedId);
      setName(file.name.replace(/\.pdf$/i, ""));
      setFields([]);
      setMessage("PDF loaded. Select text and add fields.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PDF could not be opened.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  async function renderPdfInViewer(file: File) {
    const pdfjs = await loadBrowserPdfJs();
    const pdfDocument = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    if (!viewerRef.current) return;
    viewerRef.current.innerHTML = "";
    const SCALE = 1.5;
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale: SCALE });

      const pageContainer = document.createElement("div");
      pageContainer.className = "pdf-template-page";
      pageContainer.style.cssText = `position:relative;width:${viewport.width}px;height:${viewport.height}px;margin:0 auto 16px;box-shadow:0 1px 4px rgba(0,0,0,.2);background:#fff;`;

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.cssText = "display:block;";
      const ctx = canvas.getContext("2d");
      if (ctx) await page.render({ canvasContext: ctx, viewport }).promise;

      const textLayerDiv = document.createElement("div");
      textLayerDiv.className = "textLayer";
      textLayerDiv.style.cssText = `width:${viewport.width}px;height:${viewport.height}px;`;

      const textContent = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tl = new (pdfjs as any).TextLayer({ textContentSource: textContent, container: textLayerDiv, viewport });
      await tl.render();

      pageContainer.appendChild(canvas);
      pageContainer.appendChild(textLayerDiv);
      viewerRef.current.appendChild(pageContainer);
    }
    setPdfLoaded(true);
  }

  function rememberSelection() {
    const selection = window.getSelection();
    if (selection?.rangeCount && viewerRef.current?.contains(selection.anchorNode)) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }

  function addField() {
    const range = selectionRef.current;
    const selected = range?.toString().trim();
    if (!range || !selected) return setMessage("Select text in the document first.");
    const id = crypto.randomUUID();
    const field: TemplateField = { id, label: selected.slice(0, 100), sourceText: selected, key: keyFromLabel(selected, fields), mapping: null };
    range.deleteContents();
    const marker = document.createElement("mark");
    marker.dataset.templateField = id;
    marker.className = "pdf-field-marker";
    marker.textContent = `{{field.${id}}}`;
    range.insertNode(marker);
    setFields((items) => [...items, field]);
    selectionRef.current = null;
    setMessage("");
  }

  function removeField(id: string) {
    viewerRef.current?.querySelectorAll(`[data-template-field="${id}"]`).forEach((node) => node.replaceWith((node as HTMLElement).innerText));
    setFields((items) => items.filter((field) => field.id !== id));
  }

  /**
   * Builds the template body as structured letter HTML that is fully compatible with
   * the downstream letter generation pipeline (isLetterStudioHtml → buildLetterStudioPdfFromHtml).
   *
   * When the viewer shows live PDF pages (canvas + textLayer), we extract the text
   * content from each page's textLayer — preserving any <mark data-template-field>
   * field tokens the user inserted — and wrap it in <section data-letter-page> sections.
   *
   * When the viewer shows an already-saved body (loaded from a saved template), we
   * return that HTML directly since it already has the right structure.
   */
  function buildBodyHtml(): string {
    if (!viewerRef.current) return "";

    const pdfPages = viewerRef.current.querySelectorAll<HTMLElement>(".pdf-template-page");

    // No canvas-based pages → viewer is showing a previously-saved letter body
    if (!pdfPages.length) return viewerRef.current.innerHTML;

    const sections = Array.from(pdfPages).map((page, index) => {
      const textLayer = page.querySelector<HTMLElement>(".textLayer");
      const pageHtml = textLayer ? extractLetterPageHtml(textLayer) : "";
      return `<section data-letter-page="${index + 1}" data-top="790">${pageHtml}</section>`;
    }).join("\n\n");

    return `<div data-letter-template="pdf-source">\n${sections}\n</div>`;
  }

  async function save() {
    if (!pdfLoaded) return setMessage("Upload a PDF and prepare the template first.");
    const body = buildBodyHtml();
    if (!body.trim()) return setMessage("Upload a PDF and prepare the template first.");
    setLoading(true);
    const response = await fetch(`/api/v1/projects/${projectId}/letter-templates`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, type: "allotment_letter", body, fields, sourceFileId }),
    });
    const result = await response.json();
    setLoading(false);
    setMessage(response.ok ? "Letter template saved and set as active." : result.error ?? "Template could not be saved.");
    if (response.ok) router.refresh();
  }

  async function removeTemplate(id: string) {
    if (!window.confirm("Delete this saved letter template?")) return;
    const response = await fetch(`/api/v1/projects/${projectId}/letter-templates/${id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  }

  function loadTemplate(template: Template) {
    setName(template.name);
    setFields(template.fields);
    setSourceFileId(template.sourceFileId ?? undefined);
    if (viewerRef.current) viewerRef.current.innerHTML = template.body;
    setPdfLoaded(true);
  }

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-4">
        <label className="min-w-64 flex-1"><span className="label">Letter name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="btn-outline cursor-pointer"><UploadCloud size={16} />Upload PDF<input className="hidden" type="file" accept=".pdf,application/pdf" onChange={readPdf} /></label>
        <button className="btn-outline" type="button" onClick={addField}><Plus size={16} />Add selected text as field</button>
        <button className="btn-primary" type="button" onClick={() => void save()} disabled={loading}>{loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}Save template</button>
      </div>
      {message ? <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">{message}</div> : null}
      <div className="letter-template-editor-viewport max-h-[calc(100vh-18rem)] bg-slate-100 p-2 sm:p-5">
        <div
          ref={viewerRef}
          className="letter-paper-editor min-h-[760px]"
          onMouseUp={rememberSelection}
          onKeyUp={rememberSelection}
        />
      </div>
    </section>
    <aside className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Letter fields</h2>
        <p className="mt-1 text-xs text-slate-500">Mapped fields auto-fill. Manual fields are requested during allotment.</p>
        <div className="mt-4 space-y-3">
          {fields.map((field) => <FieldEditor field={field} categories={categories} key={field.id} onChange={(next) => setFields((items) => items.map((item) => item.id === field.id ? next : item))} onDelete={() => removeField(field.id)} />)}
          {!fields.length ? <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">Select text inside the document, then add it as a field.</div> : null}
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Saved templates</h2>
        <div className="mt-3 space-y-2">{templates.map((template) => <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-3" key={template.id}><button className="min-w-0 text-left" type="button" onClick={() => loadTemplate(template)}><span className="block truncate text-sm font-medium">{template.name}</span><span className="text-xs text-slate-500">{template.fields.length} fields · {template.sourceFileName?.split(".").pop()?.toUpperCase() ?? "Template"}</span></button><button className="btn-ghost h-8 px-2 text-rose-700" type="button" onClick={() => void removeTemplate(template.id)}><Trash2 size={14} /></button></div>)}</div>
      </section>
    </aside>
  </div>;
}

/**
 * Extracts readable paragraph-structured HTML from a pdf.js textLayer.
 *
 * Approach:
 * 1. Collect all text spans (and any top-level <mark> field tokens inserted by the user).
 * 2. Sort by their rendered screen position (top → bottom, left → right).
 * 3. Cluster into lines (spans within 2 px vertically).
 * 4. Cluster lines into paragraphs (gap > 1.6× the median inter-line gap).
 * 5. Output <p> elements with <br> for intra-paragraph line breaks,
 *    preserving any <mark data-template-field> tokens intact.
 *
 * The resulting HTML is compatible with renderSection() in ambey-allotment-pdf.ts
 * and renders correctly in both LetterStudioEditor and buildLetterStudioPdfFromHtml().
 */
function extractLetterPageHtml(textLayer: HTMLElement): string {
  type Chunk = { top: number; left: number; html: string };
  const chunks: Chunk[] = [];

  function spanHtml(el: HTMLElement): string {
    let out = "";
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const t = (child.textContent ?? "").replace(/\s+/g, " ");
        if (t.trim()) out += t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      } else {
        const c = child as HTMLElement;
        if (c.tagName === "MARK" && c.dataset.templateField) out += c.outerHTML;
      }
    }
    return out;
  }

  for (const child of Array.from(textLayer.children) as HTMLElement[]) {
    const rect = child.getBoundingClientRect();
    if (child.tagName === "MARK" && child.dataset.templateField) {
      // Field token inserted at a span boundary (direct child of textLayer)
      chunks.push({ top: rect.top, left: rect.left, html: child.outerHTML });
    } else if (child.tagName === "SPAN") {
      const html = spanHtml(child);
      if (html) chunks.push({ top: rect.top, left: rect.left, html });
    }
    // br and markedContent structural divs are skipped intentionally
  }

  if (!chunks.length) return "";

  // Sort top-to-bottom, left-to-right
  chunks.sort((a, b) => a.top !== b.top ? a.top - b.top : a.left - b.left);

  // Cluster into lines (within 2 px of each other vertically)
  const lines: Array<{ avgTop: number; parts: string[] }> = [];
  for (const chunk of chunks) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(chunk.top - last.avgTop) <= 2) {
      last.parts.push(chunk.html);
    } else {
      lines.push({ avgTop: chunk.top, parts: [chunk.html] });
    }
  }

  // Compute median inter-line gap to detect paragraph breaks
  const gaps = lines.slice(1).map((l, i) => l.avgTop - lines[i].avgTop).filter((g) => g > 0.5);
  const sorted = [...gaps].sort((a, b) => a - b);
  const medianGap = sorted[Math.floor(sorted.length / 2)] ?? 14;

  // Cluster lines into paragraphs
  const paragraphs: string[] = [];
  let current: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    current.push(lines[i].parts.join(" "));
    const gap = i + 1 < lines.length ? lines[i + 1].avgTop - lines[i].avgTop : 9999;
    if (gap > medianGap * 1.6) {
      paragraphs.push(`<p>${current.join("<br>")}</p>`);
      current = [];
    }
  }
  if (current.length) paragraphs.push(`<p>${current.join("<br>")}</p>`);

  return paragraphs.join("\n");
}

async function uploadTemplateSource(file: File) {
  const metaResponse = await fetch("/api/v1/files/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fileName: file.name, mimeType: file.type || "application/pdf", sizeBytes: file.size, visibility: "TEAM", ownerType: "LetterTemplateSource" }),
  });
  const meta = await metaResponse.json();
  if (!metaResponse.ok) throw new Error(meta.error ?? "Source document upload could not start.");
  const target = typeof meta.data.upload === "string" ? { url: meta.data.upload, provider: "LOCAL", storageKey: meta.data.file.storageKey } : meta.data.upload.primary;
  const uploadResponse = await fetch(target.url, { method: "PUT", headers: { "content-type": file.type || "application/octet-stream" }, body: file });
  if (!uploadResponse.ok) throw new Error("Source document upload failed.");
  const completeResponse = await fetch(`/api/v1/files/${meta.data.file.id}/upload-complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ storageProvider: target.provider, storageKey: target.storageKey || meta.data.file.storageKey, sizeBytes: file.size }),
  });
  const completed = await completeResponse.json();
  if (!completeResponse.ok) throw new Error(completed.error ?? "Source document upload could not be completed.");
  return completed.data.id as string;
}

function FieldEditor({ field, categories, onChange, onDelete }: { field: TemplateField; categories: FieldCategory[]; onChange: (field: TemplateField) => void; onDelete: () => void }) {
  const [category, setCategory] = useState(field.mapping ? categoryFor(field.mapping, categories) : "Manual");
  const options = category === "Manual" ? [] : categories.find((item) => item.id === category)?.fields ?? [];
  return <div className="rounded-lg border border-slate-200 p-3">
    <div className="flex gap-2"><input className="input h-9 min-w-0" value={field.label} onChange={(event) => onChange({ ...field, label: event.target.value })} /><button className="btn-ghost h-9 px-2 text-rose-700" type="button" onClick={onDelete}><Trash2 size={14} /></button></div>
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      <select className="input h-9" value={category} onChange={(event) => { setCategory(event.target.value); onChange({ ...field, mapping: null }); }}><option>Manual</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      <select className="input h-9" value={field.mapping ?? ""} disabled={category === "Manual"} onChange={(event) => onChange({ ...field, mapping: event.target.value || null })}><option value="">Choose parameter</option>{options.map((option) => <option value={option.mapping ?? ""} key={option.id}>{option.label}{option.mapping ? "" : " (manual)"}</option>)}</select>
    </div>
    <div className="mt-2 text-xs text-slate-500">{field.mapping ? `Auto-fill: ${field.mapping}` : `Asked before letter: ${field.label}`}</div>
  </div>;
}

function categoryFor(mapping: string, categories: FieldCategory[]) {
  return categories.find((category) => category.fields.some((field) => field.mapping === mapping))?.id ?? "Manual";
}

function keyFromLabel(label: string, fields: TemplateField[]) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "field";
  let key = base;
  let index = 2;
  while (fields.some((field) => field.key === key)) key = `${base}_${index++}`;
  return key;
}
