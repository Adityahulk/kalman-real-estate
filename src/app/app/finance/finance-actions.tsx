"use client";

import { FormEvent, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { FileUploader } from "@/components/file-uploader";

export function BoqForm({ projects }: { projects: { id: string; name: string }[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [plannedQty, setPlannedQty] = useState("0");
  const [plannedRateInr, setPlannedRateInr] = useState("0");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/v1/finance/boq", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectId,
        code,
        description,
        unit: "unit",
        plannedQty: Number(plannedQty),
        plannedRateInr: Number(plannedRateInr),
        category: "General",
      }),
    });
    const payload = await response.json();
    setLoading(false);
    setMessage(response.ok ? `BOQ item created: ${payload.data.code}` : payload.error ?? "BOQ creation failed");
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="font-semibold">Create BOQ item</h2>
      <label className="mt-4 block">
        <span className="label">Project</span>
        <select className="input" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label>
          <span className="label">Code</span>
          <input className="input" value={code} onChange={(event) => setCode(event.target.value)} />
        </label>
        <label>
          <span className="label">Description</span>
          <input className="input" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>
          <span className="label">Planned qty</span>
          <input className="input" value={plannedQty} onChange={(event) => setPlannedQty(event.target.value)} />
        </label>
        <label>
          <span className="label">Rate INR</span>
          <input className="input" value={plannedRateInr} onChange={(event) => setPlannedRateInr(event.target.value)} />
        </label>
      </div>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4" disabled={loading || !projectId || !code || !description}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
        Create BOQ
      </button>
    </form>
  );
}

export function VendorContractorForm() {
  const [message, setMessage] = useState("");

  async function create(path: "vendors" | "contractors", body: Record<string, string>) {
    const response = await fetch(`/api/v1/finance/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    setMessage(response.ok ? `${path === "vendors" ? "Vendor" : "Contractor"} created.` : payload.error ?? "Creation failed");
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold">Vendor and contractor quick add</h2>
      <div className="mt-4 grid gap-3">
        <button className="btn-outline justify-start" onClick={() => create("vendors", { name: "New Material Vendor", type: "Material" })}>Create sample vendor</button>
        <button className="btn-outline justify-start" onClick={() => create("contractors", { name: "New Civil Contractor", trade: "Civil" })}>Create sample contractor</button>
      </div>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
    </div>
  );
}

export function InvoicePaymentPanel({ projects, invoices }: { projects: { id: string; name: string }[]; invoices: { id: string; number: string }[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id ?? "");
  const [message, setMessage] = useState("");

  async function createInvoice(file: { id: string; fileName: string }) {
    const response = await fetch("/api/v1/finance/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId, number: `INV-${Date.now()}`, totalInr: 100000, fileAssetId: file.id }),
    });
    const body = await response.json();
    setMessage(response.ok ? `Invoice created from ${file.fileName}` : body.error ?? "Invoice creation failed");
  }

  async function payInvoice() {
    const response = await fetch(`/api/v1/finance/invoices/${invoiceId}/payments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountInr: 1000, mode: "bank_transfer", reference: `PAY-${Date.now()}` }),
    });
    const body = await response.json();
    setMessage(response.ok ? "Payment recorded." : body.error ?? "Payment failed");
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold">Invoice upload and payment</h2>
      <label className="mt-4 block"><span className="label">Project</span><select className="input" value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <div className="mt-3"><FileUploader label="Upload invoice PDF" visibility="TEAM" ownerType="Invoice" ownerId={projectId} accept="application/pdf,image/*" onUploaded={createInvoice} /></div>
      <label className="mt-4 block"><span className="label">Invoice</span><select className="input" value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)}>{invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.number}</option>)}</select></label>
      <button className="btn-primary mt-3" onClick={payInvoice} disabled={!invoiceId}>Record ₹1,000 payment</button>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
    </div>
  );
}
