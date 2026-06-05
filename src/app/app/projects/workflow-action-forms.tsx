"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Bold, CheckCircle2, Download, Eye, FileText, Italic, Loader2, Save, Send, Underline, Wand2, X } from "lucide-react";

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
  missingVariables,
  backHref,
  eyebrow,
}: {
  document: {
    id: string;
    number: string | null;
    type: string;
    status: string;
    editableHtml: string | null;
    fileAssetId: string | null;
  };
  missingVariables: string[];
  backHref?: string;
  eyebrow?: string;
}) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState<"save" | "render" | "">("");
  const [approvalLoading, setApprovalLoading] = useState<"APPROVED" | "ISSUED" | "REJECTED" | "">("");
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<"edit" | "preview">(letter.fileAssetId ? "preview" : "edit");
  const [draftHtml, setDraftHtml] = useState(letter.editableHtml ?? "");
  const [fileAssetId, setFileAssetId] = useState(letter.fileAssetId);
  const [status, setStatus] = useState(letter.status);
  const [missingOpen, setMissingOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function currentHtml() {
    return editorRef.current?.innerHTML ?? draftHtml;
  }

  function format(command: "bold" | "italic" | "underline") {
    editorRef.current?.focus();
    globalThis.document.execCommand(command);
    setDirty(true);
  }

  async function saveDraft() {
    setLoading("save");
    setMessage(null);
    const editableHtml = currentHtml();
    const response = await fetch(`/api/v1/documents/${letter.id}/draft`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ editableHtml }),
    });
    const body = await response.json();
    setLoading("");
    setMessage(response.ok ? { kind: "success", text: "Draft saved." } : { kind: "error", text: body.error ?? "Draft save failed" });
    if (response.ok) {
      setDraftHtml(editableHtml);
      setDirty(false);
      router.refresh();
    }
  }

  async function renderPdf() {
    setLoading("render");
    setMessage(null);
    const editableHtml = currentHtml();
    const saveResponse = await fetch(`/api/v1/documents/${letter.id}/draft`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ editableHtml }),
    });
    const saveBody = await saveResponse.json();
    if (!saveResponse.ok) {
      setLoading("");
      setMessage({ kind: "error", text: saveBody.error ?? "Draft save failed" });
      return;
    }
    const response = await fetch(`/api/v1/documents/${letter.id}/render`, { method: "POST" });
    const body = await response.json();
    setLoading("");
    setMessage(response.ok ? { kind: "success", text: "PDF generated. Preview is ready." } : { kind: "error", text: body.error ?? "PDF generation failed" });
    if (response.ok) {
      setDraftHtml(editableHtml);
      setDirty(false);
      setFileAssetId(body.data?.file?.id ?? body.data?.document?.fileAssetId ?? fileAssetId);
      setStatus(body.data?.document?.status ?? "GENERATED");
      setView("preview");
      router.refresh();
    }
  }

  function openPreview() {
    setDraftHtml(currentHtml());
    setView("preview");
  }

  async function decide(nextStatus: "APPROVED" | "ISSUED" | "REJECTED") {
    if ((nextStatus === "APPROVED" || nextStatus === "ISSUED") && !fileAssetId) return;
    setApprovalLoading(nextStatus);
    setMessage(null);
    const endpoint = nextStatus === "REJECTED" ? "reject" : "approve";
    const response = await fetch(`/api/v1/documents/${letter.id}/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus, notes: nextStatus }),
    });
    const body = await response.json();
    setApprovalLoading("");
    if (!response.ok) {
      setMessage({ kind: "error", text: body.error ?? "Document update failed" });
      return;
    }
    setStatus(body.data?.status ?? nextStatus);
    setMessage({ kind: "success", text: `Document ${nextStatus.toLowerCase()}.` });
    router.refresh();
  }

  const groupedMissing = groupMissingVariables(missingVariables);
  const documentTitle = letter.number ?? letter.type.replaceAll("_", " ");
  const canIssue = Boolean(fileAssetId);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100">
      <div className="sticky top-16 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-3 px-4 py-3 lg:px-6">
          <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                {backHref ? (
                  <Link className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-navy-900" href={backHref}>
                    <ArrowLeft size={16} />
                    Back
                  </Link>
                ) : null}
                {eyebrow ? <span className="text-sm text-slate-500">{eyebrow}</span> : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold text-navy-900 md:text-xl">{documentTitle}</h1>
                <span className="chip bg-slate-100 text-slate-700">{status.replaceAll("_", " ")}</span>
                {dirty ? <span className="chip bg-amber-50 text-amber-800">Unsaved changes</span> : null}
                {missingVariables.length ? (
                  <button type="button" className="chip bg-amber-50 text-amber-800" onClick={() => setMissingOpen((value) => !value)}>
                    <AlertCircle size={13} />
                    {missingVariables.length} blank fields
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
                <button type="button" className={`px-3 py-2 font-medium ${view === "edit" ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-50"}`} onClick={() => setView("edit")}>
                  Edit Draft
                </button>
                <button type="button" className={`px-3 py-2 font-medium ${view === "preview" ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-50"}`} onClick={openPreview}>
                  PDF Preview
                </button>
              </div>
              <button type="button" className="btn-outline h-9 px-3 text-xs" onClick={() => format("bold")} disabled={view !== "edit"}>
                <Bold size={14} />
              </button>
              <button type="button" className="btn-outline h-9 px-3 text-xs" onClick={() => format("italic")} disabled={view !== "edit"}>
                <Italic size={14} />
              </button>
              <button type="button" className="btn-outline h-9 px-3 text-xs" onClick={() => format("underline")} disabled={view !== "edit"}>
                <Underline size={14} />
              </button>
              <button type="button" className="btn-outline h-9 px-3 text-xs" onClick={saveDraft} disabled={Boolean(loading)}>
                {loading === "save" ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                Save
              </button>
              <button type="button" className="btn-primary h-9 px-3 text-xs" onClick={renderPdf} disabled={Boolean(loading)}>
                {loading === "render" ? <Loader2 className="animate-spin" size={14} /> : <Eye size={14} />}
                Generate PDF
              </button>
              {fileAssetId ? (
                <a className="btn-gold h-9 px-3 text-xs" href={`/api/v1/files/${fileAssetId}/download`}>
                  <Download size={14} />
                  Download
                </a>
              ) : (
                <button type="button" className="btn-gold h-9 px-3 text-xs opacity-50" disabled>
                  <Download size={14} />
                  Download
                </button>
              )}
              <button type="button" className="btn-outline h-9 px-3 text-xs" disabled={!canIssue || Boolean(approvalLoading)} onClick={() => decide("APPROVED")}>
                {approvalLoading === "APPROVED" ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                Approve
              </button>
              <button type="button" className="btn-outline h-9 px-3 text-xs" disabled={!canIssue || Boolean(approvalLoading)} onClick={() => decide("ISSUED")}>
                Issue
              </button>
              <button type="button" className="btn-outline h-9 px-3 text-xs" disabled={Boolean(approvalLoading)} onClick={() => decide("REJECTED")}>
                {approvalLoading === "REJECTED" ? <Loader2 className="animate-spin" size={14} /> : <X size={14} />}
                Reject
              </button>
            </div>
          </div>

          {message ? (
            <div className={`rounded-lg px-3 py-2 text-sm ${message.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {message.text}
            </div>
          ) : null}

          {missingOpen ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="font-semibold">Blank data to review</div>
                <button type="button" className="rounded-lg p-1 hover:bg-white/70" onClick={() => setMissingOpen(false)} aria-label="Close missing fields">
                  <X size={16} />
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {groupedMissing.map((group) => (
                  <div key={group.label} className="rounded-lg bg-white/75 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-900">{group.label}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {group.items.map((variable) => (
                        <span key={variable} className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-900">{variable}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[1480px] px-4 py-6 lg:px-6">
        {!mounted ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-card">
            Opening letter studio...
          </section>
        ) : view === "edit" ? (
          <section className="rounded-2xl border border-slate-200 bg-slate-200/70 p-3 shadow-inner md:p-6">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              suppressHydrationWarning
              className="letter-paper-editor"
              onInput={() => setDirty(true)}
              dangerouslySetInnerHTML={{ __html: draftHtml }}
            />
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            {fileAssetId ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <span className="font-medium">PDF file is ready. Review the paper below, then download or issue it.</span>
                  <div className="flex flex-wrap gap-2">
                    <a className="btn-outline h-9 px-3 text-xs" href={`/api/v1/files/${fileAssetId}/download?disposition=inline`} target="_blank" rel="noreferrer">
                      <Eye size={14} />
                      Open PDF
                    </a>
                    <a className="btn-gold h-9 px-3 text-xs" href={`/api/v1/files/${fileAssetId}/download`}>
                      <Download size={14} />
                      Download
                    </a>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-200/70 p-3 shadow-inner md:p-6">
                  <div className="letter-paper-editor letter-paper-preview" dangerouslySetInnerHTML={{ __html: draftHtml }} />
                </div>
              </div>
            ) : (
              <div className="grid min-h-[520px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <div>
                  <FileText className="mx-auto mb-3 text-slate-400" size={36} />
                  <h2 className="font-semibold text-navy-900">No PDF preview yet</h2>
                  <p className="mt-2 max-w-sm text-sm text-slate-500">Generate the PDF after reviewing the draft. The preview will open here automatically.</p>
                  <button type="button" className="btn-primary mx-auto mt-4" onClick={renderPdf} disabled={Boolean(loading)}>
                    {loading === "render" ? <Loader2 className="animate-spin" size={17} /> : <Eye size={17} />}
                    Generate PDF
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

    </div>
  );
}

function groupMissingVariables(missingVariables: string[]) {
  const groups = [
    { label: "Owner", items: [] as string[] },
    { label: "Plot", items: [] as string[] },
    { label: "Project / RERA", items: [] as string[] },
    { label: "Stamp / Legal", items: [] as string[] },
    { label: "Firm", items: [] as string[] },
    { label: "Other", items: [] as string[] },
  ];

  for (const variable of missingVariables) {
    const lower = variable.toLowerCase();
    if (lower.startsWith("owner.")) groups[0].items.push(variable);
    else if (lower.startsWith("plot.")) groups[1].items.push(variable);
    else if (lower.startsWith("project.") || lower.startsWith("rera.")) groups[2].items.push(variable);
    else if (lower.startsWith("stamp.") || lower.includes("registry") || lower.includes("legal")) groups[3].items.push(variable);
    else if (lower.startsWith("firm.") || lower.startsWith("tenant.")) groups[4].items.push(variable);
    else groups[5].items.push(variable);
  }

  return groups.filter((group) => group.items.length);
}
