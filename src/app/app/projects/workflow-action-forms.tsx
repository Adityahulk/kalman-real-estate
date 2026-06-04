"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bold, CheckCircle2, Download, Eye, FileText, Italic, Loader2, Save, Send, Underline, Wand2 } from "lucide-react";

type ProjectInfo = {
  id: string;
  name: string;
  city: string;
  address: string | null;
  reraNumber: string | null;
  landAreaSqft: string | null;
  siteContactPhone: string | null;
  progressPct: number;
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
  const [reraNumber, setReraNumber] = useState(project.reraNumber ?? "");
  const [landAreaSqft, setLandAreaSqft] = useState(project.landAreaSqft ?? "");
  const [siteContactPhone, setSiteContactPhone] = useState(project.siteContactPhone ?? "");
  const [progressPct, setProgressPct] = useState(String(project.progressPct));
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
        reraNumber: reraNumber || undefined,
        landAreaSqft: landAreaSqft ? Number(landAreaSqft) : undefined,
        siteContactPhone: siteContactPhone || undefined,
        progressPct: Number(progressPct),
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
          <span className="label">RERA number / ID</span>
          <input className="input" value={reraNumber} onChange={(event) => setReraNumber(event.target.value)} />
        </label>
        <label>
          <span className="label">Site contact phone</span>
          <input className="input" value={siteContactPhone} onChange={(event) => setSiteContactPhone(event.target.value)} />
        </label>
        <label>
          <span className="label">Land area sq ft</span>
          <input className="input" inputMode="decimal" value={landAreaSqft} onChange={(event) => setLandAreaSqft(event.target.value)} />
        </label>
        <label>
          <span className="label">Progress %</span>
          <input className="input" inputMode="numeric" value={progressPct} onChange={(event) => setProgressPct(event.target.value)} />
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
  document: letter,
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
  const editorRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<"save" | "render" | "">("");
  const [dirty, setDirty] = useState(false);

  function currentHtml() {
    return editorRef.current?.innerHTML ?? letter.editableHtml ?? "";
  }

  function format(command: "bold" | "italic" | "underline") {
    editorRef.current?.focus();
    globalThis.document.execCommand(command);
    setDirty(true);
  }

  async function saveDraft() {
    setLoading("save");
    setMessage("");
    const response = await fetch(`/api/v1/documents/${letter.id}/draft`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ editableHtml: currentHtml() }),
    });
    const body = await response.json();
    setLoading("");
    setMessage(response.ok ? "Draft saved." : body.error ?? "Draft save failed");
    if (response.ok) {
      setDirty(false);
      router.refresh();
    }
  }

  async function renderPdf() {
    setLoading("render");
    setMessage("");
    const saveResponse = await fetch(`/api/v1/documents/${letter.id}/draft`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ editableHtml: currentHtml() }),
    });
    const saveBody = await saveResponse.json();
    if (!saveResponse.ok) {
      setLoading("");
      setMessage(saveBody.error ?? "Draft save failed");
      return;
    }
    const response = await fetch(`/api/v1/documents/${letter.id}/render`, { method: "POST" });
    const body = await response.json();
    setLoading("");
    setMessage(response.ok ? "PDF generated. Review, approve, issue, or download below." : body.error ?? "PDF generation failed");
    if (response.ok) {
      setDirty(false);
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Letter Studio</div>
            <h2 className="mt-1 text-lg font-semibold text-navy-900">{letter.number ?? letter.type.replaceAll("_", " ")}</h2>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              <span className="chip bg-slate-100 text-slate-700">{letter.status.replaceAll("_", " ")}</span>
              {dirty ? <span className="chip bg-amber-50 text-amber-800">Unsaved changes</span> : null}
              {missingVariables.length ? <span className="chip bg-amber-50 text-amber-800">{missingVariables.length} blank fields</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline h-9 px-3 text-xs" onClick={() => format("bold")}>
              <Bold size={14} />
              Bold
            </button>
            <button type="button" className="btn-outline h-9 px-3 text-xs" onClick={() => format("italic")}>
              <Italic size={14} />
              Italic
            </button>
            <button type="button" className="btn-outline h-9 px-3 text-xs" onClick={() => format("underline")}>
              <Underline size={14} />
              Underline
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-inner md:p-5">
          <div className="sticky top-16 z-10 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
            <div>
              <div className="text-sm font-semibold text-navy-900">Edit the letter directly</div>
              <div className="text-xs text-slate-500">Click inside the paper, change text, then save and regenerate the PDF preview.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-outline h-9 px-3 text-xs" onClick={saveDraft} disabled={Boolean(loading)}>
                {loading === "save" ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                Save
              </button>
              <button type="button" className="btn-primary h-9 px-3 text-xs" onClick={renderPdf} disabled={Boolean(loading)}>
                {loading === "render" ? <Loader2 className="animate-spin" size={14} /> : <Eye size={14} />}
                Generate PDF preview
              </button>
            </div>
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="letter-paper-editor"
            onInput={() => setDirty(true)}
            dangerouslySetInnerHTML={{ __html: letter.editableHtml ?? "" }}
          />
        </section>

        <aside className="space-y-5">
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <FileText size={17} />
              <h2 className="font-semibold">PDF preview</h2>
            </div>
            {letter.fileAssetId ? (
              <div className="p-4">
                <iframe title="Generated PDF preview" className="h-[540px] w-full rounded-lg border border-slate-200 bg-white" src={`/api/v1/files/${letter.fileAssetId}/download`} />
                <a className="btn-gold mt-3 w-full justify-center" href={`/api/v1/files/${letter.fileAssetId}/download`}>
                  <Download size={17} />
                  Download PDF
                </a>
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-slate-500">
                <FileText className="mx-auto mb-3 text-slate-400" />
                Generate the PDF preview after reviewing the paper draft.
              </div>
            )}
          </div>

          {missingVariables.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-semibold">Blank data to review</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {missingVariables.slice(0, 16).map((variable) => (
                  <span key={variable} className="rounded-full bg-white/80 px-2.5 py-1 text-xs text-amber-900">{variable}</span>
                ))}
                {missingVariables.length > 16 ? <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs text-amber-900">+{missingVariables.length - 16} more</span> : null}
              </div>
            </div>
          ) : null}

          {message ? <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}

          <div className="card p-4">
            <div className="grid gap-2">
              <button type="button" className="btn-outline justify-center" onClick={saveDraft} disabled={Boolean(loading)}>
                {loading === "save" ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                Save draft
              </button>
              <button type="button" className="btn-primary justify-center" onClick={renderPdf} disabled={Boolean(loading)}>
                {loading === "render" ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
                Generate PDF
              </button>
              <Link className="btn-outline justify-center" href={`/app/projects/${projectId}/plots/${plotId}?tab=documents`}>Back to documents</Link>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        .letter-paper-editor {
          display: grid;
          gap: 28px;
          outline: none;
        }
        .letter-paper-editor [data-template="ambey-allotment"] {
          display: grid;
          gap: 28px;
        }
        .letter-paper-editor section[data-ambey-page] {
          width: min(100%, 794px);
          min-height: 1123px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid #dbe3ee;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
          padding: 74px 86px;
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 14px;
          line-height: 1.55;
        }
        .letter-paper-editor section[data-ambey-page="1"],
        .letter-paper-editor section[data-ambey-page="2"] {
          padding-top: 180px;
        }
        .letter-paper-editor h1,
        .letter-paper-editor h2,
        .letter-paper-editor h3 {
          margin: 0 0 14px;
          color: #111827;
          font-weight: 700;
          text-align: center;
        }
        .letter-paper-editor p {
          margin: 0 0 12px;
        }
        .letter-paper-editor .right {
          text-align: right;
        }
        .letter-paper-editor .center {
          text-align: center;
        }
        .letter-paper-editor .muted {
          color: #475569;
        }
        .letter-paper-editor .photo-box,
        .letter-paper-editor .site-plan-box {
          display: grid;
          min-height: 210px;
          place-items: center;
          border: 1px solid #94a3b8;
          color: #64748b;
        }
        .letter-paper-editor table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
        }
        .letter-paper-editor th,
        .letter-paper-editor td {
          border: 1px solid #475569;
          padding: 8px 10px;
          vertical-align: top;
        }
        .letter-paper-editor .plain th,
        .letter-paper-editor .plain td {
          border: 0;
          padding: 4px 0;
        }
        .letter-paper-editor ol,
        .letter-paper-editor ul {
          padding-left: 22px;
        }
        .letter-paper-editor li {
          margin-bottom: 8px;
        }
        @media (max-width: 720px) {
          .letter-paper-editor section[data-ambey-page] {
            min-height: 0;
            padding: 36px 24px;
            font-size: 13px;
          }
          .letter-paper-editor section[data-ambey-page="1"],
          .letter-paper-editor section[data-ambey-page="2"] {
            padding-top: 82px;
          }
        }
      `}</style>
    </div>
  );
}
