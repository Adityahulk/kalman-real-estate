"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Loader2, Save, Send, Wand2 } from "lucide-react";

type ProjectInfo = {
  id: string;
  name: string;
  city: string;
  address: string | null;
  progressPct: number;
  budgetInr: string | null;
  whatsappShareText: string | null;
};

type PlotOption = {
  id: string;
  code: string;
  areaSqft: string | null;
  priceInr: string | null;
};

type OwnerOption = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export function ProjectSiteInfoForm({
  project,
  defaultShareText,
}: {
  project: ProjectInfo;
  defaultShareText: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [city, setCity] = useState(project.city);
  const [address, setAddress] = useState(project.address ?? "");
  const [progressPct, setProgressPct] = useState(String(project.progressPct));
  const [budgetInr, setBudgetInr] = useState(project.budgetInr ?? "");
  const [whatsappShareText, setWhatsappShareText] = useState(project.whatsappShareText ?? defaultShareText);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/v1/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        city,
        address: address || undefined,
        progressPct: Number(progressPct),
        budgetInr: budgetInr ? Number(budgetInr) : undefined,
        whatsappShareText,
      }),
    });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? "Site information saved." : body.error ?? "Project update failed");
    if (response.ok) router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="label">Project name</span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          <span className="label">City / location</span>
          <input className="input" value={city} onChange={(event) => setCity(event.target.value)} />
        </label>
        <label className="md:col-span-2">
          <span className="label">Site address</span>
          <textarea className="input min-h-20" value={address} onChange={(event) => setAddress(event.target.value)} />
        </label>
        <label>
          <span className="label">Progress %</span>
          <input className="input" inputMode="numeric" value={progressPct} onChange={(event) => setProgressPct(event.target.value)} />
        </label>
        <label>
          <span className="label">Budget in INR</span>
          <input className="input" inputMode="numeric" value={budgetInr} onChange={(event) => setBudgetInr(event.target.value)} />
        </label>
        <label className="md:col-span-2">
          <span className="label">WhatsApp share text</span>
          <textarea className="input min-h-32" value={whatsappShareText} onChange={(event) => setWhatsappShareText(event.target.value)} />
        </label>
      </div>
      {message ? <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <button className="btn-primary w-fit" disabled={loading || !name || !city}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
        Save site information
      </button>
    </form>
  );
}

export function ProjectAllotmentFlow({
  projectId,
  plots,
  owners,
  defaultPlotId,
}: {
  projectId: string;
  plots: PlotOption[];
  owners: OwnerOption[];
  defaultPlotId?: string;
}) {
  const router = useRouter();
  const [plotId, setPlotId] = useState(defaultPlotId && plots.some((plot) => plot.id === defaultPlotId) ? defaultPlotId : plots[0]?.id ?? "");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? "");
  const [ownerType, setOwnerType] = useState("INDIVIDUAL");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [amountInr, setAmountInr] = useState("");
  const [sharePct, setSharePct] = useState("100");
  const [effectiveAt, setEffectiveAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [completedPlotId, setCompletedPlotId] = useState("");

  const selectedPlot = useMemo(() => plots.find((plot) => plot.id === plotId), [plotId, plots]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plotId) return;
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
        effectiveAt: effectiveAt ? new Date(effectiveAt).toISOString() : undefined,
        notes: notes || undefined,
      }),
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(body.error ?? "Allotment failed");
      return;
    }
    setCompletedPlotId(plotId);
    setMessage(`Plot ${body.data.plot.code} allotted. You can open Letter Studio now.`);
    router.refresh();
  }

  if (!plots.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-600">
        No company-owned plots are available for allotment. Add a plot first or check the selected project inventory.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label>
        <span className="label">Company-owned plot</span>
        <select className="input" value={plotId} onChange={(event) => setPlotId(event.target.value)}>
          {plots.map((plot) => (
            <option key={plot.id} value={plot.id}>
              {plot.code} {plot.areaSqft ? `· ${plot.areaSqft} sq ft` : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        Selected plot: <span className="font-medium text-navy-900">{selectedPlot?.code}</span>
        {selectedPlot?.priceInr ? ` · INR ${selectedPlot.priceInr}` : ""}
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 text-sm">
        <button type="button" className={`px-3 py-2 ${mode === "existing" ? "bg-navy-900 text-white" : "bg-white text-slate-700"}`} onClick={() => setMode("existing")}>
          Existing owner
        </button>
        <button type="button" className={`px-3 py-2 ${mode === "new" ? "bg-navy-900 text-white" : "bg-white text-slate-700"}`} onClick={() => setMode("new")}>
          New owner
        </button>
      </div>

      {mode === "existing" ? (
        <label>
          <span className="label">Owner</span>
          <select className="input" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
            {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
          </select>
        </label>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className="label">Owner type</span><select className="input" value={ownerType} onChange={(event) => setOwnerType(event.target.value)}><option value="INDIVIDUAL">Individual</option><option value="COMPANY">Company</option><option value="SHARED">Shared ownership group</option></select></label>
          <label><span className="label">Name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label><span className="label">Email</span><input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label><span className="label">Phone</span><input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <label className="md:col-span-2"><span className="label">Address</span><textarea className="input min-h-20" value={address} onChange={(event) => setAddress(event.target.value)} /></label>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <label><span className="label">Amount in INR</span><input className="input" inputMode="numeric" value={amountInr} onChange={(event) => setAmountInr(event.target.value)} /></label>
        <label><span className="label">Share %</span><input className="input" inputMode="decimal" value={sharePct} onChange={(event) => setSharePct(event.target.value)} /></label>
        <label><span className="label">Allotment date</span><input className="input" type="date" value={effectiveAt} onChange={(event) => setEffectiveAt(event.target.value)} /></label>
      </div>
      <label>
        <span className="label">Notes</span>
        <textarea className="input min-h-20" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      {message ? <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={loading || !plotId || (mode === "existing" ? !ownerId : !name)}>
          {loading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
          Record allotment
        </button>
        {completedPlotId ? (
          <Link className="btn-gold" href={`/app/projects/${projectId}/plots/${completedPlotId}/letters/new?type=allotment_letter`}>
            <FileText size={17} />
            Open Letter Studio
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export function LetterDraftStartForm({
  plotId,
  projectId,
  defaultType = "allotment_letter",
}: {
  plotId: string;
  projectId: string;
  defaultType?: "allotment_letter" | "transfer_letter" | "registry_status_letter";
}) {
  const router = useRouter();
  const [type, setType] = useState(defaultType);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/v1/documents/drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, recordType: "Plot", recordId: plotId }),
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(body.error ?? "Draft creation failed");
      return;
    }
    router.push(`/app/projects/${projectId}/plots/${plotId}/letters/${body.data.document.id}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label>
        <span className="label">Letter type</span>
        <select className="input" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
          <option value="allotment_letter">Allotment letter</option>
          <option value="transfer_letter">Transfer letter</option>
          <option value="registry_status_letter">Registry status letter</option>
        </select>
      </label>
      {message ? <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</div> : null}
      <button className="btn-primary w-fit" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" size={17} /> : <Wand2 size={17} />}
        Create editable draft
      </button>
    </form>
  );
}

export function LetterStudioEditor({
  document,
  projectId,
  plotId,
  missingVariables,
}: {
  document: {
    id: string;
    number: string | null;
    type: string;
    status: string;
    editableHtml: string | null;
    fileAssetId: string | null;
  };
  projectId: string;
  plotId: string;
  missingVariables: string[];
}) {
  const router = useRouter();
  const [html, setHtml] = useState(document.editableHtml ?? "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<"save" | "render" | "">("");

  async function saveDraft() {
    setLoading("save");
    setMessage("");
    const response = await fetch(`/api/v1/documents/${document.id}/draft`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ editableHtml: html }),
    });
    const body = await response.json();
    setLoading("");
    setMessage(response.ok ? "Draft saved." : body.error ?? "Draft save failed");
    if (response.ok) router.refresh();
  }

  async function renderPdf() {
    setLoading("render");
    setMessage("");
    const saveResponse = await fetch(`/api/v1/documents/${document.id}/draft`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ editableHtml: html }),
    });
    const saveBody = await saveResponse.json();
    if (!saveResponse.ok) {
      setLoading("");
      setMessage(saveBody.error ?? "Draft save failed");
      return;
    }
    const response = await fetch(`/api/v1/documents/${document.id}/render`, { method: "POST" });
    const body = await response.json();
    setLoading("");
    setMessage(response.ok ? "PDF generated. Review, approve, issue, or download below." : body.error ?? "PDF generation failed");
    if (response.ok) router.refresh();
  }

  return (
    <div className="space-y-5">
      {missingVariables.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Missing data: {missingVariables.join(", ")}. Edit the draft before final PDF generation.
        </div>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-2">
        <label>
          <span className="label">Editable letter draft</span>
          <textarea className="input min-h-[560px] font-mono text-sm" value={html} onChange={(event) => setHtml(event.target.value)} />
        </label>
        <div>
          <div className="label">Live preview</div>
          <div className="min-h-[560px] rounded-xl border border-slate-200 bg-white p-6 shadow-inner">
            <div className="max-w-none text-sm leading-7 text-slate-800" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      </div>
      {message ? <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-outline" onClick={saveDraft} disabled={Boolean(loading)}>
          {loading === "save" ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
          Save draft
        </button>
        <button type="button" className="btn-primary" onClick={renderPdf} disabled={Boolean(loading)}>
          {loading === "render" ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
          Generate PDF
        </button>
        {document.fileAssetId ? <a className="btn-gold" href={`/api/v1/files/${document.fileAssetId}/download`}>Download PDF</a> : null}
        <Link className="btn-outline" href={`/app/projects/${projectId}/plots/${plotId}?tab=documents`}>Back to documents</Link>
      </div>
    </div>
  );
}
