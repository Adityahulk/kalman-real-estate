"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bold, Check, ChevronDown, ChevronUp, Italic, Loader2, Plus, Save, Trash2, Underline, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/lib/api-client";
import { letterSystemFields } from "@/lib/letter-system-fields";

type Template = {
  id: string;
  name: string;
  type: string;
  body: string;
  variables?: unknown;
  active: boolean;
  createdAt: string;
};

type FieldCategory = {
  id: string;
  name: string;
  fields: Array<{ id: string; label: string; mapping: string | null }>;
};

const LETTER_TYPES = [
  { value: "allotment_letter", label: "Allotment Letter" },
  { value: "transfer_letter", label: "Transfer Letter" },
  { value: "registry_status_letter", label: "Registry Status Letter" },
] as const;

const CATEGORY_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  Firm:     { bg: "bg-blue-50",    text: "text-blue-700",    ring: "ring-blue-200" },
  Project:  { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
  Plot:     { bg: "bg-orange-50",  text: "text-orange-700",  ring: "ring-orange-200" },
  Payment:  { bg: "bg-purple-50",  text: "text-purple-700",  ring: "ring-purple-200" },
  Files:    { bg: "bg-cyan-50",    text: "text-cyan-700",    ring: "ring-cyan-200" },
  Buyer:    { bg: "bg-rose-50",    text: "text-rose-700",    ring: "ring-rose-200" },
  Document: { bg: "bg-slate-100",  text: "text-slate-700",   ring: "ring-slate-300" },
  Extra:    { bg: "bg-teal-50",    text: "text-teal-700",    ring: "ring-teal-200" },
};
const DEFAULT_COLOR = { bg: "bg-slate-50", text: "text-slate-700", ring: "ring-slate-200" };

const AUTOFILL_OPTIONS = [
  { group: "Buyer / Owner", items: [
    { label: "Buyer name", value: "owner.name" },
    { label: "Buyer phone", value: "owner.phone" },
    { label: "Buyer address", value: "owner.address" },
    { label: "Father's name", value: "owner.fatherName" },
    { label: "Aadhaar number", value: "owner.aadhaarNo" },
    { label: "PAN number", value: "owner.panNo" },
  ]},
  { group: "Plot", items: [
    { label: "Plot number", value: "plot.code" },
    { label: "Plot area", value: "plot.areaSqyd" },
    { label: "Plot dimensions", value: "plot.dimensions" },
    { label: "Plot price", value: "plot.priceInrFormatted" },
    { label: "Price in words", value: "plot.priceInrWords" },
  ]},
  { group: "Project", items: [
    { label: "Project name", value: "project.name" },
    { label: "Project city", value: "project.city" },
    { label: "Project address", value: "project.fullAddress" },
  ]},
  { group: "Firm", items: [
    { label: "Firm name", value: "firm.name" },
    { label: "Firm address", value: "firm.address" },
    { label: "Firm PAN", value: "tenant.pan" },
  ]},
  { group: "Files", items: [
    { label: "Allottee documents", value: "files.allotteeDocuments" },
    { label: "Payment files", value: "files.paymentDocuments" },
    { label: "Additional field files", value: "files.additionalFields" },
    { label: "All supporting documents", value: "files.allSupportingDocuments" },
  ]},
  { group: "Dates & Others", items: [
    { label: "Allotment date", value: "ownership.effectiveDate" },
    { label: "Today's date", value: "today" },
    { label: "Document number", value: "document.number" },
    { label: "RERA number", value: "rera.number" },
  ]},
];

function isRealBody(body: string | null | undefined): body is string {
  return Boolean(body && body.length > 100 && !body.includes("data-pdf-layout-template") && !body.includes("data-exact-pdf-draft"));
}

function groupedFields(categories: FieldCategory[]) {
  const groups: Record<string, Array<{ label: string; value: string }>> = {};
  for (const field of letterSystemFields) {
    (groups[field.category] ??= []).push({ label: field.label, value: field.value });
  }
  for (const cat of categories) {
    for (const f of cat.fields) {
      if (f.mapping) {
        const existing = Object.values(groups).flat().some((g) => g.value === f.mapping);
        if (!existing) (groups[cat.name] ??= []).push({ label: f.label, value: f.mapping });
      }
    }
  }
  return groups;
}

function preferredFieldGroups(groups: Record<string, Array<{ label: string; value: string }>>) {
  const order = ["Firm", "Project", "Payment", "Files", "Plot", "Buyer", "Document", "Extra"];
  const entries = Object.entries(groups);
  return entries.sort(([a], [b]) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    return (aIndex === -1 ? order.length : aIndex) - (bIndex === -1 ? order.length : bIndex);
  });
}

function ensurePagedDocument(root: HTMLElement) {
  const directPages = root.querySelectorAll("section[data-ambey-page], section[data-letter-page]");
  if (!directPages.length) {
    const existingHtml = root.innerHTML.trim() || "<p><br></p>";
    root.innerHTML = `<div data-letter-template="custom-template"><section data-letter-page="1">${existingHtml}</section></div>`;
  }
  renumberPages(root);
}

function renumberPages(root: HTMLElement) {
  const pages = [...root.querySelectorAll<HTMLElement>("section[data-ambey-page], section[data-letter-page]")];
  pages.forEach((page, index) => {
    if (page.hasAttribute("data-ambey-page")) page.setAttribute("data-ambey-page", String(index + 1));
    else page.setAttribute("data-letter-page", String(index + 1));
  });
}

function cleanEditorHtml(root: HTMLElement) {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-editor-page-controls]").forEach((node) => node.remove());
  return clone.innerHTML;
}

function templateFieldTypeMap(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, "TEXT" | "FILE">;
  const rawFields = (value as Record<string, unknown>).fields;
  const fields: unknown[] = Array.isArray(rawFields) ? rawFields : [];
  const map: Record<string, "TEXT" | "FILE"> = {};
  for (const item of fields) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const field = item as Record<string, unknown>;
    const key = typeof field.mapping === "string" && field.mapping
      ? field.mapping
      : typeof field.key === "string" && field.key
        ? `manual.${field.key}`
        : null;
    const inputType = field.inputType === "FILE" ? "FILE" : "TEXT";
    if (key) map[key] = inputType;
  }
  return map;
}

function templateVariablesFromBody(
  body: string,
  categories: FieldCategory[],
  fieldTypes: Record<string, "TEXT" | "FILE">,
) {
  const matches = [...body.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)];
  const seen = new Set<string>();
  const availableFields = [
    ...letterSystemFields.map((field) => ({ id: field.value, label: field.label, mapping: field.value })),
    ...categories.flatMap((category) => category.fields),
  ];
  const byMapping = new Map(availableFields.filter((field) => field.mapping).map((field) => [field.mapping as string, field]));

  return {
    fields: matches.flatMap((match) => {
      const placeholder = match[1];
      if (!placeholder || seen.has(placeholder)) return [];
      seen.add(placeholder);
      const manual = placeholder.startsWith("manual.");
      const key = manual ? placeholder.slice("manual.".length) : placeholder;
      const field = byMapping.get(placeholder);
      return [{
        id: field?.id ?? placeholder,
        label: field?.label ?? humanizeTemplateKey(key),
        sourceText: match[0],
        key,
        mapping: manual ? null : placeholder,
        inputType: fieldTypes[placeholder] ?? "TEXT",
      }];
    }),
  };
}

function humanizeTemplateKey(value: string) {
  return value
    .split(".")
    .pop()
    ?.replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase()) ?? value;
}

export function HtmlTemplateEditor({
  projectId,
  templates: initialTemplates,
  categories: initialCategories,
}: {
  projectId: string;
  templates: Template[];
  categories: FieldCategory[];
}) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const [templates, setTemplates] = useState(initialTemplates);
  const [categories, setCategories] = useState(initialCategories);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("Allotment Letter");
  const [type, setType] = useState("allotment_letter");
  const [loading, setLoading] = useState<"save" | "activate" | "delete" | "load" | "">("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [fieldTypeOverrides, setFieldTypeOverrides] = useState<Record<string, "TEXT" | "FILE">>({});
  const groups = groupedFields(categories);
  const orderedGroups = useMemo(() => preferredFieldGroups(groups), [groups]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Firm: true,
    Project: true,
    Payment: true,
    Files: true,
    Plot: true,
    Buyer: true,
    Document: true,
  });

  async function fetchDefaultBody(letterType: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/letter-templates/defaults?type=${letterType}`);
      const json = await res.json();
      return res.ok ? (json.data?.body ?? json.body ?? null) : null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    const active = initialTemplates.find((t) => t.active && t.type === "allotment_letter")
      ?? initialTemplates.find((t) => t.active)
      ?? initialTemplates[0];
    if (active && isRealBody(active.body)) {
      setSelectedId(active.id);
      setName(active.name);
      setType(active.type);
      setFieldTypeOverrides(templateFieldTypeMap(active.variables));
      if (editorRef.current) {
        editorRef.current.innerHTML = active.body;
        prepareEditorSurface();
      }
    } else {
      const loadType = active?.type ?? "allotment_letter";
      setType(loadType);
      if (active) {
        setSelectedId(active.id);
        setName(active.name);
      }
      fetchDefaultBody(loadType).then((body) => {
        if (body && editorRef.current) {
          editorRef.current.innerHTML = body;
          prepareEditorSurface();
        }
      });
    }
  }, [initialized, initialTemplates, projectId]);

  const selectTemplate = useCallback((template: Template) => {
    setSelectedId(template.id);
    setName(template.name);
    setType(template.type);
    setMessage(null);
    setFieldTypeOverrides(templateFieldTypeMap(template.variables));
    if (isRealBody(template.body)) {
      if (editorRef.current) {
        editorRef.current.innerHTML = template.body;
        prepareEditorSurface();
      }
    } else {
      fetchDefaultBody(template.type).then((body) => {
        if (body && editorRef.current) {
          editorRef.current.innerHTML = body;
          prepareEditorSurface();
        }
      });
    }
  }, []);

  function newTemplate() {
    setSelectedId(null);
    setName("Allotment Letter");
    setType("allotment_letter");
    setMessage(null);
    setFieldTypeOverrides({});
    fetchDefaultBody("allotment_letter").then((body) => {
      if (body && editorRef.current) {
        editorRef.current.innerHTML = body;
        prepareEditorSurface();
      }
    });
  }

  async function loadDefault() {
    setLoading("load");
    const body = await fetchDefaultBody(type);
    if (body && editorRef.current) {
      editorRef.current.innerHTML = body;
      prepareEditorSurface();
    }
    setLoading("");
  }

  async function save() {
    const body = editorRef.current ? cleanEditorHtml(editorRef.current) : "";
    if (!body.trim()) {
      setMessage({ kind: "error", text: "Template body is empty." });
      return;
    }
    setLoading("save");
    setMessage(null);
    const res = await fetch(`/api/v1/projects/${projectId}/letter-templates`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), type, body, variables: templateVariablesFromBody(body, categories, fieldTypeOverrides) }),
    });
    const json = await res.json();
    setLoading("");
    if (res.ok) {
      const saved = json.data ?? json;
      setMessage({ kind: "success", text: "Template saved and activated." });
      setSelectedId(saved.id);
      router.refresh();
      const listRes = await fetch(`/api/v1/projects/${projectId}/letter-templates`).then((r) => r.json()).catch(() => null);
      const list = listRes?.data ?? listRes;
      if (Array.isArray(list)) setTemplates(list);
    } else {
      setMessage({ kind: "error", text: json.error ?? json.data?.error ?? "Save failed." });
    }
  }

  async function activate(templateId: string) {
    setLoading("activate");
    setMessage(null);
    const res = await fetch(`/api/v1/projects/${projectId}/letter-templates/${templateId}/activate`, { method: "POST" });
    setLoading("");
    if (res.ok) {
      setMessage({ kind: "success", text: "Template activated." });
      router.refresh();
      setTemplates((prev) =>
        prev.map((t) => ({ ...t, active: t.type === type ? t.id === templateId : t.active })),
      );
    } else {
      const json = await res.json().catch(() => ({}));
      setMessage({ kind: "error", text: json.error ?? "Activation failed." });
    }
  }

  async function deleteTemplate(templateId: string) {
    if (!confirm("Delete this template?")) return;
    setLoading("delete");
    setMessage(null);
    const res = await fetch(`/api/v1/projects/${projectId}/letter-templates/${templateId}`, { method: "DELETE" });
    setLoading("");
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      if (selectedId === templateId) newTemplate();
      setMessage({ kind: "success", text: "Template deleted." });
      router.refresh();
    }
  }

  function format(command: "bold" | "italic" | "underline") {
    editorRef.current?.focus();
    globalThis.document.execCommand(command);
  }

  function insertField(value: string) {
    editorRef.current?.focus();
    globalThis.document.execCommand("insertText", false, `{{${value}}}`);
  }

  function prepareEditorSurface() {
    const root = editorRef.current;
    if (!root) return;
    ensurePagedDocument(root);
    injectPageControls(root);
  }

  function injectPageControls(root: HTMLElement) {
    root.querySelectorAll("[data-editor-page-controls]").forEach((node) => node.remove());
    const pages = [...root.querySelectorAll<HTMLElement>("section[data-ambey-page], section[data-letter-page]")];
    pages.forEach((page, index) => {
      const controls = globalThis.document.createElement("div");
      controls.setAttribute("data-editor-page-controls", "true");
      controls.setAttribute("contenteditable", "false");
      controls.className = "mb-3 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm";

      const title = globalThis.document.createElement("span");
      title.className = "font-medium text-slate-700";
      title.textContent = `Page ${index + 1}`;
      controls.appendChild(title);

      const actions = globalThis.document.createElement("div");
      actions.className = "flex items-center gap-2";

      const beforeButton = globalThis.document.createElement("button");
      beforeButton.type = "button";
      beforeButton.className = "rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50";
      beforeButton.textContent = "Add page before";
      beforeButton.addEventListener("click", () => insertPage(index, "before"));

      const afterButton = globalThis.document.createElement("button");
      afterButton.type = "button";
      afterButton.className = "rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50";
      afterButton.textContent = "Add page after";
      afterButton.addEventListener("click", () => insertPage(index, "after"));

      actions.appendChild(beforeButton);
      actions.appendChild(afterButton);
      controls.appendChild(actions);
      page.parentElement?.insertBefore(controls, page);
    });
  }

  function insertPage(pageIndex: number, position: "before" | "after") {
    const root = editorRef.current;
    if (!root) return;
    ensurePagedDocument(root);
    const pages = [...root.querySelectorAll<HTMLElement>("section[data-ambey-page], section[data-letter-page]")];
    const target = pages[pageIndex];
    if (!target || !target.parentElement) return;
    const page = globalThis.document.createElement("section");
    if (target.hasAttribute("data-ambey-page")) page.setAttribute("data-ambey-page", "0");
    else page.setAttribute("data-letter-page", "0");
    page.innerHTML = "<p><br></p>";
    if (position === "before") target.parentElement.insertBefore(page, target);
    else target.parentElement.insertBefore(page, target.nextSibling);
    renumberPages(root);
    injectPageControls(root);
    const paragraph = page.querySelector("p");
    if (paragraph) {
      const range = globalThis.document.createRange();
      range.selectNodeContents(paragraph);
      range.collapse(true);
      const selection = globalThis.window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  async function refreshCategories() {
    try {
      const res = await fetch("/api/v1/settings/letter-fields");
      const json = await res.json();
      const data = json.data ?? json;
      if (Array.isArray(data)) {
        setCategories(data.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          fields: (cat.fields ?? []).map((f: any) => ({ id: f.id, label: f.label, mapping: f.mapping })),
        })));
      }
    } catch {}
  }

  useEffect(() => {
    prepareEditorSurface();
  }, [templates]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        {/* Name + type row */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Template name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Letter type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
            >
              {LETTER_TYPES.map((lt) => (
                <option key={lt.value} value={lt.value}>{lt.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={save}
            disabled={loading === "save"}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save template
          </button>
          <button
            onClick={loadDefault}
            disabled={loading === "load"}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {loading === "load" ? <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> : null}
            Load default
          </button>
        </div>

        {/* Toolbar */}
        <div className="mb-2 flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
          <button onClick={() => format("bold")} className="rounded p-1.5 text-slate-600 hover:bg-slate-200" title="Bold">
            <Bold className="h-4 w-4" />
          </button>
          <button onClick={() => format("italic")} className="rounded p-1.5 text-slate-600 hover:bg-slate-200" title="Italic">
            <Italic className="h-4 w-4" />
          </button>
          <button onClick={() => format("underline")} className="rounded p-1.5 text-slate-600 hover:bg-slate-200" title="Underline">
            <Underline className="h-4 w-4" />
          </button>
        </div>

        {/* Editor */}
        <section className="rounded-2xl border border-slate-200 bg-slate-200/70 p-3 shadow-inner md:p-6">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            suppressHydrationWarning
            className="letter-paper-editor"
            style={{ minHeight: "600px" }}
            onInput={prepareEditorSurface}
          />
        </section>
        <p className="mt-2 text-xs text-slate-400">
          Text like <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">{`{{buyer name}}`}</code> will be replaced automatically with actual details when generating the letter.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {selectedId && !templates.find((t) => t.id === selectedId)?.active && (
            <button
              onClick={() => activate(selectedId)}
              disabled={loading === "activate"}
              className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50"
            >
              {loading === "activate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Activate
            </button>
          )}
          {message ? <span className={`text-sm ${message.kind === "success" ? "text-green-600" : "text-red-600"}`}>{message.text}</span> : null}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <button
            onClick={newTemplate}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
          >
            <Plus className="h-4 w-4" /> New template
          </button>
          <div className="mt-3 space-y-2">
            {templates.map((t) => (
              <div
                key={t.id}
                onClick={() => selectTemplate(t)}
                className={`cursor-pointer rounded-lg border p-3 text-sm transition ${
                  selectedId === t.id
                    ? "border-blue-400 bg-blue-50 ring-1 ring-blue-200"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium text-slate-800">{t.name}</span>
                  <div className="flex items-center gap-1.5">
                    {t.active ? <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700"><Check className="h-3 w-3" /> Active</span> : null}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-500">{LETTER_TYPES.find((lt) => lt.value === t.type)?.label ?? t.type}</div>
              </div>
            ))}
            {templates.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">No templates yet. Create one or load a default.</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">Create a new field</div>
          <AddCustomFieldInline
            categories={categories}
            onCreated={({ mapping, inputType }) => {
              setFieldTypeOverrides((current) => ({ ...current, [mapping]: inputType }));
              refreshCategories();
              if (mapping) insertField(mapping);
            }}
            onClose={() => undefined}
            hideClose
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">Insert fields</div>
          <div className="space-y-2">
            {orderedGroups.map(([category, fields]) => {
              const color = CATEGORY_COLORS[category] ?? DEFAULT_COLOR;
              const isOpen = openGroups[category] ?? false;
              return (
                <div key={category} className="rounded-lg border border-slate-200">
                  <button
                    onClick={() => setOpenGroups((prev) => ({ ...prev, [category]: !isOpen }))}
                    className="flex w-full items-center justify-between px-3 py-2 text-left"
                  >
                    <span className="text-sm font-medium text-slate-800">{category}</span>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </button>
                  {isOpen ? (
                    <div className="border-t border-slate-100 px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {fields.map((field) => (
                          <button
                            key={field.value}
                            onClick={() => insertField(field.value)}
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition hover:shadow-sm active:scale-95 ${color.bg} ${color.text} ${color.ring}`}
                            title={`Inserts {{${field.value}}}`}
                          >
                            {field.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

function AddCustomFieldInline({
  categories,
  onCreated,
  onClose,
  hideClose = false,
}: {
  categories: FieldCategory[];
  onCreated: (result: { mapping: string; inputType: "TEXT" | "FILE" }) => void;
  onClose: () => void;
  hideClose?: boolean;
}) {
  const [label, setLabel] = useState("");
  const [autofill, setAutofill] = useState("");
  const [inputType, setInputType] = useState<"TEXT" | "FILE">("TEXT");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const customCategory = categories.find((c) => c.name === "Extra") ?? categories[categories.length - 1];

  async function handleCreate() {
    if (!label.trim()) { setError("Please enter a name for this field."); return; }
    setSaving(true);
    setError("");
    try {
      const fieldMapping = autofill || `manual.${label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
      const category = customCategory ?? await requestJson<{ id: string; name: string }>("/api/v1/settings/letter-fields?kind=category", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Extra" }),
      });
      await requestJson("/api/v1/settings/letter-fields", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryId: category.id, label: label.trim(), mapping: fieldMapping }),
      });
      setLabel("");
      setAutofill("");
      setInputType("TEXT");
      setSaving(false);
      onCreated({ mapping: fieldMapping, inputType });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      {!hideClose ? (
        <div className="mb-3 flex justify-end">
          <button onClick={onClose} className="rounded p-0.5 text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-[92px_minmax(0,1fr)] sm:items-center">
          <label className="text-xs font-medium text-slate-600">Field name</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Witness Name, Stamp Number"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            autoFocus
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-[92px_minmax(0,1fr)] sm:items-center">
          <div className="text-xs font-medium leading-5 text-slate-600">
            <div>Auto-fill from</div>
            <div className="text-slate-400">(or leave for manual entry)</div>
          </div>
          <select
            value={autofill}
            onChange={(e) => setAutofill(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
          >
            <option value="">I&apos;ll fill this myself each time</option>
            {AUTOFILL_OPTIONS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.items.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid gap-2 sm:grid-cols-[92px_minmax(0,1fr)] sm:items-center">
          <label className="text-xs font-medium text-slate-600">Field type</label>
          <select
            value={inputType}
            onChange={(e) => setInputType(e.target.value === "FILE" ? "FILE" : "TEXT")}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
          >
            <option value="TEXT">Text</option>
            <option value="FILE">Upload file</option>
          </select>
        </div>

        <button
          onClick={handleCreate}
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
