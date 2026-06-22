"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Plus, Save, Send, Wand2 } from "lucide-react";
import { FileUploader } from "@/components/file-uploader";

type PlotOption = { id: string; code: string };
type OwnerOption = { id: string; name: string };
type OwnerDetailOption = { id: string; name: string; email: string | null; phone: string | null };
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
  const [ownerId, setOwnerId] = useState("");
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
            <option value="">Select owner intentionally</option>
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
  const [buyerOwnerId, setBuyerOwnerId] = useState("");
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
      <label className="mt-3 block"><span className="label">Buyer</span><select className="input" value={buyerOwnerId} onChange={(event) => setBuyerOwnerId(event.target.value)}><option value="">Select buyer intentionally</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label>
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
  defaultDocumentType = "ALLOTMENT_LETTER",
  title = "Upload ownership document",
  fixedCategoryKey,
  defaultNotes = "",
  hideDocumentType = false,
}: {
  ownerType: "Plot" | "Owner" | "RegistryRecord";
  ownerId: string;
  defaultVisibility?: "ADMIN_ONLY" | "TEAM" | "OWNER_VISIBLE" | "SHARED";
  defaultDocumentType?: RealEstateDocumentType;
  title?: string;
  fixedCategoryKey?: string;
  defaultNotes?: string;
  hideDocumentType?: boolean;
}) {
  const [documentType, setDocumentType] = useState<RealEstateDocumentType>(defaultDocumentType);
  const [documentNo, setDocumentNo] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [notes, setNotes] = useState(defaultNotes);
  const [visibility, setVisibility] = useState(defaultVisibility);
  const [message, setMessage] = useState("");

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <FileUp size={17} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="grid gap-3">
        {!hideDocumentType ? (
          <label>
            <span className="label">Document type</span>
            <select className="input" value={documentType} onChange={(event) => setDocumentType(event.target.value as RealEstateDocumentType)}>
              {ownershipDocumentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
        ) : null}
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
            categoryKey: fixedCategoryKey,
          }}
          onUploaded={(file) => setMessage(`Uploaded ${file.fileName}. Refresh to see it in the vault.`)}
        />
      </div>
      {message ? <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}
    </div>
  );
}

export function PlotAllotmentForm({ plotId, owners }: { plotId: string; owners: OwnerDetailOption[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [ownerId, setOwnerId] = useState("");
  const [ownerType, setOwnerType] = useState("INDIVIDUAL");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [amountInr, setAmountInr] = useState("");
  const [sharePct, setSharePct] = useState("100");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    let resolvedOwnerId = ownerId;

    if (mode === "new") {
      const ownerResponse = await fetch("/api/v1/ownership/owners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: ownerType, name, email: email || undefined, phone: phone || undefined, address: address || undefined }),
      });
      const ownerBody = await ownerResponse.json();
      if (!ownerResponse.ok) {
        setLoading(false);
        setMessage(ownerBody.error ?? "Owner creation failed");
        return;
      }
      resolvedOwnerId = ownerBody.data.id;
    }

    const response = await fetch(`/api/v1/ownership/plots/${plotId}/allot`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ownerId: resolvedOwnerId,
        amountInr: amountInr ? Number(amountInr) : undefined,
        sharePct: sharePct ? Number(sharePct) : undefined,
        notes: notes || undefined,
      }),
    });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? "Allotment recorded." : body.error ?? "Allotment failed");
    if (response.ok) router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold">First allotment</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">Use this only when the plot is still with the company. No owner is selected by default.</p>
      <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 text-sm">
        <button type="button" className={`px-3 py-2 ${mode === "new" ? "bg-navy-100 text-navy-900" : "bg-white text-slate-700"}`} onClick={() => setMode("new")}>New owner</button>
        <button type="button" className={`px-3 py-2 ${mode === "existing" ? "bg-navy-100 text-navy-900" : "bg-white text-slate-700"}`} onClick={() => setMode("existing")}>Existing owner</button>
      </div>

      {mode === "existing" ? (
        <label className="mt-3 block">
          <span className="label">Owner</span>
          <select className="input" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
            <option value="">Select owner intentionally</option>
            {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
          </select>
        </label>
      ) : (
        <div className="mt-3 grid gap-3">
          <label><span className="label">Owner type</span><select className="input" value={ownerType} onChange={(event) => setOwnerType(event.target.value)}><option value="INDIVIDUAL">Individual</option><option value="COMPANY">Company</option><option value="SHARED">Shared ownership group</option></select></label>
          <label><span className="label">Name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label><span className="label">Email</span><input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label><span className="label">Phone</span><input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <label><span className="label">Address</span><textarea className="input min-h-20" value={address} onChange={(event) => setAddress(event.target.value)} /></label>
        </div>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label><span className="label">Amount in INR</span><input className="input" inputMode="numeric" value={amountInr} onChange={(event) => setAmountInr(event.target.value)} /></label>
        <label><span className="label">Share %</span><input className="input" inputMode="decimal" value={sharePct} onChange={(event) => setSharePct(event.target.value)} /></label>
      </div>
      <label className="mt-3 block"><span className="label">Notes</span><textarea className="input min-h-20" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4 w-full" disabled={loading || (mode === "existing" ? !ownerId : !name)}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
        Record allotment
      </button>
    </form>
  );
}

export function PlotTransferForm({ plotId, owners }: { plotId: string; owners: OwnerDetailOption[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [buyerOwnerId, setBuyerOwnerId] = useState("");
  const [ownerType, setOwnerType] = useState("INDIVIDUAL");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [amountInr, setAmountInr] = useState("");
  const [sharePct, setSharePct] = useState("100");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    let resolvedBuyerId = buyerOwnerId;

    if (mode === "new") {
      const ownerResponse = await fetch("/api/v1/ownership/owners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: ownerType, name, email: email || undefined, phone: phone || undefined, address: address || undefined }),
      });
      const ownerBody = await ownerResponse.json();
      if (!ownerResponse.ok) {
        setLoading(false);
        setMessage(ownerBody.error ?? "Buyer creation failed");
        return;
      }
      resolvedBuyerId = ownerBody.data.id;
    }

    const response = await fetch(`/api/v1/ownership/plots/${plotId}/transfer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        buyerOwnerId: resolvedBuyerId,
        amountInr: amountInr ? Number(amountInr) : undefined,
        sharePct: sharePct ? Number(sharePct) : undefined,
        notes: notes || undefined,
      }),
    });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? "Transfer recorded." : body.error ?? "Transfer failed");
    if (response.ok) router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold">Transfer / resale</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">Use this only after a plot already has an owner. No buyer is selected by default.</p>
      <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 text-sm">
        <button type="button" className={`px-3 py-2 ${mode === "new" ? "bg-navy-100 text-navy-900" : "bg-white text-slate-700"}`} onClick={() => setMode("new")}>New buyer</button>
        <button type="button" className={`px-3 py-2 ${mode === "existing" ? "bg-navy-100 text-navy-900" : "bg-white text-slate-700"}`} onClick={() => setMode("existing")}>Existing buyer</button>
      </div>
      {mode === "existing" ? (
        <label className="mt-3 block">
          <span className="label">Buyer</span>
          <select className="input" value={buyerOwnerId} onChange={(event) => setBuyerOwnerId(event.target.value)}>
            <option value="">Select buyer intentionally</option>
            {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
          </select>
        </label>
      ) : (
        <div className="mt-3 grid gap-3">
          <label><span className="label">Buyer type</span><select className="input" value={ownerType} onChange={(event) => setOwnerType(event.target.value)}><option value="INDIVIDUAL">Individual</option><option value="COMPANY">Company</option><option value="SHARED">Shared ownership group</option></select></label>
          <label><span className="label">Name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label><span className="label">Email</span><input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label><span className="label">Phone</span><input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <label><span className="label">Address</span><textarea className="input min-h-20" value={address} onChange={(event) => setAddress(event.target.value)} /></label>
        </div>
      )}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label><span className="label">Transfer amount in INR</span><input className="input" inputMode="numeric" value={amountInr} onChange={(event) => setAmountInr(event.target.value)} /></label>
        <label><span className="label">Share %</span><input className="input" inputMode="decimal" value={sharePct} onChange={(event) => setSharePct(event.target.value)} /></label>
      </div>
      <label className="mt-3 block"><span className="label">Transfer notes</span><textarea className="input min-h-20" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4 w-full" disabled={loading || (mode === "existing" ? !buyerOwnerId : !name)}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
        Record transfer
      </button>
    </form>
  );
}

export function PlotRegistryForm({ plotId }: { plotId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("In process");
  const [registryNo, setRegistryNo] = useState("");
  const [registryDate, setRegistryDate] = useState("");
  const [registryOffice, setRegistryOffice] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const combinedNotes = [registryOffice ? `Office: ${registryOffice}` : "", notes].filter(Boolean).join("\n");
    const response = await fetch(`/api/v1/ownership/plots/${plotId}/registry`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status,
        registryNo: registryNo || undefined,
        registryDate: registryDate ? new Date(registryDate).toISOString() : undefined,
        notes: combinedNotes || undefined,
      }),
    });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? "Registry update saved." : body.error ?? "Registry update failed");
    if (response.ok) router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold">Registry status</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label><span className="label">Status</span><select className="input" value={status} onChange={(event) => setStatus(event.target.value)}><option>Not started</option><option>In process</option><option>Submitted</option><option>Completed</option><option>On hold</option></select></label>
        <label><span className="label">Registry number</span><input className="input" value={registryNo} onChange={(event) => setRegistryNo(event.target.value)} /></label>
        <label><span className="label">Registry date</span><input className="input" type="date" value={registryDate} onChange={(event) => setRegistryDate(event.target.value)} /></label>
        <label><span className="label">Registry office</span><input className="input" value={registryOffice} onChange={(event) => setRegistryOffice(event.target.value)} /></label>
      </div>
      <label className="mt-3 block"><span className="label">Notes</span><textarea className="input min-h-20" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4 w-full" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
        Save registry
      </button>
    </form>
  );
}

export function GeneratePlotDocumentPanel({ plotId, plotCode, ownerName }: { plotId: string; plotCode: string; ownerName: string }) {
  const router = useRouter();
  const [type, setType] = useState("allotment_letter");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const response = await fetch("/api/v1/documents/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        recordType: "Plot",
        recordId: plotId,
        data: { plotCode, ownerName },
      }),
    });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? `Generated ${body.data.document.number}.` : body.error ?? "Document generation failed");
    if (response.ok) router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold">Generate letter</h3>
      <label className="mt-3 block">
        <span className="label">Letter type</span>
        <select className="input" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="allotment_letter">Allotment letter</option>
          <option value="transfer_letter">Transfer letter</option>
          <option value="registry_status_letter">Registry status letter</option>
        </select>
      </label>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button type="button" className="btn-primary mt-4 w-full" onClick={generate} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Wand2 size={17} />}
        Generate PDF
      </button>
    </div>
  );
}

export function PlotChecklistProgressForm({ items }: { items: { id: string; label: string }[] }) {
  const router = useRouter();
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [progressPct, setProgressPct] = useState("50");
  const [summary, setSummary] = useState("");
  const [visibleToOwner, setVisibleToOwner] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch(`/api/v1/development/plot-checklists/${itemId}/progress`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ progressPct: Number(progressPct), summary, visibleToOwner }),
    });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? "Plot progress saved." : body.error ?? "Progress update failed");
    if (response.ok) router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold">Update plot zone progress</h3>
      <label className="mt-3 block">
        <span className="label">Zone / checklist</span>
        <select className="input" value={itemId} onChange={(event) => setItemId(event.target.value)}>
          {items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label><span className="label">Progress %</span><input className="input" inputMode="numeric" value={progressPct} onChange={(event) => setProgressPct(event.target.value)} /></label>
        <label className="flex items-end gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <input type="checkbox" checked={visibleToOwner} onChange={(event) => setVisibleToOwner(event.target.checked)} />
          Owner visible
        </label>
      </div>
      <label className="mt-3 block"><span className="label">Progress note</span><textarea className="input min-h-20" value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
      {message ? <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary mt-4 w-full" disabled={loading || !itemId || !summary}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
        Save progress
      </button>
    </form>
  );
}
