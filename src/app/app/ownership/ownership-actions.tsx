"use client";

import { FormEvent, useState } from "react";
import { FileUp, Loader2, Plus, Send } from "lucide-react";
import { FileUploader } from "@/components/file-uploader";

type PlotOption = { id: string; code: string };
type OwnerOption = { id: string; name: string };
type RealEstateDocumentType =
  | "ALLOTMENT_LETTER"
  | "TRANSFER_LETTER"
  | "PAN_CARD"
  | "AADHAAR_CARD"
  | "REGISTRY_RECEIPT"
  | "REGISTRY_DEED"
  | "PAYMENT_RECEIPT"
  | "KYC"
  | "AGREEMENT"
  | "NOC"
  | "OTHER";

export function CreateOwnerForm() {
  const [type, setType] = useState("INDIVIDUAL");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/v1/ownership/owners", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, name, email: email || undefined, phone: phone || undefined, address: address || undefined }),
    });
    const payload = await response.json();
    setLoading(false);
    setMessage(response.ok ? `Owner created: ${payload.data.name}` : payload.error ?? "Owner creation failed");
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="font-semibold">Create owner</h2>
      <label className="mt-4 block">
        <span className="label">Owner type</span>
        <select className="input" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="INDIVIDUAL">Individual</option>
          <option value="COMPANY">Company</option>
          <option value="SHARED">Shared ownership group</option>
        </select>
      </label>
      <label className="mt-4 block">
        <span className="label">Name</span>
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="mt-3 block">
        <span className="label">Email</span>
        <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="mt-3 block">
        <span className="label">Phone</span>
        <input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} />
      </label>
      <label className="mt-3 block">
        <span className="label">Address</span>
        <textarea className="input min-h-20" value={address} onChange={(event) => setAddress(event.target.value)} />
      </label>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4" disabled={loading || !name}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}
        Create owner
      </button>
    </form>
  );
}

export function AllotPlotForm({ plots, owners }: { plots: PlotOption[]; owners: OwnerOption[] }) {
  const [plotId, setPlotId] = useState(plots[0]?.id ?? "");
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const [amountInr, setAmountInr] = useState("0");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/v1/ownership/plots/${plotId}/allot`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ownerId, amountInr: Number(amountInr), sharePct: 100 }),
    });
    const payload = await response.json();
    setLoading(false);
    setMessage(response.ok ? `Plot ${payload.data.plot.code} allotted.` : payload.error ?? "Allotment failed");
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="font-semibold">Allot plot</h2>
      <div className="mt-4 grid gap-3">
        <label>
          <span className="label">Plot</span>
          <select className="input" value={plotId} onChange={(event) => setPlotId(event.target.value)}>
            {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.code}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Owner</span>
          <select className="input" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
            {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Amount in INR</span>
          <input className="input" value={amountInr} onChange={(event) => setAmountInr(event.target.value)} />
        </label>
      </div>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4" disabled={loading || !plotId || !ownerId}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
        Record allotment
      </button>
    </form>
  );
}

export function TransferPlotForm({ plots, owners }: { plots: PlotOption[]; owners: OwnerOption[] }) {
  const [plotId, setPlotId] = useState(plots[0]?.id ?? "");
  const [buyerOwnerId, setBuyerOwnerId] = useState(owners[0]?.id ?? "");
  const [amountInr, setAmountInr] = useState("0");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch(`/api/v1/ownership/plots/${plotId}/transfer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ buyerOwnerId, amountInr: Number(amountInr) }),
    });
    const payload = await response.json();
    setLoading(false);
    setMessage(response.ok ? `Plot ${payload.data.plot.code} transferred.` : payload.error ?? "Transfer failed");
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="font-semibold">Transfer plot</h2>
      <label className="mt-4 block"><span className="label">Plot</span><select className="input" value={plotId} onChange={(event) => setPlotId(event.target.value)}>{plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.code}</option>)}</select></label>
      <label className="mt-3 block"><span className="label">Buyer</span><select className="input" value={buyerOwnerId} onChange={(event) => setBuyerOwnerId(event.target.value)}>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label>
      <label className="mt-3 block"><span className="label">Amount in INR</span><input className="input" value={amountInr} onChange={(event) => setAmountInr(event.target.value)} /></label>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4" disabled={loading || !plotId || !buyerOwnerId}>{loading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}Record transfer</button>
    </form>
  );
}

export function RegistryForm({ plots }: { plots: PlotOption[] }) {
  const [plotId, setPlotId] = useState(plots[0]?.id ?? "");
  const [status, setStatus] = useState("Registry in progress");
  const [registryNo, setRegistryNo] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`/api/v1/ownership/plots/${plotId}/registry`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, registryNo }),
    });
    const body = await response.json();
    setMessage(response.ok ? "Registry status saved." : body.error ?? "Registry update failed");
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <h2 className="font-semibold">Registry update</h2>
      <label className="mt-4 block"><span className="label">Plot</span><select className="input" value={plotId} onChange={(event) => setPlotId(event.target.value)}>{plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.code}</option>)}</select></label>
      <label className="mt-3 block"><span className="label">Status</span><input className="input" value={status} onChange={(event) => setStatus(event.target.value)} /></label>
      <label className="mt-3 block"><span className="label">Registry no</span><input className="input" value={registryNo} onChange={(event) => setRegistryNo(event.target.value)} /></label>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4">Save registry</button>
    </form>
  );
}

const ownershipDocumentTypes: Array<{ value: RealEstateDocumentType; label: string }> = [
  { value: "ALLOTMENT_LETTER", label: "Allotment letter" },
  { value: "TRANSFER_LETTER", label: "Transfer letter" },
  { value: "PAN_CARD", label: "PAN card" },
  { value: "AADHAAR_CARD", label: "Aadhaar card" },
  { value: "REGISTRY_RECEIPT", label: "Registry receipt" },
  { value: "REGISTRY_DEED", label: "Registry deed" },
  { value: "PAYMENT_RECEIPT", label: "Payment receipt" },
  { value: "KYC", label: "KYC document" },
  { value: "AGREEMENT", label: "Agreement" },
  { value: "NOC", label: "NOC" },
  { value: "OTHER", label: "Other" },
];

export function OwnershipDocumentUpload({
  ownerType,
  ownerId,
  defaultVisibility = "TEAM",
}: {
  ownerType: "Plot" | "Owner" | "RegistryRecord";
  ownerId: string;
  defaultVisibility?: "ADMIN_ONLY" | "TEAM" | "OWNER_VISIBLE" | "SHARED";
}) {
  const [documentType, setDocumentType] = useState<RealEstateDocumentType>("ALLOTMENT_LETTER");
  const [documentNo, setDocumentNo] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState(defaultVisibility);
  const [message, setMessage] = useState("");

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <FileUp size={17} />
        <h3 className="text-sm font-semibold">Upload ownership document</h3>
      </div>
      <div className="grid gap-3">
        <label>
          <span className="label">Document type</span>
          <select className="input" value={documentType} onChange={(event) => setDocumentType(event.target.value as RealEstateDocumentType)}>
            {ownershipDocumentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Document no / reference</span>
          <input className="input" value={documentNo} onChange={(event) => setDocumentNo(event.target.value)} />
        </label>
        <label>
          <span className="label">Document date</span>
          <input className="input" type="date" value={documentDate} onChange={(event) => setDocumentDate(event.target.value)} />
        </label>
        <label>
          <span className="label">Visibility</span>
          <select className="input" value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}>
            <option value="ADMIN_ONLY">Admin only</option>
            <option value="TEAM">Team</option>
            <option value="OWNER_VISIBLE">Owner visible</option>
            <option value="SHARED">Shared</option>
          </select>
        </label>
        <label>
          <span className="label">Notes</span>
          <textarea className="input min-h-20" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <FileUploader
          label="Choose document"
          visibility={visibility}
          ownerType={ownerType}
          ownerId={ownerId}
          accept="application/pdf,image/*"
          metadata={{
            documentType,
            documentNo: documentNo || undefined,
            documentDate: documentDate ? new Date(documentDate).toISOString() : undefined,
            notes: notes || undefined,
          }}
          onUploaded={(file) => setMessage(`Uploaded ${file.fileName}. Refresh to see it in the vault.`)}
        />
      </div>
      {message ? <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}
    </div>
  );
}
