"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { crmRequest } from "../crm-api";

type Item = { id: string; name: string; [key: string]: unknown };
type Data = { sources: Item[]; campaigns: Item[]; templates: Item[]; automations: Item[]; projects: Array<{ id: string; name: string }> };

export function CrmSettings({ data }: { data: Data }) {
  const router = useRouter(); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function create(event: FormEvent<HTMLFormElement>, resource: string) {
    event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget); const body: Record<string, unknown> = { resource };
    form.forEach((value, key) => { if (value !== "") body[key] = value; });
    if (body.spendInr) body.spendInr = Number(body.spendInr);
    try { await crmRequest("/api/v1/crm/settings", "POST", body); event.currentTarget.reset(); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save CRM settings."); } finally { setSaving(false); }
  }
  async function archive(resource: string, id: string) {
    if (!window.confirm("Archive this item? Existing lead history will be preserved.")) return; setError("");
    const response = await fetch(`/api/v1/crm/settings/${resource}/${id}`, { method: "DELETE" }); const payload = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
    if (!response.ok || !payload?.ok) setError(payload?.error || "Could not archive the item."); else router.refresh();
  }
  async function rename(resource: string, item: Item) {
    const name = window.prompt("Update name", item.name)?.trim(); if (!name || name === item.name) return;
    try { await crmRequest(`/api/v1/crm/settings/${resource}/${item.id}`, "PATCH", { name }); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update the item."); }
  }
  return <div className="grid gap-6 xl:grid-cols-2">{error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 xl:col-span-2">{error}</div> : null}
    <SettingSection title="Lead sources" description="Permanent origin of every lead. Sources can be retired, but historical attribution stays intact." items={data.sources} onArchive={(id) => archive("source", id)} onEdit={(item) => rename("source", item)}><form className="flex gap-2" onSubmit={(event) => create(event, "source")}><input className="input h-10 min-w-0 flex-1" name="name" placeholder="New source" required/><button className="btn-primary h-10 px-3" disabled={saving}><Plus size={16}/>Add</button></form></SettingSection>
    <SettingSection title="Campaigns" description="Track campaigns and spend so bookings can be compared against marketing cost." items={data.campaigns} onArchive={(id) => archive("campaign", id)} onEdit={(item) => rename("campaign", item)}><form className="grid gap-2 sm:grid-cols-2" onSubmit={(event) => create(event, "campaign")}><input className="input h-10" name="name" placeholder="Campaign name" required/><input className="input h-10" name="spendInr" placeholder="Spend (₹)" type="number"/><select className="select h-10" name="projectId"><option value="">All projects</option>{data.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><button className="btn-primary h-10 px-3" disabled={saving}><Plus size={16}/>Add campaign</button></form></SettingSection>
    <SettingSection title="Communication templates" description="Used with manual WhatsApp, SMS, and email now. The same templates will support provider APIs later." items={data.templates} onArchive={(id) => archive("template", id)} onEdit={(item) => rename("template", item)}><form className="grid gap-2" onSubmit={(event) => create(event, "template")}><div className="grid gap-2 sm:grid-cols-2"><input className="input h-10" name="name" placeholder="Template name" required/><select className="select h-10" name="channel"><option>WHATSAPP</option><option>SMS</option><option>EMAIL</option></select></div><input className="input h-10" name="subject" placeholder="Subject (email only)"/><textarea className="input min-h-24" name="body" placeholder="Message with {{customer_name}} and {{project_name}}" required/><button className="btn-primary h-10 px-3" disabled={saving}><Plus size={16}/>Add template</button></form></SettingSection>
    <SettingSection title="Automation rules" description="Rules are stored and visible now. Internal reminders run automatically; external message actions remain manual until APIs are connected." items={data.automations} onArchive={(id) => archive("automation", id)} onEdit={(item) => rename("automation", item)}><form className="grid gap-2" onSubmit={(event) => create(event, "automation")}><input className="input h-10" name="name" placeholder="Rule name" required/><input className="input h-10" name="trigger" placeholder="Trigger, e.g. follow-up overdue 24 hours" required/><textarea className="input min-h-20" name="actions" placeholder="Actions, e.g. notify salesperson; notify manager after 1 day" required/><button className="btn-primary h-10 px-3" disabled={saving}><Plus size={16}/>Add rule</button></form></SettingSection>
  </div>;
}

function SettingSection({ title, description, items, onArchive, onEdit, children }: { title: string; description: string; items: Item[]; onArchive: (id: string) => void; onEdit: (item: Item) => void; children: React.ReactNode }) { return <section className="rounded-lg border border-slate-200 bg-white"><div className="border-b border-slate-200 p-5"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p><div className="mt-4">{children}</div></div><div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">{items.map((item) => <div className="flex items-start justify-between gap-3 p-4" key={item.id}><div><div className="font-medium">{item.name}</div>{typeof item.body === "string" ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.body}</p> : null}{typeof item.trigger === "string" ? <p className="mt-1 text-xs text-slate-500">When: {item.trigger}</p> : null}</div><div className="flex"><button className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800" onClick={() => onEdit(item)} title="Rename"><Pencil size={16}/></button><button className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => onArchive(item.id)} title="Archive"><Trash2 size={16}/></button></div></div>)}{!items.length ? <div className="p-6 text-center text-sm text-slate-500">None configured.</div> : null}</div></section>; }
