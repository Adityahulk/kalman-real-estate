"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { requestJson } from "@/lib/api-client";

type Firm = {
  id: string;
  name: string;
  address: string | null;
  logoDataUrl: string | null;
};

type CustomField = {
  id: string;
  key: string;
  label: string;
};

export function FirmSelector({ firms, customFields }: { firms: Firm[]; customFields: CustomField[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(firms.length === 0);
  const [selected, setSelected] = useState("");
  const [authorizedPersons, setAuthorizedPersons] = useState([""]);
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [showEditKey, setShowEditKey] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function selectFirm(tenantId: string) {
    if (!tenantId) return;
    setLoading(true);
    setMessage("");
    try {
      await requestJson<Firm>("/api/v1/firms/select", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      router.push("/app");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open firm");
    } finally {
      setLoading(false);
    }
  }

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

  async function createFirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const firm = await requestJson<Firm>("/api/v1/firms", {
        method: "POST",
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
      await selectFirm(firm.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create firm");
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 max-w-3xl">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-end gap-3">
          <label className="min-w-0 flex-1">
            <span className="label">Select your firm</span>
            <select
              className="input"
              value={selected}
              onChange={(event) => {
                setSelected(event.target.value);
                void selectFirm(event.target.value);
              }}
              disabled={loading || firms.length === 0}
            >
              <option value="">{firms.length ? "Choose a firm" : "No firms added yet"}</option>
              {firms.map((firm) => <option key={firm.id} value={firm.id}>{firm.name}</option>)}
            </select>
          </label>
          <button className="btn-primary h-10 w-10 px-0" type="button" onClick={() => setShowForm((value) => !value)} title="Add new firm">
            <Plus size={18} />
          </button>
        </div>
        {!firms.length ? <p className="mt-3 text-sm text-slate-500">Add your first firm to continue.</p> : null}
        {loading && selected ? <div className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={15} /> Opening firm...</div> : null}
        {message ? <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</div> : null}
      </div>

      {showForm ? (
        <form className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-card" onSubmit={createFirm}>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {logoDataUrl ? (
                <img className="h-full w-full object-contain" src={logoDataUrl} alt="Firm logo preview" />
              ) : (
                <Building2 size={24} className="text-slate-400" />
              )}
            </div>
            <div>
              <h2 className="font-semibold">Add new firm</h2>
              <p className="text-sm text-slate-500">The uploaded logo will be shown in the app header for this firm.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Firm name" name="name" required />
            <Field label="Email" name="email" type="email" required />
            <Field label="PAN" name="pan" required />
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
              <textarea className="input min-h-20" name="address" required />
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
              {logoDataUrl ? (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <img className="h-full w-full object-contain" src={logoDataUrl} alt="Firm logo preview" />
                  </div>
                  <div className="text-sm text-slate-600">This logo will appear on the top left of this firm&apos;s workspace.</div>
                </div>
              ) : null}
            </label>
            {customFields.map((field) => (
              <Field key={field.id} label={field.label} name={`custom-${field.key}`} />
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            {firms.length ? <button className="btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button> : null}
            <button className="btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Create firm
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="input" name={name} type={type} required={required} />
    </label>
  );
}
