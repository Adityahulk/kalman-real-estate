"use client";

import { ChangeEvent, CSSProperties, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, CheckCircle2, ChevronLeft, ChevronRight,
  Highlighter, Italic, Loader2, Redo2, Save, Trash2, Underline, Undo2, UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  PdfLayoutBlock, PdfLayoutDocument, PdfLayoutField, PdfLayoutPage, PdfTextStyle,
  pdfLayoutDocumentSchema,
} from "@/lib/pdf-layout";
import { createClientId } from "@/lib/id";
import { loadBrowserPdfJs } from "@/lib/pdfjs-browser";
import type { PDFPageProxy } from "pdfjs-dist";

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
type SavedSelection = { blockId: string; start: number; end: number; text: string };

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
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selection, setSelection] = useState<SavedSelection | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<"upload" | "save" | "activate" | "">("");
  const undoRef = useRef<PdfLayoutDocument[]>([]);
  const redoRef = useRef<PdfLayoutDocument[]>([]);

  useEffect(() => () => {
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  const selectedBlock = useMemo(() => layout?.pages.flatMap((page) => page.blocks).find((block) => block.id === selectedBlockId) ?? null, [layout, selectedBlockId]);

  async function readPdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLoading("upload");
    setMessage("Reading PDF text and preparing editable pages...");
    try {
      if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") throw new Error("Upload a PDF file.");
      const uploadedId = await uploadTemplateSource(file);
      const analyzed = await analyzePdf(file, uploadedId, (status) => setMessage(status));
      resetEditor({
        templateId: null,
        sourceFileId: uploadedId,
        sourceUrl: URL.createObjectURL(file),
        name: file.name.replace(/\.pdf$/i, ""),
        type,
        layout: analyzed,
      });
      setMessage(analyzed.warnings.length ? analyzed.warnings.join(" ") : "PDF ready. Edit text directly or select text to make a dynamic field.");
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
        templateId: template.id,
        sourceFileId: template.sourceFileId,
        sourceUrl: URL.createObjectURL(blob),
        name: template.name,
        type: template.type,
        layout: pdfLayoutDocumentSchema.parse(template.layoutData),
      });
      setMessage(template.active ? "Active template opened." : "Template opened. Activate it when ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Template could not be opened.");
    } finally {
      setLoading("");
    }
  }

  function resetEditor(input: {
    templateId: string | null;
    sourceFileId: string;
    sourceUrl: string;
    name: string;
    type: string;
    layout: PdfLayoutDocument;
  }) {
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    setTemplateId(input.templateId);
    setSourceFileId(input.sourceFileId);
    setSourceUrl(input.sourceUrl);
    setName(input.name);
    setType(input.type);
    setLayout(input.layout);
    setSelectedBlockId(null);
    setSelection(null);
    undoRef.current = [];
    redoRef.current = [];
  }

  function commit(next: PdfLayoutDocument) {
    if (layout) undoRef.current.push(layout);
    redoRef.current = [];
    setLayout(next);
  }

  function updateBlock(blockId: string, update: (block: PdfLayoutBlock) => PdfLayoutBlock, track = true) {
    if (!layout) return;
    const next = {
      ...layout,
      pages: layout.pages.map((page) => ({
        ...page,
        blocks: page.blocks.map((block) => block.id === blockId ? update(block) : block),
      })),
    };
    if (track) commit(next);
    else setLayout(next);
  }

  function undo() {
    const previous = undoRef.current.pop();
    if (!previous || !layout) return;
    redoRef.current.push(layout);
    setLayout(previous);
  }

  function redo() {
    const next = redoRef.current.pop();
    if (!next || !layout) return;
    undoRef.current.push(layout);
    setLayout(next);
  }

  function rememberSelection(event: MouseEvent<HTMLElement>, block: PdfLayoutBlock) {
    setSelectedBlockId(block.id);
    const browserSelection = window.getSelection();
    if (!browserSelection?.rangeCount || browserSelection.isCollapsed) return setSelection(null);
    const element = event.currentTarget;
    if (!element.contains(browserSelection.anchorNode) || !element.contains(browserSelection.focusNode)) return setSelection(null);
    const range = browserSelection.getRangeAt(0);
    const start = textOffset(element, range.startContainer, range.startOffset);
    const end = textOffset(element, range.endContainer, range.endOffset);
    const from = Math.min(start, end);
    const to = Math.max(start, end);
    const text = element.innerText.slice(from, to);
    setSelection(text.trim() ? { blockId: block.id, start: from, end: to, text } : null);
  }

  function makeField() {
    if (!layout || !selection) return setMessage("Select text inside one text block first.");
    if (layout.fields.some((field) => field.blockId === selection.blockId && rangesOverlap(field.start, field.end, selection.start, selection.end))) {
      return setMessage("That text already overlaps another dynamic field.");
    }
    const field: PdfLayoutField = {
      id: createClientId(),
      key: uniqueFieldKey(selection.text, layout.fields),
      label: selection.text.trim().slice(0, 100),
      blockId: selection.blockId,
      start: selection.start,
      end: selection.end,
      sourceText: selection.text,
      mapping: null,
    };
    commit({ ...layout, fields: [...layout.fields, field] });
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    setMessage("Dynamic field created. Choose its source in the Fields panel.");
  }

  function updateField(id: string, update: (field: PdfLayoutField) => PdfLayoutField) {
    if (!layout) return;
    commit({ ...layout, fields: layout.fields.map((field) => field.id === id ? update(field) : field) });
  }

  function removeField(id: string) {
    if (!layout) return;
    commit({ ...layout, fields: layout.fields.filter((field) => field.id !== id) });
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
    if (!templateId) {
      setMessage("Save the template before activating it.");
      return;
    }
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
      if (id === templateId) {
        setTemplateId(null);
        setLayout(null);
        setSourceFileId(null);
        setSourceUrl(null);
      }
      router.refresh();
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
      <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="sticky top-16 z-20 flex flex-wrap items-end gap-2 border-b border-slate-200 bg-white p-3">
          <label className="min-w-52 flex-1">
            <span className="label">Template name</span>
            <input className="input h-10" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="w-48">
            <span className="label">Letter type</span>
            <select className="input h-10" value={type} disabled={Boolean(templateId)} onChange={(event) => setType(event.target.value)}>
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
          <button className="btn-outline h-10" type="button" onClick={makeField} disabled={!selection}><Highlighter size={16} />Make dynamic field</button>
          <button className="btn-primary h-10" type="button" onClick={save} disabled={!layout || Boolean(loading)}>
            {loading === "save" ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}Save
          </button>
          <button className="btn-gold h-10" type="button" onClick={activate} disabled={!templateId || Boolean(loading)}>
            {loading === "activate" ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}Activate
          </button>
        </div>

        {selectedBlock ? (
          <PdfLayoutFormattingToolbar
            block={selectedBlock}
            onChange={(style) => updateBlock(selectedBlock.id, (block) => ({ ...block, style, changed: true }))}
          />
        ) : null}
        {message ? <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">{message}</div> : null}

        <div className="max-h-[calc(100dvh-14rem)] overflow-auto bg-slate-200 p-3 sm:p-6">
          {layout && sourceUrl ? (
            <PdfLayoutCanvas
              sourceUrl={sourceUrl}
              layout={layout}
              selectedBlockId={selectedBlockId}
              onBlockSelection={rememberSelection}
              onBlockChange={(blockId, text, overflow, fittedFontSize) => updateBlock(blockId, (block) => ({
                ...block,
                text,
                style: fittedFontSize && fittedFontSize !== block.style.fontSize
                  ? { ...block.style, fontSize: fittedFontSize, lineHeight: fittedFontSize * (block.style.lineHeight / block.style.fontSize) }
                  : block.style,
                changed: text !== block.originalText,
                overflow,
              }), false)}
              onConfirmOcr={(blockId) => updateBlock(blockId, (block) => ({ ...block, confirmed: true }))}
            />
          ) : (
            <div className="grid min-h-[620px] place-items-center rounded-lg border border-dashed border-slate-300 bg-white/70 p-8 text-center">
              <div>
                <UploadCloud className="mx-auto text-slate-400" size={42} />
                <h2 className="mt-3 font-semibold text-navy-900">Upload the builder&apos;s PDF letter</h2>
                <p className="mt-2 max-w-md text-sm text-slate-500">The PDF will open as editable fixed pages. Existing graphics and letterhead stay untouched.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-4 xl:max-h-[calc(100dvh-7rem)] xl:overflow-auto">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-navy-900">Dynamic fields</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Select real text in the letter, then make it dynamic. The letter keeps showing the actual value and formatting.</p>
          <div className="mt-4 space-y-3">
            {layout?.fields.map((field) => (
              <FieldEditor
                key={field.id}
                field={field}
                categories={categories}
                onFocus={() => setSelectedBlockId(field.blockId)}
                onChange={(next) => updateField(field.id, () => next)}
                onDelete={() => removeField(field.id)}
              />
            ))}
            {!layout?.fields.length ? <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">No dynamic fields yet.</div> : null}
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

export function PdfLayoutCanvas({ sourceUrl, layout, selectedBlockId, onBlockSelection, onBlockChange, onConfirmOcr }: {
  sourceUrl: string;
  layout: PdfLayoutDocument;
  selectedBlockId: string | null;
  onBlockSelection: (event: MouseEvent<HTMLElement>, block: PdfLayoutBlock) => void;
  onBlockChange: (blockId: string, text: string, overflow: boolean, fittedFontSize?: number) => void;
  onConfirmOcr: (blockId: string) => void;
}) {
  const canvasRefs = useRef(new Map<number, HTMLCanvasElement>());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const pdfjs = await loadBrowserPdfJs();
      const bytes = await fetch(sourceUrl).then((response) => response.arrayBuffer());
      const pdf = await pdfjs.getDocument({ data: bytes }).promise;
      for (const pageData of layout.pages) {
        const canvas = canvasRefs.current.get(pageData.pageNumber);
        if (!canvas || cancelled) continue;
        const page = await pdf.getPage(pageData.pageNumber);
        const scale = Math.min(1.45, 860 / pageData.width);
        const viewport = page.getViewport({ scale });
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.ceil(viewport.width * dpr);
        canvas.height = Math.ceil(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const context = canvas.getContext("2d");
        if (!context) continue;
        await page.render({ canvasContext: context, viewport, transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0] }).promise;
      }
    })();
    return () => { cancelled = true; };
  }, [sourceUrl, layout.pageCount]);

  return <div className="space-y-6">
    {layout.pages.map((page) => {
      const displayWidth = Math.min(860, page.width * 1.45);
      const displayHeight = displayWidth * page.height / page.width;
      return (
        <div className="relative mx-auto bg-white shadow-xl" key={page.pageNumber} style={{ width: displayWidth, height: displayHeight }}>
          <canvas className="absolute inset-0 size-full" ref={(canvas) => {
            if (canvas) canvasRefs.current.set(page.pageNumber, canvas);
            else canvasRefs.current.delete(page.pageNumber);
          }} />
          {page.blocks.map((block) => (
            <EditablePdfBlock
              key={block.id}
              block={block}
              selected={selectedBlockId === block.id}
              dynamic={layout.fields.some((field) => field.blockId === block.id)}
              onSelection={onBlockSelection}
              onChange={onBlockChange}
              onConfirmOcr={onConfirmOcr}
            />
          ))}
          <span className="absolute bottom-2 right-3 rounded bg-slate-900/70 px-2 py-1 text-xs text-white">Page {page.pageNumber}</span>
        </div>
      );
    })}
  </div>;
}

function EditablePdfBlock({ block, selected, dynamic, onSelection, onChange, onConfirmOcr }: {
  block: PdfLayoutBlock;
  selected: boolean;
  dynamic: boolean;
  onSelection: (event: MouseEvent<HTMLElement>, block: PdfLayoutBlock) => void;
  onChange: (blockId: string, text: string, overflow: boolean, fittedFontSize?: number) => void;
  onConfirmOcr: (blockId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== block.text) ref.current.innerText = block.text;
  }, [block.text]);
  const style: CSSProperties = {
    left: `${block.rect.x * 100}%`,
    top: `${block.rect.y * 100}%`,
    width: `${block.rect.width * 100}%`,
    minHeight: `${block.rect.height * 100}%`,
    maxHeight: `${Math.max(block.rect.height, block.rect.height * 1.35) * 100}%`,
    fontFamily: block.style.fontFamily,
    fontSize: `${block.style.fontSize * Math.min(1.45, 860 / 595)}px`,
    fontWeight: block.style.fontWeight,
    fontStyle: block.style.italic ? "italic" : "normal",
    textDecoration: block.style.underline ? "underline" : "none",
    color: block.style.color,
    textAlign: block.style.align,
    lineHeight: block.style.lineHeight / block.style.fontSize,
    letterSpacing: block.style.letterSpacing,
    transform: block.style.rotation ? `rotate(${block.style.rotation}deg)` : undefined,
    transformOrigin: "left top",
  };
  return (
    <div
      ref={ref}
      data-pdf-block={block.id}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      className={`absolute z-10 overflow-hidden whitespace-pre-wrap px-[1px] outline-none transition ${
        selected ? "ring-2 ring-blue-500" : dynamic ? "ring-1 ring-amber-400" : "hover:ring-1 hover:ring-blue-300"
      } ${block.source === "OCR" && !block.confirmed ? "bg-amber-100/95" : "bg-white/95"} ${block.overflow ? "ring-2 ring-rose-500" : ""}`}
      style={style}
      onMouseUp={(event) => onSelection(event, block)}
      onInput={(event) => {
        const element = event.currentTarget;
        const scale = Math.min(1.45, 860 / 595);
        let displaySize = parseFloat(element.style.fontSize) || block.style.fontSize * scale;
        const minimum = block.style.fontSize * 0.62 * scale;
        while ((element.scrollHeight > element.clientHeight + 2 || element.scrollWidth > element.clientWidth + 2) && displaySize > minimum) {
          displaySize = Math.max(minimum, displaySize - 0.5);
          element.style.fontSize = `${displaySize}px`;
        }
        const overflow = element.scrollHeight > element.clientHeight + 2 || element.scrollWidth > element.clientWidth + 2;
        onChange(block.id, element.innerText, overflow, displaySize / scale);
      }}
      onBlur={(event) => {
        const element = event.currentTarget;
        onChange(block.id, element.innerText, element.scrollHeight > element.clientHeight + 2 || element.scrollWidth > element.clientWidth + 2);
      }}
      title={block.source === "OCR" && !block.confirmed ? "OCR text requires confirmation" : undefined}
      onDoubleClick={() => block.source === "OCR" && !block.confirmed ? onConfirmOcr(block.id) : undefined}
    />
  );
}

export function PdfLayoutFormattingToolbar({ block, onChange }: { block: PdfLayoutBlock; onChange: (style: PdfTextStyle) => void }) {
  const style = block.style;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
      <button type="button" className={`btn-ghost h-9 px-2 ${style.fontWeight >= 600 ? "bg-slate-200" : ""}`} onClick={() => onChange({ ...style, fontWeight: style.fontWeight >= 600 ? 400 : 700 })} title="Bold"><Bold size={15} /></button>
      <button type="button" className={`btn-ghost h-9 px-2 ${style.italic ? "bg-slate-200" : ""}`} onClick={() => onChange({ ...style, italic: !style.italic })} title="Italic"><Italic size={15} /></button>
      <button type="button" className={`btn-ghost h-9 px-2 ${style.underline ? "bg-slate-200" : ""}`} onClick={() => onChange({ ...style, underline: !style.underline })} title="Underline"><Underline size={15} /></button>
      <input className="input h-9 w-20" type="number" min={5} max={72} step={0.5} value={style.fontSize} onChange={(event) => onChange({ ...style, fontSize: Number(event.target.value) || style.fontSize, lineHeight: (Number(event.target.value) || style.fontSize) * 1.2 })} aria-label="Font size" />
      <input className="h-9 w-10 cursor-pointer rounded border border-slate-200 bg-white p-1" type="color" value={style.color} onChange={(event) => onChange({ ...style, color: event.target.value })} aria-label="Text color" />
      <button type="button" className={`btn-ghost h-9 px-2 ${style.align === "left" ? "bg-slate-200" : ""}`} onClick={() => onChange({ ...style, align: "left" })} title="Align left"><AlignLeft size={15} /></button>
      <button type="button" className={`btn-ghost h-9 px-2 ${style.align === "center" ? "bg-slate-200" : ""}`} onClick={() => onChange({ ...style, align: "center" })} title="Align center"><AlignCenter size={15} /></button>
      <button type="button" className={`btn-ghost h-9 px-2 ${style.align === "right" ? "bg-slate-200" : ""}`} onClick={() => onChange({ ...style, align: "right" })} title="Align right"><AlignRight size={15} /></button>
      <span className="ml-auto text-xs text-slate-500">Editing page {block.pageNumber}</span>
    </div>
  );
}

function FieldEditor({ field, categories, onFocus, onChange, onDelete }: {
  field: PdfLayoutField;
  categories: FieldCategory[];
  onFocus: () => void;
  onChange: (field: PdfLayoutField) => void;
  onDelete: () => void;
}) {
  const [category, setCategory] = useState(field.mapping ? categoryFor(field.mapping, categories) : "Manual");
  const options = category === "Manual" ? [] : categories.find((item) => item.id === category)?.fields ?? [];
  return (
    <div className="rounded-lg border border-slate-200 p-3" onClick={onFocus}>
      <div className="flex gap-2">
        <input className="input h-9 min-w-0" value={field.label} onChange={(event) => onChange({ ...field, label: event.target.value })} />
        <button className="btn-ghost h-9 px-2 text-rose-700" type="button" onClick={onDelete}><Trash2 size={14} /></button>
      </div>
      <div className="mt-2 grid gap-2">
        <select className="input h-9" value={category} onChange={(event) => {
          setCategory(event.target.value);
          onChange({ ...field, mapping: null });
        }}>
          <option>Manual</option>
          {categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
        <select className="input h-9" value={field.mapping ?? ""} disabled={category === "Manual"} onChange={(event) => onChange({ ...field, mapping: event.target.value || null })}>
          <option value="">Choose parameter</option>
          {options.map((option) => <option value={option.mapping ?? ""} key={option.id}>{option.label}</option>)}
        </select>
      </div>
      <div className="mt-2 truncate text-xs text-slate-500">{field.mapping ? `Auto-fill: ${field.mapping}` : `Manual value: ${field.sourceText}`}</div>
    </div>
  );
}

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
    const blocks = textBlocksFromPdf(content.items as PdfTextItem[], pageNumber, viewport.width, viewport.height);
    if (!blocks.length) {
      progress(`Running OCR on page ${pageNumber} of ${pdf.numPages}...`);
      const ocrBlocks = await ocrPage(page, pageNumber, viewport.width, viewport.height);
      blocks.push(...ocrBlocks);
      warnings.push(`Page ${pageNumber} used OCR. Double-click each amber text block after checking it.`);
    }
    pages.push({ pageNumber, width: viewport.width, height: viewport.height, rotation: viewport.rotation, blocks });
  }
  return { version: 1, sourceFileId, pageCount: pdf.numPages, pages, fields: [], warnings };
}

type PdfTextItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  fontName?: string;
  hasEOL?: boolean;
};

function textBlocksFromPdf(items: PdfTextItem[], pageNumber: number, pageWidth: number, pageHeight: number) {
  const raw = items.flatMap((item) => {
    const text = item.str ?? "";
    const transform = item.transform ?? [];
    if (!text.trim() || transform.length < 6) return [];
    const fontSize = Math.max(5, Math.hypot(transform[2] ?? 0, transform[3] ?? 0) || item.height || 10);
    const x = transform[4] ?? 0;
    const baseline = transform[5] ?? 0;
    const width = Math.max(item.width ?? fontSize, fontSize * 0.35);
    const top = pageHeight - baseline - fontSize;
    return [{
      text,
      x,
      top,
      width,
      height: Math.max(fontSize * 1.25, item.height ?? fontSize),
      fontSize,
      fontName: item.fontName ?? "Helvetica",
      hasEOL: Boolean(item.hasEOL),
    }];
  });
  const lines: typeof raw[] = [];
  for (const item of raw.sort((a, b) => a.top - b.top || a.x - b.x)) {
    const line = lines.find((candidate) => Math.abs(candidate[0].top - item.top) <= Math.max(2, item.fontSize * 0.35));
    if (line) line.push(item);
    else lines.push([item]);
  }
  return lines.flatMap((line): PdfLayoutBlock[] => {
    const ordered = line.sort((a, b) => a.x - b.x);
    const left = Math.min(...ordered.map((item) => item.x));
    const top = Math.min(...ordered.map((item) => item.top));
    const right = Math.max(...ordered.map((item) => item.x + item.width));
    const bottom = Math.max(...ordered.map((item) => item.top + item.height));
    const text = ordered.reduce((value, item, index) => {
      if (!index) return item.text;
      const previous = ordered[index - 1];
      const gap = item.x - (previous.x + previous.width);
      return `${value}${gap > Math.max(1.5, item.fontSize * 0.16) ? " " : ""}${item.text}`;
    }, "");
    const primary = ordered[0];
    const fontName = primary.fontName;
    return [{
      id: createClientId(),
      pageNumber,
      text,
      originalText: text,
      rect: {
        x: clamp(left / pageWidth),
        y: clamp(top / pageHeight),
        width: clamp((right - left) / pageWidth, 0.002, 1 - clamp(left / pageWidth)),
        height: clamp((bottom - top) / pageHeight, 0.008, 1 - clamp(top / pageHeight)),
      },
      style: {
        fontName,
        fontFamily: fontFamily(fontName),
        fontSize: primary.fontSize,
        fontWeight: /bold|black|semi/i.test(fontName) ? 700 : 400,
        italic: /italic|oblique/i.test(fontName),
        underline: false,
        color: "#111827",
        align: "left",
        letterSpacing: 0,
        wordSpacing: 0,
        lineHeight: primary.fontSize * 1.2,
        rotation: 0,
      },
      source: "PDF_TEXT",
      confidence: 1,
      confirmed: true,
      changed: false,
      overflow: false,
    }];
  });
}

async function ocrPage(page: PDFPageProxy, pageNumber: number, pageWidth: number, pageHeight: number) {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d");
  if (!context) return [];
  await page.render({ canvasContext: context, viewport }).promise;
  const { recognize } = await import("tesseract.js");
  const result = await recognize(canvas, "eng");
  const data = result.data as unknown as { words?: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }> };
  return (data.words ?? []).filter((word) => word.text.trim()).map((word): PdfLayoutBlock => {
    const width = word.bbox.x1 - word.bbox.x0;
    const height = word.bbox.y1 - word.bbox.y0;
    const fontSize = Math.max(6, height / 2);
    return {
      id: createClientId(),
      pageNumber,
      text: word.text,
      originalText: word.text,
      rect: {
        x: clamp(word.bbox.x0 / viewport.width),
        y: clamp(word.bbox.y0 / viewport.height),
        width: clamp(width / viewport.width, 0.002, 1),
        height: clamp(height / viewport.height, 0.008, 1),
      },
      style: {
        fontName: "OCR Helvetica",
        fontFamily: "Arial",
        fontSize,
        fontWeight: 400,
        italic: false,
        underline: false,
        color: "#111827",
        align: "left",
        letterSpacing: 0,
        wordSpacing: 0,
        lineHeight: fontSize * 1.2,
        rotation: 0,
      },
      source: "OCR",
      confidence: clamp(word.confidence / 100),
      confirmed: false,
      changed: false,
      overflow: false,
    };
  });
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
  let uploadResponse = await fetch(primary.url, { method: "PUT", headers: { "content-type": file.type || "application/octet-stream" }, body: file });
  if (!uploadResponse.ok && fallback) {
    target = fallback;
    uploadResponse = await fetch(fallback.url, { method: "PUT", headers: { "content-type": file.type || "application/octet-stream" }, body: file });
  }
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

function textOffset(root: HTMLElement, node: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(root);
  try {
    range.setEnd(node, offset);
  } catch {
    return 0;
  }
  return range.toString().length;
}

function uniqueFieldKey(label: string, fields: PdfLayoutField[]) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "field";
  let key = base;
  let suffix = 2;
  while (fields.some((field) => field.key === key)) key = `${base}_${suffix++}`;
  return key;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

function categoryFor(mapping: string, categories: FieldCategory[]) {
  return categories.find((category) => category.fields.some((field) => field.mapping === mapping))?.id ?? "Manual";
}

function fontFamily(fontName: string) {
  if (/times|serif|roman/i.test(fontName)) return "Times New Roman";
  if (/courier|mono/i.test(fontName)) return "Courier New";
  return "Arial";
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
