"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bold, Check, ChevronDown, Italic, Loader2, Plus, Save, Settings, Trash2, Underline, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { letterSystemFields } from "@/lib/letter-system-fields";

type Template = {
  id: string;
  name: string;
  type: string;
  body: string;
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
        (groups[cat.name] ??= []).push({ label: f.label, value: f.mapping });
      }
    }
  }
  return groups;
}

const SYSTEM_VARIABLE_OPTIONS = letterSystemFields.map((f) => ({ label: `${f.category}: ${f.label}`, value: f.value }));

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
  const [variableOpen, setVariableOpen] = useState(false);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const groups = groupedFields(categories);

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
      if (editorRef.current) editorRef.current.innerHTML = active.body;
    } else {
      const loadType = active?.type ?? "allotment_letter";
      setType(loadType);
      if (active) {
        setSelectedId(active.id);
        setName(active.name);
      }
      fetchDefaultBody(loadType).then((body) => {
        if (body && editorRef.current) editorRef.current.innerHTML = body;
      });
    }
  }, [initialized, initialTemplates, projectId]);

  const selectTemplate = useCallback((template: Template) => {
    setSelectedId(template.id);
    setName(template.name);
    setType(template.type);
    setMessage(null);
    if (isRealBody(template.body)) {
      if (editorRef.current) editorRef.current.innerHTML = template.body;
    } else {
      fetchDefaultBody(template.type).then((body) => {
        if (body && editorRef.current) editorRef.current.innerHTML = body;
      });
    }
  }, [projectId]);

  function newTemplate() {
    setSelectedId(null);
    setName("Allotment Letter");
    setType("allotment_letter");
    setMessage(null);
    fetchDefaultBody("allotment_letter").then((body) => {
      if (body && editorRef.current) editorRef.current.innerHTML = body;
    });
  }

  async function loadDefault() {
    setLoading("load");
    const body = await fetchDefaultBody(type);
    if (body && editorRef.current) editorRef.current.innerHTML = body;
    setLoading("");
  }

  async function save() {
    const body = editorRef.current?.innerHTML ?? "";
    if (!body.trim()) {
      setMessage({ kind: "error", text: "Template body is empty." });
      return;
    }
    setLoading("save");
    setMessage(null);
    const res = await fetch(`/api/v1/projects/${projectId}/letter-templates`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), type, body }),
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

  function insertVariable(value: string) {
    editorRef.current?.focus();
    globalThis.document.execCommand("insertText", false, `{{${value}}}`);
    setVariableOpen(false);
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
    function handleClick(e: MouseEvent) {
      const target = e.target as Element;
      if (variableOpen && !target?.closest?.("[data-variable-picker]")) {
        setVariableOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [variableOpen]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Template list sidebar */}
      <div className="w-full shrink-0 lg:w-72">
        <button
          onClick={newTemplate}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
        >
          <Plus className="h-4 w-4" /> New template
        </button>
        <div className="space-y-2">
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
                <span className="font-medium text-slate-800 truncate">{t.name}</span>
                <div className="flex items-center gap-1.5">
                  {t.active && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                      <Check className="h-3 w-3" /> Active
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {LETTER_TYPES.find((lt) => lt.value === t.type)?.label ?? t.type}
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-4">No templates yet. Create one or load a default.</p>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 min-w-0">
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
          <div className="mx-1 h-5 w-px bg-slate-300" />
          <div className="relative" data-variable-picker>
            <button
              onClick={() => { setVariableOpen((v) => !v); setAddFieldOpen(false); }}
              className="flex items-center gap-1 rounded px-2 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Insert variable <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {variableOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 max-h-80 w-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {Object.entries(groups).map(([category, fields]) => (
                  <div key={category}>
                    <div className="sticky top-0 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {category}
                    </div>
                    {fields.map((field) => (
                      <button
                        key={field.value}
                        onClick={() => insertVariable(field.value)}
                        className="w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-blue-50"
                      >
                        {field.label}
                        <span className="ml-1 text-xs text-slate-400">{`{{${field.value}}}`}</span>
                      </button>
                    ))}
                  </div>
                ))}
                <div className="border-t border-slate-100 p-2">
                  <button
                    onClick={() => { setAddFieldOpen(true); setVariableOpen(false); }}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add custom variable
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add custom variable panel */}
        {addFieldOpen && (
          <AddCustomFieldPanel
            categories={categories}
            onCreated={(mapping) => {
              refreshCategories();
              setAddFieldOpen(false);
              if (mapping) insertVariable(mapping);
            }}
            onClose={() => setAddFieldOpen(false)}
          />
        )}

        {/* Editor */}
        <section className="rounded-2xl border border-slate-200 bg-slate-200/70 p-3 shadow-inner md:p-6">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            suppressHydrationWarning
            className="letter-paper-editor"
            style={{ minHeight: "600px" }}
          />
        </section>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={save}
            disabled={loading === "save"}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save template
          </button>
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
          {message && (
            <span className={`text-sm ${message.kind === "success" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AddCustomFieldPanel({
  categories,
  onCreated,
  onClose,
}: {
  categories: FieldCategory[];
  onCreated: (mapping: string | null) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [useNewCategory, setUseNewCategory] = useState(false);
  const [mapping, setMapping] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!label.trim()) { setError("Label is required."); return; }
    if (!useNewCategory && !categoryId) { setError("Select a category."); return; }
    if (useNewCategory && !newCategoryName.trim()) { setError("Category name is required."); return; }
    setSaving(true);
    setError("");
    try {
      let targetCategoryId = categoryId;
      if (useNewCategory) {
        const catRes = await fetch("/api/v1/settings/letter-fields?kind=category", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: newCategoryName.trim() }),
        });
        const catJson = await catRes.json();
        if (!catRes.ok) { setError(catJson.error ?? "Failed to create category."); setSaving(false); return; }
        targetCategoryId = catJson.data?.id ?? catJson.id;
      }
      const fieldMapping = mapping || `manual.${label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
      const fieldRes = await fetch("/api/v1/settings/letter-fields", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryId: targetCategoryId, label: label.trim(), mapping: fieldMapping }),
      });
      const fieldJson = await fieldRes.json();
      if (!fieldRes.ok) { setError(fieldJson.error ?? "Failed to create field."); setSaving(false); return; }
      onCreated(fieldMapping);
    } catch {
      setError("Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Add custom variable</h3>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Variable label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Witness Name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
          {useNewCategory ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
              />
              <button onClick={() => setUseNewCategory(false)} className="text-xs text-blue-600 hover:underline whitespace-nowrap">Existing</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <button onClick={() => setUseNewCategory(true)} className="text-xs text-blue-600 hover:underline whitespace-nowrap">+ New</button>
            </div>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Map to system variable <span className="font-normal text-slate-400">(optional — leave empty for manual value)</span>
          </label>
          <select
            value={mapping}
            onChange={(e) => setMapping(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
          >
            <option value="">Manual — set value during generation</option>
            {SYSTEM_VARIABLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label} ({`{{${opt.value}}}`})</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleCreate}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Create & insert
        </button>
        <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </div>
  );
}
