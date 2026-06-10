"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";

type FirmInput = {
  id: string;
  name: string;
  address: string;
  pan: string;
  email: string;
  logoDataUrl: string;
  authorizedPersons: string[];
  customFields: Record<string, string>;
};

type CustomField = {
  id: string;
  key: string;
  label: string;
};

export function FirmDetailsEditor({ firm, customFields }: { firm: FirmInput; customFields: CustomField[] }) {
  const router = useRouter();
  const [authorizedPersons, setAuthorizedPersons] = useState(firm.authorizedPersons.length ? firm.authorizedPersons : [""]);
  const [logoDataUrl, setLogoDataUrl] = useState(firm.logoDataUrl);
  const [showEditKey, setShowEditKey] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function readLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setMessage("Logo must be smaller than 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/firms/${firm.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        address: form.get("address"),
        pan: form.get("pan"),
        email: form.get("email"),
        editKey: form.get("editKey"),
        authorizedPersons: authorizedPersons.filter((person) => person.trim()),
        logoDataUrl: logoDataUrl || undefined,
        customFields: Object.fromEntries(customFields.map((field) => [field.key, String(form.get(`custom-${field.key}`) ?? "")])),
      }),
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(body.error ?? "Could not save firm details");
      return;
    }
    setMessage("Firm details saved.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid h-full min-h-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-h-0 overflow-auto rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-semibold">Firm details</h1>
            <p className="mt-1 text-sm text-slate-500">Use the edit key to save any changes.</p>
          </div>
          <Link className="btn-outline h-9" href="/app/settings/firm-details">Back</Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Firm name" name="name" defaultValue={firm.name} required />
          <Field label="Email" name="email" type="email" defaultValue={firm.email} required />
          <Field label="PAN" name="pan" defaultValue={firm.pan} required />
          <label>
            <span className="label">Key to edit firm details</span>
            <span className="relative block">
              <input className="input pr-10" name="editKey" type={showEditKey ? "text" : "password"} required />
              <button
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-navy-900"
                type="button"
                onClick={() => setShowEditKey((value) => !value)}
                aria-label={showEditKey ? "Hide edit key" : "Show edit key"}
              >
                {showEditKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </span>
          </label>
          <label className="sm:col-span-2">
            <span className="label">Address</span>
            <textarea className="input min-h-20" name="address" defaultValue={firm.address} required />
          </label>
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="label">Authorised persons</span>
              <button className="btn-ghost h-8 px-2 text-xs" type="button" onClick={() => setAuthorizedPersons((items) => [...items, ""])}>
                <Plus size={14} /> Add line
              </button>
            </div>
            <div className="space-y-2">
              {authorizedPersons.map((person, index) => (
                <div className="flex gap-2" key={index}>
                  <input
                    className="input"
                    value={person}
                    onChange={(event) => setAuthorizedPersons((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                    required={index === 0}
                  />
                  {authorizedPersons.length > 1 ? (
                    <button className="btn-outline h-10 w-10 px-0 text-rose-700" type="button" onClick={() => setAuthorizedPersons((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
                      <Trash2 size={15} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <label className="sm:col-span-2">
            <span className="label">Firm logo</span>
            <span className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              <Upload size={17} />
              {logoDataUrl ? "Logo selected" : "Upload logo"}
              <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={readLogo} />
            </span>
          </label>
          {customFields.map((field) => (
            <Field key={field.id} label={field.label} name={`custom-${field.key}`} defaultValue={firm.customFields[field.key] ?? ""} />
          ))}
        </div>
      </section>

      <aside className="min-h-0 space-y-4 overflow-auto">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Save details
          </button>
          {message ? <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${message.includes("saved") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{message}</div> : null}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="font-semibold">Additional fields</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Add new field types from the Firm details settings list. They will appear here and in the add-new-firm form.</p>
        </div>
      </aside>
    </form>
  );
}

function Field({ label, name, type = "text", defaultValue = "", required = false }: { label: string; name: string; type?: string; defaultValue?: string; required?: boolean }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="input" name={name} type={type} defaultValue={defaultValue} required={required} />
    </label>
  );
}
