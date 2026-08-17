"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { crmRequest } from "../../crm-api";

type Option = { id: string; name: string };
type UserOption = Option & { role: string; roleName: string | null };

export function NewLeadForm({ campaigns, projects, referrals, sources, users }: { campaigns: Option[]; projects: Option[]; referrals: Option[]; sources: Option[]; users: UserOption[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const number = (name: string) => text(name) ? Number(text(name)) : null;
    try {
      const lead = await crmRequest<{ id: string }>("/api/v1/crm/leads", "POST", {
        name: text("name"), primaryPhone: text("primaryPhone"), alternatePhone: text("alternatePhone") || null,
        whatsappPhone: text("whatsappPhone") || null, email: text("email"), city: text("city") || null, area: text("area") || null,
        sourceId: text("sourceId"), campaignId: text("campaignId") || null, interestedProjectId: text("interestedProjectId") || null,
        propertyType: text("propertyType") || null, interestedProperty: text("interestedProperty") || null,
        budgetMinInr: number("budgetMinInr"), budgetMaxInr: number("budgetMaxInr"), purchaseTimeline: text("purchaseTimeline") || null,
        purpose: text("purpose") || null, previousWork: text("previousWork") || null, previousInteraction: text("previousInteraction") || null,
        preferredLanguage: text("preferredLanguage") || null, preferredContactMethod: text("preferredContactMethod") || null,
        assignedCallerId: text("assignedCallerId") || null, assignedSalespersonId: text("assignedSalespersonId") || null,
        notes: text("notes") || null, tags: text("tags").split(",").map((item) => item.trim()).filter(Boolean), referredByLeadId: text("referredByLeadId") || null,
        existingCustomer: form.get("existingCustomer") === "on", consentWhatsApp: form.get("consentWhatsApp") === "on",
        consentSms: form.get("consentSms") === "on", consentEmail: form.get("consentEmail") === "on",
      });
      router.push(`/app/crm/leads/${lead.id}`); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create the lead."); setSaving(false); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }
  return <form className="mx-auto max-w-6xl" onSubmit={submit}>
    <div className="mb-6 flex items-start justify-between gap-4"><div><Link className="mb-3 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950" href="/app/crm/leads"><ArrowLeft size={15}/>Leads</Link><h1 className="text-3xl font-semibold">New lead</h1><p className="mt-2 text-sm text-slate-600">Capture the essentials first. Everything else can be completed during the call.</p></div><button className="btn-primary h-10 px-4" disabled={saving}>{saving ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>}Save lead</button></div>
    {error ? <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="shrink-0" size={18}/><div><b>Lead not saved.</b><div>{error}</div></div></div> : null}
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="font-semibold">Customer</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Field label="Name" name="name" required/><Field label="Primary phone" name="primaryPhone" required/><Field label="WhatsApp number" name="whatsappPhone"/><Field label="Alternate phone" name="alternatePhone"/><Field label="Email" name="email" type="email"/><Field label="City" name="city"/><Field label="Area / locality" name="area"/><Select label="Preferred language" name="preferredLanguage" options={["Punjabi","Hindi","English"]}/><Select label="Preferred contact" name="preferredContactMethod" options={["Phone","WhatsApp","Email"]}/></div></section>
      <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="font-semibold">Requirement</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><SelectOptions label="Lead source" name="sourceId" options={sources} required/><SelectOptions label="Campaign" name="campaignId" options={campaigns}/><SelectOptions label="Referred by" name="referredByLeadId" options={referrals}/><SelectOptions label="Interested project" name="interestedProjectId" options={projects}/><Select label="Property type" name="propertyType" options={["Plot","Shop","Flat","Commercial","Other"]}/><Field label="Specific property / plot" name="interestedProperty"/><Field label="Budget from (₹)" name="budgetMinInr" type="number"/><Field label="Budget to (₹)" name="budgetMaxInr" type="number"/><Field label="Purchase timeline" name="purchaseTimeline" placeholder="e.g. Within 3 months"/><Field label="Purpose" name="purpose" placeholder="Investment, residence, business..."/><Field label="Previous work / reference" name="previousWork"/></div></section>
      <section className="rounded-lg border border-slate-200 bg-white p-5"><h2 className="font-semibold">Assignment and notes</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><SelectOptions label="Caller" name="assignedCallerId" options={users.map((user) => ({ id: user.id, name: `${user.name} · ${user.roleName || user.role}` }))}/><SelectOptions label="Salesperson" name="assignedSalespersonId" options={users.map((user) => ({ id: user.id, name: `${user.name} · ${user.roleName || user.role}` }))}/><Field label="Tags" name="tags" placeholder="hot, referral, repeat buyer"/><Field label="Previous interaction" name="previousInteraction"/><label className="md:col-span-2"><span className="label">Notes</span><textarea className="input min-h-28 w-full" name="notes" placeholder="Questions asked, requirement, objections, and context"/></label></div><div className="mt-5 flex flex-wrap gap-5 text-sm"><CheckBox name="existingCustomer" label="Existing customer"/><CheckBox name="consentWhatsApp" label="WhatsApp consent"/><CheckBox name="consentSms" label="SMS consent"/><CheckBox name="consentEmail" label="Email consent"/></div></section>
    </div>
  </form>;
}

function Field({ label, name, required, type = "text", placeholder }: { label: string; name: string; required?: boolean; type?: string; placeholder?: string }) { return <label><span className="label">{label}{required ? " *" : ""}</span><input className="input h-10 w-full" name={name} placeholder={placeholder} required={required} type={type}/></label>; }
function Select({ label, name, options }: { label: string; name: string; options: string[] }) { return <label><span className="label">{label}</span><select className="select h-10 w-full" name={name}><option value="">Select</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function SelectOptions({ label, name, options, required }: { label: string; name: string; options: Option[]; required?: boolean }) { return <label><span className="label">{label}{required ? " *" : ""}</span><select className="select h-10 w-full" name={name} required={required}><option value="">{required ? "Select" : "Unassigned / not selected"}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>; }
function CheckBox({ label, name }: { label: string; name: string }) { return <label className="inline-flex items-center gap-2"><input className="h-4 w-4" name={name} type="checkbox"/>{label}</label>; }
