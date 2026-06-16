"use client";

import { ChangeEvent, MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2, ChevronLeft, ChevronRight, Highlighter,
  Loader2, Save, Trash2, Undo2, Redo2, UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  PdfLayoutDocument, PdfLayoutField, PdfLayoutPage, PdfTextStyle,
  pdfLayoutDocumentSchema, pdfLayoutRectSchema,
} from "@/lib/pdf-layout";
import { createClientId } from "@/lib/id";
import { loadBrowserPdfJs } from "@/lib/pdfjs-browser";
import type { TextContent, TextItem } from "pdfjs-dist/types/src/display/api";

type Template = {
  id: string;
  name: string;
  type: string;
  sourceFileId: string;
  active: boolean;
  layoutData: PdfLayoutDocument;
  createdAt: string;
};
type FieldCategory = { id: string; name: string; fields: Array<{ id: string; label: string; mapping: string | null }> };
type Rect = { x: number; y: number; width: number; height: number };
type PendingSelection = {
  pageNumber: number;
  rect: Rect;
  rects: Rect[];
  text: string;
  style: Partial<PdfTextStyle>;
};

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

export function LetterTemplateBuilder({ projectId, templates, categories }: {
  projectId: string;
  templates: Template[];
  categories: FieldCategory[];
}) {
  const router = useRouter();
  const [name, setName] = useState("Allotment letter");
  const [type, setType] = useState("allotment_letter");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [sourceFileId, setSourceFileId] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [layout, setLayout] = useState<PdfLayoutDocument | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<"upload" | "save" | "activate" | "">("");
  const undoRef = useRef<PdfLayoutDocument[]>([]);
  const redoRef = useRef<PdfLayoutDocument[]>([]);

  useEffect(() => () => {
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  async function readPdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLoading("upload");
    setMessage("Reading PDF and preparing pages...");
    try {
      if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") throw new Error("Upload a PDF file.");
      const uploadedId = await uploadTemplateSource(file);
      const analyzed = await analyzePdf(file, uploadedId, (status) => setMessage(status));
      resetEditor({ templateId: null, sourceFileId: uploadedId, sourceUrl: URL.createObjectURL(file), name: file.name.replace(/\.pdf$/i, ""), type, layout: analyzed });
      setMessage(analyzed.warnings.length ? analyzed.warnings.join(" ") : "PDF ready. Drag a box around any text and click 'Make dynamic field' to mark a placeholder.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PDF could not be prepared.");
    } finally {
      setLoading("");
    }
  }

  async function loadTemplate(template: Template) {
    setLoading("upload");
    setMessage("Opening template...");
    try {
      const response = await fetch(`/api/v1/files/${template.sourceFileId}/download?disposition=inline&proxy=1`);
      if (!response.ok) throw new Error("Could not load the template PDF.");
      const blob = await response.blob();
      resetEditor({
        templateId: template.id, sourceFileId: template.sourceFileId,
        sourceUrl: URL.createObjectURL(blob), name: template.name, type: template.type,
        layout: pdfLayoutDocumentSchema.parse(template.layoutData),
      });
      setMessage(template.active ? "Active template opened." : "Template opened. Activate it when ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Template could not be opened.");
    } finally {
      setLoading("");
    }
  }

  function resetEditor(input: { templateId: string | null; sourceFileId: string; sourceUrl: string; name: string; type: string; layout: PdfLayoutDocument }) {
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    setTemplateId(input.templateId);
    setSourceFileId(input.sourceFileId);
    setSourceUrl(input.sourceUrl);
    setName(input.name);
    setType(input.type);
    setLayout(input.layout);
    setSelectedFieldId(null);
    setPendingSelection(null);
    undoRef.current = [];
    redoRef.current = [];
  }

  function commit(next: PdfLayoutDocument) {
    if (layout) undoRef.current.push(layout);
    redoRef.current = [];
    setLayout(next);
  }

  function undo() { const prev = undoRef.current.pop(); if (prev && layout) { redoRef.current.push(layout); setLayout(prev); } }
  function redo() { const next = redoRef.current.pop(); if (next && layout) { undoRef.current.push(layout); setLayout(next); } }

  function makeField() {
    if (!layout || !pendingSelection) return setMessage("Drag a box around text in the PDF first.");
    const { pageNumber, rect, rects, text, style } = pendingSelection;
    const overlapping = layout.fields.some((f) =>
      f.pageNumber === pageNumber && f.rect && rectsOverlap(f.rect, rect),
    );
    if (overlapping) return setMessage("That area already overlaps another dynamic field.");
    const field: PdfLayoutField = {
      id: createClientId(),
      key: uniqueFieldKey(text, layout.fields),
      label: text.trim().slice(0, 100),
      blockId: "",
      start: 0,
      end: 0,
      sourceText: text,
      mapping: null,
      pageNumber,
      rect,
      rects,
      style: {
        fontName: style.fontName ?? "Helvetica",
        fontFamily: style.fontFamily ?? "Arial",
        fontSize: style.fontSize ?? 12,
        fontWeight: style.fontWeight ?? 400,
        italic: style.italic ?? false,
        underline: false,
        color: style.color ?? "#111827",
        align: style.align ?? "left",
        letterSpacing: 0,
        wordSpacing: 0,
        lineHeight: (style.fontSize ?? 12) * 1.2,
        rotation: 0,
      },
    };
    commit({ ...layout, fields: [...layout.fields, field] });
    setPendingSelection(null);
    window.getSelection()?.removeAllRanges();
    setMessage("Dynamic field created. Choose its data source in the Fields panel.");
  }

  function updateField(id: string, update: (field: PdfLayoutField) => PdfLayoutField) {
    if (!layout) return;
    commit({ ...layout, fields: layout.fields.map((f) => f.id === id ? update(f) : f) });
  }

  function removeField(id: string) {
    if (!layout) return;
    commit({ ...layout, fields: layout.fields.filter((f) => f.id !== id) });
  }

  async function save() {
    if (!layout || !sourceFileId) return setMessage("Upload and prepare a PDF first.");
    setLoading("save");
    setMessage("");
    const endpoint = templateId
      ? `/api/v1/projects/${projectId}/letter-templates/${templateId}/layout`
      : `/api/v1/projects/${projectId}/letter-templates/import-pdf`;
    const response = await fetch(endpoint, {
      method: templateId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(templateId ? { name, layoutData: layout } : { name, type, sourceFileId, layoutData: layout }),
    });
    const result = await response.json();
    setLoading("");
    if (!response.ok) return setMessage(result.error ?? "Template could not be saved.");
    setTemplateId(result.data.id);
    setMessage("Template saved.");
    router.refresh();
  }

  async function activate() {
    if (!templateId) return setMessage("Save the template before activating it.");
    setLoading("activate");
    const response = await fetch(`/api/v1/projects/${projectId}/letter-templates/${templateId}/activate`, { method: "POST" });
    const result = await response.json();
    setLoading("");
    setMessage(response.ok ? "Template activated for new letters." : result.error ?? "Template could not be activated.");
    if (response.ok) router.refresh();
  }

  async function removeTemplate(id: string) {
    if (!window.confirm("Delete this PDF template?")) return;
    const response = await fetch(`/api/v1/projects/${projectId}/letter-templates/${id}`, { method: "DELETE" });
    if (response.ok) {
      if (id === templateId) { setTemplateId(null); setLayout(null); setSourceFileId(null); setSourceUrl(null); }
      router.refresh();
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
      <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="sticky top-16 z-20 flex flex-wrap items-end gap-2 border-b border-slate-200 bg-white p-3">
          <label className="min-w-52 flex-1">
            <span className="label">Template name</span>
            <input className="input h-10" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="w-48">
            <span className="label">Letter type</span>
            <select className="input h-10" value={type} disabled={Boolean(templateId)} onChange={(e) => setType(e.target.value)}>
              <option value="allotment_letter">Allotment letter</option>
              <option value="transfer_letter">Transfer letter</option>
              <option value="registry_status_letter">Registry letter</option>
            </select>
          </label>
          <label className="btn-outline h-10 cursor-pointer">
            {loading === "upload" ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
            Upload PDF
            <input className="hidden" type="file" accept=".pdf,application/pdf" onChange={readPdf} />
          </label>
          <button className="btn-outline h-10 px-3" type="button" onClick={undo} disabled={!undoRef.current.length} title="Undo"><Undo2 size={16} /></button>
          <button className="btn-outline h-10 px-3" type="button" onClick={redo} disabled={!redoRef.current.length} title="Redo"><Redo2 size={16} /></button>
          <button className="btn-outline h-10" type="button" onClick={makeField} disabled={!pendingSelection}>
            <Highlighter size={16} />Make dynamic field
          </button>
          <button className="btn-primary h-10" type="button" onClick={save} disabled={!layout || Boolean(loading)}>
            {loading === "save" ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}Save
          </button>
          <button className="btn-gold h-10" type="button" onClick={activate} disabled={!templateId || Boolean(loading)}>
            {loading === "activate" ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}Activate
          </button>
        </div>

        {message ? <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">{message}</div> : null}

        <div className="max-h-[calc(100dvh-14rem)] overflow-auto bg-slate-200 p-3 sm:p-6">
          {layout && sourceUrl ? (
            <PdfTextLayerCanvas
              sourceUrl={sourceUrl}
              layout={layout}
              selectedFieldId={selectedFieldId}
              onTextSelect={setPendingSelection}
              onFieldClick={setSelectedFieldId}
            />
          ) : (
            <div className="grid min-h-[620px] place-items-center rounded-lg border border-dashed border-slate-300 bg-white/70 p-8 text-center">
              <div>
                <UploadCloud className="mx-auto text-slate-400" size={42} />
                <h2 className="mt-3 font-semibold text-navy-900">Upload the builder&apos;s PDF letter</h2>
                <p className="mt-2 max-w-md text-sm text-slate-500">
                  The PDF displays exactly as-is. Drag a box around any text to mark it as a dynamic field — it will be auto-filled when generating letters.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-4 xl:max-h-[calc(100dvh-7rem)] xl:overflow-auto">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-navy-900">Dynamic fields</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Drag a box around text in the PDF, then click &quot;Make dynamic field&quot;. Map each field to auto-fill from plot/owner data.</p>
          {pendingSelection ? (
            <div className="mt-3 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 p-3">
              <div className="text-xs font-semibold text-blue-600">Text selected</div>
              <div className="mt-1 truncate text-sm">&ldquo;{pendingSelection.text.slice(0, 80)}&rdquo;</div>
              <button className="btn-primary mt-2 h-8 w-full justify-center text-xs" type="button" onClick={makeField}>
                <Highlighter size={14} />Create field from selection
              </button>
            </div>
          ) : null}
          <div className="mt-4 space-y-3">
            {layout?.fields.map((field) => (
              <FieldEditor
                key={field.id}
                field={field}
                categories={categories}
                selected={selectedFieldId === field.id}
                onFocus={() => setSelectedFieldId(field.id)}
                onChange={(next) => updateField(field.id, () => next)}
                onDelete={() => removeField(field.id)}
              />
            ))}
            {!layout?.fields.length && !pendingSelection ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">No dynamic fields yet. Drag a box around text in the PDF to get started.</div>
            ) : null}
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-navy-900">Saved templates</h2>
          <div className="mt-3 space-y-2">
            {templates.map((template) => (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3" key={template.id}>
                <button className="min-w-0 flex-1 text-left" type="button" onClick={() => void loadTemplate(template)}>
                  <span className="flex items-center gap-2 truncate text-sm font-medium">
                    {template.name}
                    {template.active ? <span className="chip bg-emerald-50 text-emerald-700">Active</span> : null}
                  </span>
                  <span className="text-xs text-slate-500">{template.layoutData.fields.length} fields · {template.layoutData.pageCount} pages</span>
                </button>
                <button className="btn-ghost h-8 px-2 text-rose-700" type="button" onClick={() => void removeTemplate(template.id)} title="Delete template"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PDF canvas with marquee (drag-a-box) selection snapped to word boxes
// ---------------------------------------------------------------------------

const TEXT_LAYER_CSS = `
.pdf-text-layer {
  position: absolute;
  inset: 0;
  overflow: clip;
  line-height: 1;
  z-index: 2;
  user-select: none;
  -webkit-user-select: none;
  cursor: crosshair;
}
.pdf-text-layer span {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: crosshair;
  transform-origin: 0% 0%;
  pointer-events: none;
}
`;

type WordBox = { text: string; left: number; top: number; right: number; bottom: number };

function collectSpanBoxes(textLayerDiv: HTMLDivElement, containerRect: DOMRect): WordBox[] {
  const boxes: WordBox[] = [];
  const spans = textLayerDiv.querySelectorAll("span");
  for (const span of spans) {
    const textNode = span.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) continue;
    const fullText = textNode.textContent ?? "";
    if (!fullText.trim()) continue;
    const spanRect = span.getBoundingClientRect();
    if (spanRect.width < 0.4 || spanRect.height < 0.4) continue;

    // Split the span text into words and compute each word's box.
    // The Range API ignores CSS scaleX, so we compute a correction factor
    // from the span's element box (which includes scaleX) vs Range over full text.
    const fullRange = document.createRange();
    fullRange.selectNodeContents(textNode);
    const fullRangeRect = fullRange.getBoundingClientRect();
    const scaleCorrection = fullRangeRect.width > 0 ? spanRect.width / fullRangeRect.width : 1;

    const wordPattern = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = wordPattern.exec(fullText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, end);
      const rr = range.getBoundingClientRect();
      if (rr.width < 0.1 || rr.height < 0.1) continue;
      // Scale the Range rect's horizontal positions by the correction factor,
      // anchored to the span's left edge.
      const rawLeft = rr.left - spanRect.left;
      const rawRight = rr.right - spanRect.left;
      const corrLeft = spanRect.left + rawLeft * scaleCorrection;
      const corrRight = spanRect.left + rawRight * scaleCorrection;
      boxes.push({
        text: match[0],
        left: corrLeft - containerRect.left,
        top: spanRect.top - containerRect.top,
        right: corrRight - containerRect.left,
        bottom: spanRect.bottom - containerRect.top,
      });
    }
  }
  return boxes;
}

export function PdfTextLayerCanvas({ sourceUrl, layout, selectedFieldId, onTextSelect, onFieldClick, previewValues }: {
  sourceUrl: string;
  layout: PdfLayoutDocument;
  selectedFieldId: string | null;
  onTextSelect: (selection: PendingSelection | null) => void;
  onFieldClick: (fieldId: string) => void;
  previewValues?: Record<string, string>;
}) {
  const isPreview = Boolean(previewValues);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef(new Map<number, HTMLCanvasElement>());
  const textLayerRefs = useRef(new Map<number, HTMLDivElement>());
  const pageContainerRefs = useRef(new Map<number, HTMLDivElement>());
  const textContentsRef = useRef(new Map<number, TextContent>());
  const [availableWidth, setAvailableWidth] = useState(860);
  const [marquee, setMarquee] = useState<{ pageNumber: number; x0: number; y0: number; x1: number; y1: number } | null>(null);
  const dragRef = useRef<{ pageNumber: number; startX: number; startY: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(Math.max(320, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const pdfjs = await loadBrowserPdfJs();
      const bytes = await fetch(sourceUrl).then((r) => r.arrayBuffer());
      const pdf = await pdfjs.getDocument({ data: bytes }).promise;

      for (const pageData of layout.pages) {
        if (cancelled) break;
        const canvas = canvasRefs.current.get(pageData.pageNumber);
        const textLayerDiv = textLayerRefs.current.get(pageData.pageNumber);
        if (!canvas || !textLayerDiv) continue;

        const page = await pdf.getPage(pageData.pageNumber);
        const displayWidth = Math.min(860, availableWidth, pageData.width * 1.45);
        const scale = displayWidth / pageData.width;
        const viewport = page.getViewport({ scale });

        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.ceil(viewport.width * dpr);
        canvas.height = Math.ceil(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport, transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0] }).promise;

        textLayerDiv.innerHTML = "";
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;
        textLayerDiv.style.setProperty("--scale-factor", `${scale}`);
        const textContent = await page.getTextContent();
        textContentsRef.current.set(pageData.pageNumber, textContent);

        const { TextLayer } = pdfjs;
        const textLayer = new TextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport,
        });
        await textLayer.render();
      }
    })();
    return () => { cancelled = true; };
  }, [sourceUrl, layout.pageCount, availableWidth]);

  const finishMarquee = useCallback((pageNumber: number, box: { x0: number; y0: number; x1: number; y1: number }) => {
    const textLayerDiv = textLayerRefs.current.get(pageNumber);
    const pageContainer = pageContainerRefs.current.get(pageNumber);
    if (!textLayerDiv || !pageContainer) { onTextSelect(null); return; }

    const mx0 = Math.min(box.x0, box.x1);
    const my0 = Math.min(box.y0, box.y1);
    const mx1 = Math.max(box.x0, box.x1);
    const my1 = Math.max(box.y0, box.y1);
    // Too small a drag = a click, not a selection.
    if (mx1 - mx0 < 4 && my1 - my0 < 4) { onTextSelect(null); return; }

    const containerRect = pageContainer.getBoundingClientRect();
    const dw = containerRect.width;
    const dh = containerRect.height;

    // Select spans whose center falls inside the marquee box.
    const words = collectSpanBoxes(textLayerDiv, containerRect).filter((w) => {
      const cx = (w.left + w.right) / 2;
      const cy = (w.top + w.bottom) / 2;
      return cx >= mx0 && cx <= mx1 && cy >= my0 && cy <= my1;
    });
    if (!words.length) { onTextSelect(null); return; }

    // Group selected words into visual lines, building one tight rect per line.
    words.sort((a, b) => a.top - b.top || a.left - b.left);
    const lines: Array<{ words: WordBox[]; left: number; top: number; right: number; bottom: number }> = [];
    for (const w of words) {
      const cy = (w.top + w.bottom) / 2;
      const h = w.bottom - w.top;
      const line = lines.find((l) => {
        const lcy = (l.top + l.bottom) / 2;
        return Math.abs(cy - lcy) < Math.min(h, l.bottom - l.top) * 0.7;
      });
      if (line) {
        line.words.push(w);
        line.left = Math.min(line.left, w.left);
        line.top = Math.min(line.top, w.top);
        line.right = Math.max(line.right, w.right);
        line.bottom = Math.max(line.bottom, w.bottom);
      } else {
        lines.push({ words: [w], left: w.left, top: w.top, right: w.right, bottom: w.bottom });
      }
    }

    const rects = lines.map((l) => ({
      x: clamp(l.left / dw),
      y: clamp(l.top / dh),
      width: clamp((l.right - l.left) / dw, 0.002, 1),
      height: clamp((l.bottom - l.top) / dh, 0.002, 1),
    }));
    const text = lines
      .map((l) => l.words.sort((a, b) => a.left - b.left).map((w) => w.text).join(" "))
      .join("\n");

    const bounding = {
      x: Math.min(...rects.map((r) => r.x)),
      y: Math.min(...rects.map((r) => r.y)),
      width: 0,
      height: 0,
    };
    bounding.width = clamp(Math.max(...rects.map((r) => r.x + r.width)) - bounding.x, 0.002, 1);
    bounding.height = clamp(Math.max(...rects.map((r) => r.y + r.height)) - bounding.y, 0.002, 1);

    const pageData = layout.pages.find((p) => p.pageNumber === pageNumber);
    const textContent = textContentsRef.current.get(pageNumber);
    const style = textContent && pageData
      ? extractFontFromTextContent(textContent, rects[0], pageData.width, pageData.height)
      : {};

    onTextSelect({ pageNumber, rect: bounding, rects, text, style });
  }, [layout, onTextSelect]);

  const handleMouseDown = useCallback((e: ReactMouseEvent, pageNumber: number) => {
    if (isPreview || e.button !== 0) return;
    const pageContainer = pageContainerRefs.current.get(pageNumber);
    if (!pageContainer) return;
    const cr = pageContainer.getBoundingClientRect();
    const startX = e.clientX - cr.left;
    const startY = e.clientY - cr.top;
    dragRef.current = { pageNumber, startX, startY };
    setMarquee({ pageNumber, x0: startX, y0: startY, x1: startX, y1: startY });

    const onMove = (ev: globalThis.MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const rect = pageContainerRefs.current.get(drag.pageNumber)?.getBoundingClientRect();
      if (!rect) return;
      setMarquee({
        pageNumber: drag.pageNumber,
        x0: drag.startX,
        y0: drag.startY,
        x1: ev.clientX - rect.left,
        y1: ev.clientY - rect.top,
      });
    };
    const onUp = (ev: globalThis.MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const drag = dragRef.current;
      dragRef.current = null;
      setMarquee(null);
      if (!drag) return;
      const rect = pageContainerRefs.current.get(drag.pageNumber)?.getBoundingClientRect();
      if (!rect) return;
      finishMarquee(drag.pageNumber, {
        x0: drag.startX,
        y0: drag.startY,
        x1: ev.clientX - rect.left,
        y1: ev.clientY - rect.top,
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    e.preventDefault();
  }, [isPreview, finishMarquee]);

  return (
    <div className="space-y-6" ref={containerRef}>
      <style dangerouslySetInnerHTML={{ __html: TEXT_LAYER_CSS }} />
      {layout.pages.map((page) => {
        const displayWidth = Math.min(860, availableWidth, page.width * 1.45);
        const displayHeight = displayWidth * page.height / page.width;
        const ptToPx = displayWidth / page.width;
        const pageFields = layout.fields.filter((f) => f.pageNumber === page.pageNumber && (f.rects?.length || f.rect));
        const showMarquee = marquee && marquee.pageNumber === page.pageNumber;
        return (
          <div
            key={page.pageNumber}
            ref={(el) => { if (el) pageContainerRefs.current.set(page.pageNumber, el); else pageContainerRefs.current.delete(page.pageNumber); }}
            className="relative mx-auto overflow-hidden bg-white shadow-xl"
            style={{ width: displayWidth, height: displayHeight }}
          >
            <canvas
              className="absolute inset-0"
              ref={(el) => { if (el) canvasRefs.current.set(page.pageNumber, el); else canvasRefs.current.delete(page.pageNumber); }}
            />
            <div
              className="pdf-text-layer"
              style={isPreview ? { cursor: "default" } : undefined}
              ref={(el) => { if (el) textLayerRefs.current.set(page.pageNumber, el); else textLayerRefs.current.delete(page.pageNumber); }}
              onMouseDown={(e) => handleMouseDown(e, page.pageNumber)}
            />

            {showMarquee ? (
              <div
                className="pointer-events-none absolute z-[6] border-2 border-blue-500 bg-blue-400/20"
                style={{
                  left: Math.min(marquee.x0, marquee.x1),
                  top: Math.min(marquee.y0, marquee.y1),
                  width: Math.abs(marquee.x1 - marquee.x0),
                  height: Math.abs(marquee.y1 - marquee.y0),
                }}
              />
            ) : null}

            {pageFields.map((field) => {
              const fieldRects = field.rects?.length ? field.rects : (field.rect ? [field.rect] : []);
              const isSelected = selectedFieldId === field.id;
              const previewText = previewValues?.[field.id];
              const bx = field.rect ?? fieldRects[0];
              return (
                <div key={field.id} data-field-overlay>
                  {/* In preview mode: white out the original text under the field. */}
                  {isPreview ? fieldRects.map((r, i) => (
                    <div
                      key={`mask-${i}`}
                      className="absolute z-[3] bg-white"
                      style={{
                        left: `${r.x * 100}%`,
                        top: `${r.y * 100}%`,
                        width: `${r.width * 100}%`,
                        height: `${r.height * 100}%`,
                      }}
                    />
                  )) : null}

                  {/* Preview: render the resolved value text in place. */}
                  {isPreview && bx ? (
                    <div
                      className="absolute z-[4] whitespace-pre-wrap leading-tight text-slate-900"
                      style={{
                        left: `${bx.x * 100}%`,
                        top: `${bx.y * 100}%`,
                        width: `${Math.max(bx.width, 0.3) * 100}%`,
                        fontSize: `${Math.max(7, (field.style?.fontSize ?? 12) * ptToPx)}px`,
                        fontFamily: field.style?.fontFamily ?? "Arial",
                        fontWeight: (field.style?.fontWeight ?? 400) >= 600 ? 700 : 400,
                        fontStyle: field.style?.italic ? "italic" : "normal",
                        color: field.style?.color ?? "#111827",
                      }}
                    >
                      {previewText ?? field.sourceText}
                    </div>
                  ) : null}

                  {/* Builder: amber field outline (per line). */}
                  {!isPreview ? fieldRects.map((r, i) => (
                    <div
                      key={i}
                      className={`absolute z-[3] cursor-pointer rounded-[2px] border transition-colors ${
                        isSelected
                          ? "border-blue-500 bg-blue-300/40"
                          : "border-amber-400 bg-amber-200/35 hover:bg-amber-300/50"
                      }`}
                      style={{
                        left: `${r.x * 100}%`,
                        top: `${r.y * 100}%`,
                        width: `${r.width * 100}%`,
                        height: `${r.height * 100}%`,
                        pointerEvents: "auto",
                      }}
                      onClick={() => onFieldClick(field.id)}
                      title={field.label}
                    >
                      {i === 0 ? (
                        <span className="absolute -top-[18px] left-0 z-[5] whitespace-nowrap rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
                          {field.label.slice(0, 30)}
                        </span>
                      ) : null}
                    </div>
                  )) : null}
                </div>
              );
            })}
            <span className="absolute bottom-2 right-3 z-[7] rounded bg-slate-900/70 px-2 py-1 text-xs text-white">Page {page.pageNumber}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field editor
// ---------------------------------------------------------------------------

function FieldEditor({ field, categories, selected, onFocus, onChange, onDelete }: {
  field: PdfLayoutField;
  categories: FieldCategory[];
  selected: boolean;
  onFocus: () => void;
  onChange: (field: PdfLayoutField) => void;
  onDelete: () => void;
}) {
  const [category, setCategory] = useState(field.mapping ? categoryFor(field.mapping, categories) : "Manual");
  const options = category === "Manual" ? [] : categories.find((item) => item.id === category)?.fields ?? [];
  return (
    <div className={`rounded-lg border p-3 ${selected ? "border-blue-400 bg-blue-50/50" : "border-slate-200"}`} onClick={onFocus}>
      <div className="flex gap-2">
        <input className="input h-9 min-w-0" value={field.label} onChange={(e) => onChange({ ...field, label: e.target.value })} />
        <button className="btn-ghost h-9 px-2 text-rose-700" type="button" onClick={onDelete}><Trash2 size={14} /></button>
      </div>
      <div className="mt-2 grid gap-2">
        <select className="input h-9" value={category} onChange={(e) => { setCategory(e.target.value); onChange({ ...field, mapping: null }); }}>
          <option>Manual</option>
          {categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
        <select className="input h-9" value={field.mapping ?? ""} disabled={category === "Manual"} onChange={(e) => onChange({ ...field, mapping: e.target.value || null })}>
          <option value="">Choose parameter</option>
          {options.map((opt) => <option value={opt.mapping ?? ""} key={opt.id}>{opt.label}</option>)}
        </select>
      </div>
      <div className="mt-2 truncate text-xs text-slate-500">
        {field.mapping ? `Auto-fill: ${field.mapping}` : `Manual entry · Original: "${field.sourceText.slice(0, 50)}"`}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PDF analysis
// ---------------------------------------------------------------------------

async function analyzePdf(file: File, sourceFileId: string, progress: (message: string) => void): Promise<PdfLayoutDocument> {
  const pdfjs = await loadBrowserPdfJs();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: PdfLayoutPage[] = [];
  const warnings: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    progress(`Reading page ${pageNumber} of ${pdf.numPages}...`);
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const hasText = content.items.some((item) => "str" in item && (item as TextItem).str?.trim());
    if (!hasText) {
      progress(`Page ${pageNumber} has no extractable text. OCR may be needed.`);
      warnings.push(`Page ${pageNumber} appears to be a scanned image. Text selection may not work on this page.`);
    }
    pages.push({ pageNumber, width: viewport.width, height: viewport.height, rotation: viewport.rotation, blocks: [] });
  }
  return { version: 1, sourceFileId, pageCount: pdf.numPages, pages, fields: [], warnings };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractFontFromTextContent(
  textContent: TextContent,
  selRect: { x: number; y: number; width: number; height: number },
  pageWidth: number,
  pageHeight: number,
): Partial<PdfTextStyle> {
  const styles = (textContent as unknown as { styles?: Record<string, { fontFamily?: string }> }).styles ?? {};
  for (const item of textContent.items) {
    if (!("str" in item)) continue;
    const ti = item as TextItem;
    if (!ti.str?.trim() || !ti.transform || ti.transform.length < 6) continue;
    const fontSize = Math.max(5, Math.hypot(ti.transform[2] ?? 0, ti.transform[3] ?? 0) || 12);
    const x = (ti.transform[4] ?? 0) / pageWidth;
    const top = 1 - ((ti.transform[5] ?? 0) + fontSize) / pageHeight;
    const itemWidth = Math.max((ti.width ?? 0) / pageWidth, 0.01);
    const itemHeight = fontSize * 1.3 / pageHeight;
    if (rectsOverlap({ x, y: top, width: itemWidth, height: itemHeight }, selRect)) {
      const rawFontName = (ti as unknown as { fontName?: string }).fontName ?? "";
      const styleEntry = styles[rawFontName];
      const resolvedFamily = styleEntry?.fontFamily || fontFamily(rawFontName);
      const fontName = resolvedFamily || "Helvetica";
      return {
        fontName,
        fontFamily: fontFamily(fontName),
        fontSize,
        fontWeight: /bold|black|semi/i.test(rawFontName) || /bold|black|semi/i.test(fontName) ? 700 : 400,
        italic: /italic|oblique/i.test(rawFontName) || /italic|oblique/i.test(fontName),
        color: "#111827",
        align: "left",
      };
    }
  }
  return { fontName: "Helvetica", fontFamily: "Arial", fontSize: 12, fontWeight: 400, italic: false, color: "#111827", align: "left" };
}

function rectsOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function uploadTemplateSource(file: File) {
  const metaResponse = await fetch("/api/v1/files/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fileName: file.name, mimeType: file.type || "application/pdf", sizeBytes: file.size, visibility: "TEAM", ownerType: "LetterTemplateSource" }),
  });
  const meta = await metaResponse.json();
  if (!metaResponse.ok) throw new Error(meta.error ?? "Source document upload could not start.");
  const primary = typeof meta.data.upload === "string"
    ? { url: meta.data.upload, provider: "LOCAL", storageKey: meta.data.file.storageKey }
    : meta.data.upload.primary;
  const fallback = typeof meta.data.upload === "object" ? meta.data.upload.fallback : null;
  let target = primary;
  let uploadOk = false;
  try {
    const uploadResponse = await fetch(primary.url, { method: "PUT", headers: { "content-type": file.type || "application/octet-stream" }, body: file });
    uploadOk = uploadResponse.ok;
  } catch {
    // network error (e.g. S3/MinIO not reachable) — fall through to local fallback
  }
  if (!uploadOk && fallback) {
    target = fallback;
    const fallbackResponse = await fetch(fallback.url, { method: "PUT", credentials: "include", headers: { "content-type": file.type || "application/octet-stream" }, body: file });
    if (!fallbackResponse.ok) throw new Error("Source document upload failed.");
  } else if (!uploadOk) {
    throw new Error("Source document upload failed.");
  }
  const completeResponse = await fetch(`/api/v1/files/${meta.data.file.id}/upload-complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ storageProvider: target.provider, storageKey: target.storageKey || meta.data.file.storageKey, sizeBytes: file.size }),
  });
  const completed = await completeResponse.json();
  if (!completeResponse.ok) throw new Error(completed.error ?? "Source document upload could not be completed.");
  return completed.data.id as string;
}

function uniqueFieldKey(label: string, fields: PdfLayoutField[]) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "field";
  let key = base;
  let suffix = 2;
  while (fields.some((f) => f.key === key)) key = `${base}_${suffix++}`;
  return key;
}

function categoryFor(mapping: string, categories: FieldCategory[]) {
  return categories.find((c) => c.fields.some((f) => f.mapping === mapping))?.id ?? "Manual";
}

function fontFamily(fontName: string) {
  if (/times|serif|roman/i.test(fontName)) return "Times New Roman";
  if (/courier|mono/i.test(fontName)) return "Courier New";
  return "Arial";
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
