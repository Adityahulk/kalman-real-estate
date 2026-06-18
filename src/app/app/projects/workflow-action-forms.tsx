"use client";

import Link from "next/link";
import { ClipboardEvent, FormEvent, RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Bold, CheckCircle2, Download, Eye, FileText, Italic, Loader2, Plus, Save, Send, Trash2, Underline, Wand2, X } from "lucide-react";
import { sanitizePastedHtml } from "@/lib/sanitize-pasted-html";

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
  areaSqYards: string | null;
  areaSqft?: string | null;
  priceInr: string | null;
  dimensions?: string | null;
  currentOwnerId?: string | null;
  boundaries?: {
    north?: string | null;
    northDimension?: string | null;
    south?: string | null;
    southDimension?: string | null;
    east?: string | null;
    eastDimension?: string | null;
    west?: string | null;
    westDimension?: string | null;
  } | null;
};

type FirmInfo = {
  name: string;
  address: string | null;
  pan: string | null;
  contactEmail: string | null;
  contactPhone?: string | null;
  authorizedPersons: string[];
};

type StoredFileRef = {
  id: string;
  fileName: string;
};

type PaymentEntry = {
  mode: "Cash" | "Cheque" | "Bank transfer" | "UPI" | "Other";
  amount: string;
  reference: string;
  files?: File[];
  uploadedFiles?: StoredFileRef[];
};

type AllotteeDocumentEntry = {
  kind: "Aadhaar" | "PAN" | "DL" | "Other";
  number: string;
  files?: File[];
  uploadedFiles?: StoredFileRef[];
};

type StampEntry = {
  number: string;
  dated: string;
};

type WitnessEntry = {
  name: string;
  aadhaar: string;
  address: string;
};

type AdditionalFieldEntry = {
  label: string;
  inputType: "TEXT" | "FILE";
  value: string;
  files?: File[];
  uploadedFiles?: StoredFileRef[];
};

type InitialAllotmentData = {
  ownerId?: string;
  name: string;
  address: string;
  phone: string;
  selectedAuthorizedPerson: string;
  totalAreaPrice: string;
  perUnitPrice: string;
  paymentEntries: PaymentEntry[];
  effectiveAt: string;
  stamps: StampEntry[];
  witnesses: WitnessEntry[];
  allotteeDocuments: AllotteeDocumentEntry[];
  extraFields: AdditionalFieldEntry[];
  letterFields: Record<string, string>;
  letterFieldUploadedFiles: Record<string, StoredFileRef[]>;
};

type ManualLetterField = {
  key: string;
  label: string;
  inputType?: "TEXT" | "FILE";
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
  firm,
  defaultPlotId,
  manualLetterFields = [],
  initialData,
}: {
  projectId: string;
  plots: PlotOption[];
  firm: FirmInfo;
  defaultPlotId?: string;
  manualLetterFields?: ManualLetterField[];
  initialData?: InitialAllotmentData;
}) {
  const router = useRouter();
  const [plotId, setPlotId] = useState(defaultPlotId && plots.some((plot) => plot.id === defaultPlotId) ? defaultPlotId : "");
  const [name, setName] = useState(initialData?.name ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [allotteeDocuments, setAllotteeDocuments] = useState<AllotteeDocumentEntry[]>(
    initialData?.allotteeDocuments?.length ? initialData.allotteeDocuments : [{ kind: "Aadhaar", number: "", files: [], uploadedFiles: [] }],
  );
  const [selectedAuthorizedPerson, setSelectedAuthorizedPerson] = useState(initialData?.selectedAuthorizedPerson ?? firm.authorizedPersons[0] ?? "");
  const [totalAreaPrice, setTotalAreaPrice] = useState(initialData?.totalAreaPrice ?? "");
  const [perUnitPrice, setPerUnitPrice] = useState(initialData?.perUnitPrice ?? "");
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>(
    initialData?.paymentEntries?.length ? initialData.paymentEntries : [{ mode: "Cash", amount: "", reference: "", files: [], uploadedFiles: [] }],
  );
  const [effectiveAt, setEffectiveAt] = useState(initialData?.effectiveAt ?? new Date().toISOString().slice(0, 10));
  const [stamps, setStamps] = useState<StampEntry[]>(initialData?.stamps?.length ? initialData.stamps : [{ number: "", dated: new Date().toISOString().slice(0, 10) }]);
  const [witnesses, setWitnesses] = useState<WitnessEntry[]>(initialData?.witnesses?.length ? initialData.witnesses : [{ name: "", aadhaar: "", address: "" }]);
  const [extraFields, setExtraFields] = useState<AdditionalFieldEntry[]>(initialData?.extraFields ?? []);
  const [letterFields, setLetterFields] = useState<Record<string, string>>(initialData?.letterFields ?? {});
  const [letterFieldFiles, setLetterFieldFiles] = useState<Record<string, File[]>>({});
  const [letterFieldUploadedFiles, setLetterFieldUploadedFiles] = useState<Record<string, StoredFileRef[]>>(initialData?.letterFieldUploadedFiles ?? {});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedPlot = useMemo(() => plots.find((plot) => plot.id === plotId), [plotId, plots]);
  const calculatedFromUnitPrice = Number(perUnitPrice || 0) * Number(selectedPlot?.areaSqYards || 0);
  const calculatedPrice = Number(totalAreaPrice || 0) || calculatedFromUnitPrice;
  const paymentTotal = paymentEntries.reduce((total, entry) => total + Number(entry.amount || 0), 0);
  const restoreKey = `widestate:new-allotment:${projectId}`;

  useEffect(() => {
    if (!selectedAuthorizedPerson && firm.authorizedPersons.length) setSelectedAuthorizedPerson(firm.authorizedPersons[0]);
  }, [firm.authorizedPersons, selectedAuthorizedPerson]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("restore")) return;
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(restoreKey) ?? "{}") as Partial<{
        plotId: string; name: string; address: string; phone: string; selectedAuthorizedPerson: string; totalAreaPrice: string; perUnitPrice: string;
        paymentEntries: Array<Pick<PaymentEntry, "mode" | "amount" | "reference" | "uploadedFiles">>;
        effectiveAt: string; stamps: StampEntry[]; witnesses: WitnessEntry[]; allotteeDocuments: Array<Pick<AllotteeDocumentEntry, "kind" | "number" | "uploadedFiles">>;
        extraFields: AdditionalFieldEntry[]; letterFields: Record<string, string>; letterFieldUploadedFiles: Record<string, StoredFileRef[]>;
      }>;
      if (saved.plotId) setPlotId(saved.plotId);
      if (saved.name) setName(saved.name);
      if (saved.address) setAddress(saved.address);
      if (saved.phone) setPhone(saved.phone);
      if (saved.selectedAuthorizedPerson) setSelectedAuthorizedPerson(saved.selectedAuthorizedPerson);
      if (saved.totalAreaPrice) setTotalAreaPrice(saved.totalAreaPrice);
      if (saved.perUnitPrice) setPerUnitPrice(saved.perUnitPrice);
      if (Array.isArray(saved.paymentEntries) && saved.paymentEntries.length) setPaymentEntries(saved.paymentEntries.map((entry) => ({ ...entry, files: [], uploadedFiles: entry.uploadedFiles ?? [] })));
      if (saved.effectiveAt) setEffectiveAt(saved.effectiveAt);
      if (Array.isArray(saved.stamps) && saved.stamps.length) setStamps(saved.stamps);
      if (Array.isArray(saved.witnesses) && saved.witnesses.length) setWitnesses(saved.witnesses);
      if (Array.isArray(saved.allotteeDocuments) && saved.allotteeDocuments.length) setAllotteeDocuments(saved.allotteeDocuments.map((entry) => ({ ...entry, files: [], uploadedFiles: entry.uploadedFiles ?? [] })));
      if (Array.isArray(saved.extraFields)) {
        setExtraFields(saved.extraFields.map((field) => ({
          label: field.label ?? "",
          inputType: field.inputType === "FILE" ? "FILE" : "TEXT",
          value: field.value ?? "",
          files: [],
          uploadedFiles: field.uploadedFiles ?? [],
        })));
      }
      if (saved.letterFields) setLetterFields(saved.letterFields);
      if (saved.letterFieldUploadedFiles) setLetterFieldUploadedFiles(saved.letterFieldUploadedFiles);
    } catch {
      // Ignore invalid local restore data.
    }
  }, [restoreKey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plotId) return;
    const restorePayload = {
      plotId,
      name,
      address,
      phone,
      selectedAuthorizedPerson,
      totalAreaPrice,
      perUnitPrice,
      paymentEntries: paymentEntries.map(({ mode, amount, reference }) => ({ mode, amount, reference })),
      effectiveAt,
      stamps,
      witnesses,
      allotteeDocuments: allotteeDocuments.map(({ kind, number }) => ({ kind, number })),
      extraFields: extraFields.map(({ label, inputType, value, uploadedFiles }) => ({ label, inputType, value, uploadedFiles })),
      letterFields,
      letterFieldUploadedFiles,
    };
    if (typeof window !== "undefined") window.sessionStorage.setItem(restoreKey, JSON.stringify(restorePayload));
    setLoading(true);
    setMessage("");
    const ownerResponse = await fetch(initialData?.ownerId ? `/api/v1/ownership/owners/${initialData.ownerId}` : "/api/v1/ownership/owners", {
      method: initialData?.ownerId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "INDIVIDUAL",
        name,
        phone: phone || undefined,
        address: address || undefined,
        kyc: {
          aadhaarNo: firstDocumentNumber(allotteeDocuments, "Aadhaar"),
          panNo: firstDocumentNumber(allotteeDocuments, "PAN"),
          dlNo: firstDocumentNumber(allotteeDocuments, "DL"),
          documents: allotteeDocuments.filter((entry) => entry.number).map((entry) => ({ kind: entry.kind, number: entry.number })),
        },
      }),
    });
    const ownerBody = await ownerResponse.json();
    if (!ownerResponse.ok) {
      setLoading(false);
      setMessage(ownerBody.error ?? "Allottee creation failed");
      return;
    }

    try {
      const ownerId = ownerBody.data.id as string;
      const uploadedAllotteeDocs = await uploadDocumentGroups(
        allotteeDocuments.map((entry, index) => ({
          group: `${entry.kind}-${index + 1}`,
          files: entry.files ?? [],
          ownerType: "Owner",
          ownerId,
          categoryKey: "allottee-kyc",
        })),
      );
      const uploadedPaymentDocs = await uploadDocumentGroups(
        paymentEntries.map((entry, index) => ({
          group: `${entry.mode}-${index + 1}`,
          files: entry.files ?? [],
          ownerType: "Plot",
          ownerId: plotId,
          categoryKey: "allotment-payment",
        })),
      );
      const uploadedManualFieldFiles = await uploadDocumentGroups(
        manualLetterFields
          .filter((field) => field.inputType === "FILE" && (letterFieldFiles[field.key]?.length ?? 0) > 0)
          .map((field) => ({
            group: `manual-${field.key}`,
            files: letterFieldFiles[field.key] ?? [],
            ownerType: "Plot",
            ownerId: plotId,
            categoryKey: `manual-letter-${field.key}`,
          })),
      );
      const uploadedAdditionalFiles = await uploadDocumentGroups(
        extraFields
          .filter((field) => field.inputType === "FILE" && field.label.trim() && (field.files?.length ?? 0) > 0)
          .map((field, index) => ({
            group: `${sanitizeFieldKey(field.label)}-${index + 1}`,
            files: field.files ?? [],
            ownerType: "Plot",
            ownerId: plotId,
            categoryKey: "allotment-extra",
          })),
      );
      const mergedAllotteeDocuments = allotteeDocuments
        .filter((entry) => entry.number || (entry.files?.length ?? 0) > 0 || (entry.uploadedFiles?.length ?? 0) > 0)
        .map((entry, index) => ({
          kind: entry.kind,
          number: entry.number || undefined,
          files: replaceOrKeepStoredFiles(
            entry.files,
            entry.uploadedFiles,
            uploadedAllotteeDocs.filter((file) => file.group === `${entry.kind}-${index + 1}`).map(({ group, ...file }) => file),
          ),
        }));
      const mergedPaymentEntries = paymentEntries
        .filter((entry) => entry.amount || entry.reference || (entry.files?.length ?? 0) > 0 || (entry.uploadedFiles?.length ?? 0) > 0)
        .map((entry, index) => ({
          mode: entry.mode,
          amount: entry.amount ? Number(entry.amount) : undefined,
          reference: entry.reference || undefined,
          files: replaceOrKeepStoredFiles(
            entry.files,
            entry.uploadedFiles,
            uploadedPaymentDocs.filter((file) => file.group === `${entry.mode}-${index + 1}`).map(({ group, ...file }) => file),
          ),
        }));
      const mergedAdditionalFields = extraFields
        .filter((field) => field.label.trim() && (field.inputType === "FILE" ? (field.files?.length ?? 0) > 0 || (field.uploadedFiles?.length ?? 0) > 0 : field.value.trim()))
        .map((field, index) => ({
          label: field.label.trim(),
          inputType: field.inputType,
          value: field.inputType === "TEXT" ? field.value.trim() || undefined : undefined,
          files: field.inputType === "FILE"
            ? replaceOrKeepStoredFiles(
                field.files,
                field.uploadedFiles,
                uploadedAdditionalFiles.filter((file) => file.group === `${sanitizeFieldKey(field.label)}-${index + 1}`).map(({ group, ...file }) => file),
              )
            : undefined,
        }));
      const mergedManualLetterFiles = Object.fromEntries(
        manualLetterFields
          .filter((field) => field.inputType === "FILE")
          .map((field) => [
            field.key,
            replaceOrKeepStoredFiles(
              letterFieldFiles[field.key],
              letterFieldUploadedFiles[field.key],
              uploadedManualFieldFiles.filter((file) => file.group === `manual-${field.key}`).map(({ group, ...file }) => file),
            ),
          ])
          .filter(([, files]) => (files as Array<unknown>).length),
      );

      const allotMethod = selectedPlot?.currentOwnerId ? "PATCH" : "POST";
      const response = await fetch(`/api/v1/ownership/plots/${plotId}/allot`, {
        method: allotMethod,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ownerId,
          amountInr: calculatedPrice || undefined,
          sharePct: 100,
          paymentMode: paymentEntries.map((entry) => entry.mode).filter((mode, index, modes) => modes.indexOf(mode) === index).join(", ") || undefined,
          effectiveAt: effectiveAt ? new Date(effectiveAt).toISOString() : undefined,
          extraDetails: {
            plot: selectedPlot ? {
              code: selectedPlot.code,
              areaSqYards: selectedPlot.areaSqYards,
              areaSqft: selectedPlot.areaSqft,
              dimensions: selectedPlot.dimensions,
              boundaries: selectedPlot.boundaries,
            } : undefined,
            allottee: {
              name,
              address: address || undefined,
              phone: phone || undefined,
              documents: mergedAllotteeDocuments,
            },
            firm: {
              name: firm.name,
              phone: firm.contactPhone || undefined,
              address: firm.address || undefined,
              authorizedPerson: selectedAuthorizedPerson || undefined,
            },
            pricing: {
              type: "TOTAL_AND_PER_UNIT",
              totalAreaPrice: totalAreaPrice ? Number(totalAreaPrice) : undefined,
              perUnitPrice: perUnitPrice ? Number(perUnitPrice) : undefined,
              unit: "square yard",
              calculatedPrice,
            },
            payments: mergedPaymentEntries,
            eStampNumber: stamps.find((entry) => entry.number)?.number || undefined,
            eStampDate: stamps.find((entry) => entry.dated)?.dated || undefined,
            witnessDetails: witnesses.filter((entry) => entry.name).map((entry) => entry.name).join(", ") || undefined,
            stamps: stamps.filter((entry) => entry.number || entry.dated),
            witnesses: witnesses.filter((entry) => entry.name || entry.aadhaar || entry.address).map((entry) => ({
              name: entry.name || undefined,
              aadhaar: entry.aadhaar || undefined,
              address: entry.address || undefined,
            })),
            customLetterFields: letterFields,
            customLetterFiles: Object.fromEntries(
              Object.entries(mergedManualLetterFiles),
            ),
            additionalFields: mergedAdditionalFields,
            customFields: Object.fromEntries(mergedAdditionalFields.filter((field) => field.inputType === "TEXT").map((field) => [field.label, field.value ?? ""])),
          },
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setLoading(false);
        setMessage(body.error ?? "Allotment failed");
        return;
      }
      const draftResponse = await fetch("/api/v1/documents/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "allotment_letter",
          recordType: "Plot",
          recordId: plotId,
          data: {
            customLetterFields: letterFields,
            customLetterFiles: mergedManualLetterFiles,
          },
        }),
      });
      const draftBody = await draftResponse.json();
      setLoading(false);
      if (!draftResponse.ok) {
        setMessage(draftBody.error ?? `Plot ${body.data.plot.code} allotted, but Letter Studio could not be opened.`);
        router.refresh();
        return;
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(restoreKey, JSON.stringify({
          ...restorePayload,
          allotteeDocuments: mergedAllotteeDocuments.map((entry) => ({ kind: entry.kind, number: entry.number ?? "", uploadedFiles: entry.files })),
          paymentEntries: mergedPaymentEntries.map((entry) => ({ mode: entry.mode, amount: entry.amount ? String(entry.amount) : "", reference: entry.reference ?? "", uploadedFiles: entry.files })),
          extraFields: mergedAdditionalFields.map((field) => ({
            label: field.label,
            inputType: field.inputType,
            value: field.value ?? "",
            uploadedFiles: field.files ?? [],
          })),
          letterFieldUploadedFiles: mergedManualLetterFiles,
        }));
      }
      const returnTo = `/app/projects/${projectId}/ownership/new-allotment?plotId=${encodeURIComponent(plotId)}${initialData ? "&edit=1" : ""}&restore=1`;
      router.push(`/app/projects/${projectId}/plots/${plotId}/letters/${draftBody.data.document.id}?returnTo=${encodeURIComponent(returnTo)}`);
    } catch (error) {
      setLoading(false);
      setMessage(error instanceof Error ? error.message : "Could not finish the allotment workflow.");
    }
  }

  if (!plots.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-600">
        <p>No company-owned plots are available for allotment.</p>
        <Link className="btn-primary mt-4 w-fit" href={`/app/projects/${projectId}/ownership/add-plot`}><Plus size={17} />Add plot</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <FormSection number="1" title="Plot details">
        <div className="flex items-end gap-3">
          <label className="flex-1">
            <span className="label">Available plot</span>
            <select className="input" value={plotId} onChange={(event) => setPlotId(event.target.value)}>
              <option value="">Select plot</option>
              {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.code}{plot.areaSqYards ? ` · ${plot.areaSqYards} sq yd` : ""}</option>)}
            </select>
          </label>
          <Link className="btn-outline shrink-0" href={`/app/projects/${projectId}/ownership/add-plot`}><Plus size={17} />Plot</Link>
        </div>
        {selectedPlot ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-navy-950">Selected plot details</div>
              <Link className="btn-outline h-8 px-3 text-xs" href={`/app/projects/${projectId}/plots/${selectedPlot.id}/edit`}>Edit plot details</Link>
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <div><span className="font-medium text-slate-900">Plot code:</span> {selectedPlot.code}</div>
              <div><span className="font-medium text-slate-900">Plot area:</span> {selectedPlot.areaSqYards ? `${selectedPlot.areaSqYards} sq yd` : selectedPlot.areaSqft ? `${selectedPlot.areaSqft} sq ft` : "-"}</div>
              <div><span className="font-medium text-slate-900">Dimensions:</span> {selectedPlot.dimensions || "-"}</div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(["north", "south", "east", "west"] as const).map((direction) => (
                <div key={direction} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                  <div className="font-medium capitalize text-slate-900">{direction}</div>
                  <div className="mt-1 text-slate-600">{selectedPlot.boundaries?.[direction] || "-"}</div>
                  <div className="mt-1 text-xs text-slate-500">Dimension: {selectedPlot.boundaries?.[`${direction}Dimension` as const] || "-"}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </FormSection>

      <FormSection number="2" title="Allottee details">
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className="label">Name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} required /></label>
          <label><span className="label">Phone</span><input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <label className="md:col-span-2"><span className="label">Address</span><textarea className="input min-h-20" value={address} onChange={(event) => setAddress(event.target.value)} /></label>
        </div>
        <div className="mt-4 space-y-3">
          {allotteeDocuments.map((entry, index) => (
            <div className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[0.8fr_1fr_1fr_auto]" key={`${entry.kind}-${index}`}>
              <label><span className="label">Document</span><select className="input" value={entry.kind} onChange={(event) => setAllotteeDocuments((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, kind: event.target.value as AllotteeDocumentEntry["kind"] } : item))}><option>Aadhaar</option><option>PAN</option><option>DL</option><option>Other</option></select></label>
              <label><span className="label">Number</span><input className="input" value={entry.number} onChange={(event) => setAllotteeDocuments((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, number: event.target.value } : item))} /></label>
              <label><span className="label">Upload documents</span><input className="input pt-2" type="file" multiple onChange={(event) => setAllotteeDocuments((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, files: Array.from(event.target.files ?? []) } : item))} /></label>
              <button type="button" className="btn-outline self-end px-3" disabled={allotteeDocuments.length === 1} onClick={() => setAllotteeDocuments((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={16} /></button>
              {displayFileNames(entry.files, entry.uploadedFiles) ? <div className="md:col-span-4 text-xs text-slate-500">{displayFileNames(entry.files, entry.uploadedFiles)}</div> : null}
            </div>
          ))}
        </div>
        <button type="button" className="btn-outline mt-3 w-fit" onClick={() => setAllotteeDocuments((items) => [...items, { kind: "Aadhaar", number: "", files: [] }])}><Plus size={16} />Add document</button>
      </FormSection>

      <FormSection number="3" title="Firm details">
        <div className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
          <FirmValue label="Firm name" value={firm.name} />
          <FirmValue label="Phone" value={firm.contactPhone ?? null} />
          <FirmValue label="Email" value={firm.contactEmail} />
          <FirmValue label="PAN" value={firm.pan} />
          <FirmValue label="Address" value={firm.address} />
          <label className="md:col-span-2">
            <span className="label">Authorised person</span>
            <select className="input" value={selectedAuthorizedPerson} onChange={(event) => setSelectedAuthorizedPerson(event.target.value)}>
              {!firm.authorizedPersons.length ? <option value="">No authorised person added</option> : null}
              {firm.authorizedPersons.map((person) => <option key={person} value={person}>{person}</option>)}
            </select>
          </label>
        </div>
      </FormSection>

      <FormSection number="4" title="Payment">
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label><span className="label">Total price</span><input className="input" inputMode="decimal" value={totalAreaPrice} onChange={(event) => setTotalAreaPrice(event.target.value)} placeholder={calculatedFromUnitPrice ? String(calculatedFromUnitPrice) : ""} /></label>
            <label><span className="label">Per-unit price <span className="font-normal text-slate-400">(per square yard)</span></span><input className="input" inputMode="decimal" value={perUnitPrice} onChange={(event) => setPerUnitPrice(event.target.value)} /></label>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Final total price: INR {calculatedPrice.toLocaleString("en-IN")}{!totalAreaPrice && calculatedFromUnitPrice ? " (calculated from per-unit price and plot area)" : ""} · Payment entries: INR {paymentTotal.toLocaleString("en-IN")}</div>
          <div className="space-y-3">
            {paymentEntries.map((entry, index) => <div className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_1fr_1.4fr_auto]" key={index}>
              <label><span className="label">Mode</span><select className="input" value={entry.mode} onChange={(event) => setPaymentEntries((entries) => entries.map((item, itemIndex) => itemIndex === index ? { ...item, mode: event.target.value as PaymentEntry["mode"], reference: "" } : item))}><option>Cash</option><option>Cheque</option><option>Bank transfer</option><option>UPI</option><option>Other</option></select></label>
              <label><span className="label">Amount</span><input className="input" inputMode="decimal" value={entry.amount} onChange={(event) => setPaymentEntries((entries) => entries.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item))} /></label>
              <label><span className="label">{entry.mode === "Cheque" ? "Cheque number" : entry.mode === "Bank transfer" ? "Bank details / reference" : entry.mode === "UPI" ? "UPI ID" : entry.mode === "Other" ? "Payment details" : "Reference (optional)"}</span><input className="input" value={entry.reference} onChange={(event) => setPaymentEntries((entries) => entries.map((item, itemIndex) => itemIndex === index ? { ...item, reference: event.target.value } : item))} /></label>
              <button className="btn-outline self-end px-3" type="button" aria-label="Remove payment entry" disabled={paymentEntries.length === 1} onClick={() => setPaymentEntries((entries) => entries.filter((_, itemIndex) => itemIndex !== index))}><X size={16} /></button>
              <label className="md:col-span-4"><span className="label">Upload files</span><input className="input pt-2" type="file" multiple onChange={(event) => setPaymentEntries((entries) => entries.map((item, itemIndex) => itemIndex === index ? { ...item, files: Array.from(event.target.files ?? []) } : item))} /></label>
              {displayFileNames(entry.files, entry.uploadedFiles) ? <div className="md:col-span-4 text-xs text-slate-500">{displayFileNames(entry.files, entry.uploadedFiles)}</div> : null}
            </div>)}
          </div>
          <button className="btn-outline w-fit" type="button" onClick={() => setPaymentEntries((entries) => [...entries, { mode: "Cash", amount: "", reference: "", files: [] }])}><Plus size={16} />Add payment entry</button>
        </div>
      </FormSection>

      <FormSection number="5" title="Extra">
        <div className="grid gap-3 md:grid-cols-2">
          <label><span className="label">Date</span><input className="input" type="date" value={effectiveAt} onChange={(event) => setEffectiveAt(event.target.value)} /></label>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="label">Stamps</span>
              <button type="button" className="btn-outline h-8 px-3 text-xs" onClick={() => setStamps((items) => [...items, { number: "", dated: effectiveAt }])}><Plus size={14} />Add stamp</button>
            </div>
            <div className="space-y-3">
              {stamps.map((stamp, index) => (
                <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_1fr_auto]">
                  <label><span className="label">Number</span><input className="input" value={stamp.number} onChange={(event) => setStamps((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, number: event.target.value } : item))} /></label>
                  <label><span className="label">Dated</span><input className="input" type="date" value={stamp.dated} onChange={(event) => setStamps((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, dated: event.target.value } : item))} /></label>
                  <button type="button" className="btn-outline self-end px-3" disabled={stamps.length === 1} onClick={() => setStamps((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={16} /></button>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="label">Witness with details</span>
              <button type="button" className="btn-outline h-8 px-3 text-xs" onClick={() => setWitnesses((items) => [...items, { name: "", aadhaar: "", address: "" }])}><Plus size={14} />Add witness</button>
            </div>
            <div className="space-y-3">
              {witnesses.map((witness, index) => (
                <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-2">
                  <label><span className="label">Name</span><input className="input" value={witness.name} onChange={(event) => setWitnesses((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} /></label>
                  <label><span className="label">Aadhaar <span className="font-normal text-slate-400">(optional)</span></span><input className="input" value={witness.aadhaar} onChange={(event) => setWitnesses((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, aadhaar: event.target.value } : item))} /></label>
                  <label className="md:col-span-2"><span className="label">Address <span className="font-normal text-slate-400">(optional)</span></span><textarea className="input min-h-20" value={witness.address} onChange={(event) => setWitnesses((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, address: event.target.value } : item))} /></label>
                  <div className="md:col-span-2"><button type="button" className="btn-outline px-3" disabled={witnesses.length === 1} onClick={() => setWitnesses((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={16} /> Remove witness</button></div>
                </div>
              ))}
            </div>
          </div>
          {extraFields.map((field, index) => (
            <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:col-span-2 md:grid-cols-[1fr_180px_auto]">
              <input
                className="input"
                placeholder="Field name"
                value={field.label}
                onChange={(event) => setExtraFields((fields) => fields.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))}
              />
              <select
                className="input"
                value={field.inputType}
                onChange={(event) => {
                  const nextType = event.target.value === "FILE" ? "FILE" : "TEXT";
                  setExtraFields((fields) => fields.map((item, itemIndex) => {
                    if (itemIndex !== index) return item;
                    return {
                      ...item,
                      inputType: nextType,
                      value: nextType === "FILE" ? "" : item.value,
                      files: nextType === "FILE" ? item.files : [],
                      uploadedFiles: nextType === "FILE" ? item.uploadedFiles : [],
                    };
                  }));
                }}
              >
                <option value="TEXT">Text detail</option>
                <option value="FILE">Upload file</option>
              </select>
              <button type="button" className="btn-outline px-3" aria-label="Remove field" onClick={() => setExtraFields((fields) => fields.filter((_, itemIndex) => itemIndex !== index))}><X size={16} /></button>
              {field.inputType === "FILE" ? (
                <div className="md:col-span-3">
                  <label>
                    <span className="label">Upload file</span>
                    <input className="input pt-2" type="file" multiple onChange={(event) => setExtraFields((fields) => fields.map((item, itemIndex) => itemIndex === index ? { ...item, files: Array.from(event.target.files ?? []) } : item))} />
                  </label>
                  {displayFileNames(field.files, field.uploadedFiles) ? <div className="mt-1 text-xs text-slate-500">{displayFileNames(field.files, field.uploadedFiles)}</div> : null}
                </div>
              ) : (
                <input className="input md:col-span-3" placeholder="Detail" value={field.value} onChange={(event) => setExtraFields((fields) => fields.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} />
              )}
            </div>
          ))}
          {manualLetterFields.length ? <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="font-semibold text-amber-950">Letter fields required before generation</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {manualLetterFields.map((field) => field.inputType === "FILE" ? (
                <label key={field.key}>
                  <span className="label text-amber-950">{field.label}</span>
                  <input className="input bg-white pt-2" type="file" multiple required={(letterFieldFiles[field.key]?.length ?? 0) === 0 && (letterFieldUploadedFiles[field.key]?.length ?? 0) === 0} onChange={(event) => setLetterFieldFiles((current) => ({ ...current, [field.key]: Array.from(event.target.files ?? []) }))} />
                  {displayFileNames(letterFieldFiles[field.key], letterFieldUploadedFiles[field.key]) ? <div className="mt-1 text-xs text-amber-900">{displayFileNames(letterFieldFiles[field.key], letterFieldUploadedFiles[field.key])}</div> : null}
                </label>
              ) : (
                <label key={field.key}>
                  <span className="label text-amber-950">{field.label}</span>
                  <input className="input bg-white" required value={letterFields[field.key] ?? ""} onChange={(event) => setLetterFields((values) => ({ ...values, [field.key]: event.target.value }))} />
                </label>
              ))}
            </div>
          </div> : null}
        </div>
        <button type="button" className="btn-outline mt-3 w-fit" onClick={() => setExtraFields((fields) => [...fields, { label: "", inputType: "TEXT", value: "", files: [], uploadedFiles: [] }])}><Plus size={16} />Additional field</button>
      </FormSection>

      {message ? <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={loading || !plotId || !name}>
          {loading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
          {initialData ? "Update allotment and open letter" : "Record allotment"}
        </button>
      </div>
    </form>
  );
}

function FormSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">{number}</span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function FirmValue({ label, value }: { label: string; value: string | null }) {
  return <div><div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-slate-800">{value || "-"}</div></div>;
}

function firstDocumentNumber(entries: AllotteeDocumentEntry[], kind: AllotteeDocumentEntry["kind"]) {
  return entries.find((entry) => entry.kind === kind && entry.number.trim())?.number.trim() || undefined;
}

function sanitizeFieldKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "field";
}

function replaceOrKeepStoredFiles(
  selectedFiles: File[] | undefined,
  existingFiles: StoredFileRef[] | undefined,
  newlyUploadedFiles: StoredFileRef[],
) {
  return (selectedFiles?.length ?? 0) > 0 ? newlyUploadedFiles : (existingFiles ?? []);
}

function displayFileNames(selectedFiles: File[] | undefined, existingFiles: StoredFileRef[] | undefined) {
  if ((selectedFiles?.length ?? 0) > 0) return selectedFiles?.map((file) => file.name).join(", ") ?? "";
  if ((existingFiles?.length ?? 0) > 0) return existingFiles?.map((file) => file.fileName).join(", ") ?? "";
  return "";
}

async function uploadDocumentGroups(
  groups: Array<{ group: string; files: File[]; ownerType: string; ownerId: string; categoryKey: string }>,
) {
  const uploaded: Array<{ group: string; id: string; fileName: string }> = [];
  for (const group of groups) {
    for (const file of group.files) {
      const metaResponse = await fetch("/api/v1/files/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          visibility: "TEAM",
          ownerType: group.ownerType,
          ownerId: group.ownerId,
          categoryKey: group.categoryKey,
          notes: `Uploaded from new allotment form (${group.group})`,
        }),
      });
      const metaBody = await metaResponse.json();
      if (!metaResponse.ok) throw new Error(metaBody.error ?? `Could not prepare upload for ${file.name}`);
      const uploadedTo = await uploadToPlan(metaBody.data.upload, file);
      const completeResponse = await fetch(`/api/v1/files/${metaBody.data.file.id}/upload-complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storageProvider: uploadedTo.provider,
          storageKey: uploadedTo.storageKey || metaBody.data.file.storageKey,
          sizeBytes: file.size,
        }),
      });
      const completeBody = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(completeBody.error ?? `Upload completed, but ${file.name} could not be saved.`);
      uploaded.push({ group: group.group, id: completeBody.data.id, fileName: completeBody.data.fileName });
    }
  }
  return uploaded;
}

async function uploadToPlan(upload: string | { primary: UploadTarget; fallback?: UploadTarget }, file: File): Promise<UploadTarget> {
  const contentType = file.type || "application/octet-stream";
  if (typeof upload === "string") {
    const response = await fetch(upload, { method: "PUT", headers: { "content-type": contentType }, body: file });
    if (!response.ok) throw new Error(`Upload failed for ${file.name}`);
    return { provider: upload.includes("/api/v1/storage/upload") ? "LOCAL" : "S3", storageKey: "", url: upload };
  }
  try {
    await putUploadFile(upload.primary, file, contentType);
    return upload.primary;
  } catch (error) {
    if (!upload.fallback) throw error;
    await putUploadFile(upload.fallback, file, contentType);
    return upload.fallback;
  }
}

async function putUploadFile(target: UploadTarget, file: File, contentType: string) {
  const response = await fetch(target.url, { method: "PUT", headers: { "content-type": contentType }, body: file });
  if (!response.ok) throw new Error(`${file.name} upload failed`);
}

type UploadTarget = {
  provider: "LOCAL" | "S3";
  storageKey: string;
  url: string;
};

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
  arrangeHref,
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
  arrangeHref?: string;
}) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState<"save" | "render" | "">("");
  const [approvalLoading, setApprovalLoading] = useState<"APPROVED" | "ISSUED" | "REJECTED" | "">("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<"edit" | "preview">(letter.fileAssetId ? "preview" : "edit");
  const [draftHtml, setDraftHtml] = useState(letter.editableHtml ?? "");
  const [fileAssetId, setFileAssetId] = useState(letter.fileAssetId);
  const [renderVersion, setRenderVersion] = useState(0);
  const [status, setStatus] = useState(letter.status);
  const [missingOpen, setMissingOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function currentHtml() {
    return editorRef.current?.innerHTML ?? draftHtml;
  }

  function changeView(nextView: "edit" | "preview") {
    if (nextView === "preview") editorRef.current?.blur();
    setView(nextView);
  }

  function format(command: "bold" | "italic" | "underline") {
    editorRef.current?.focus();
    globalThis.document.execCommand(command);
    setDirty(true);
  }

  function draftPayload() {
    return { editableHtml: currentHtml() };
  }

  async function saveDraft() {
    setLoading("save");
    setMessage(null);
    const payload = draftPayload();
    const response = await fetch(`/api/v1/documents/${letter.id}/draft`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    setLoading("");
    setMessage(response.ok ? { kind: "success", text: "Draft saved." } : { kind: "error", text: body.error ?? "Draft save failed" });
    if (response.ok) {
      setDraftHtml(payload.editableHtml ?? draftHtml);
      setDirty(false);
      router.refresh();
    }
  }

  async function renderPdf() {
    setLoading("render");
    setMessage(null);
    const payload = draftPayload();
    const saveResponse = await fetch(`/api/v1/documents/${letter.id}/draft`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
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
      setDraftHtml(payload.editableHtml ?? draftHtml);
      setDirty(false);
      setFileAssetId(body.data?.file?.id ?? body.data?.document?.fileAssetId ?? fileAssetId);
      setRenderVersion((v) => v + 1);
      setStatus(body.data?.document?.status ?? "GENERATED");
      changeView("preview");
      router.refresh();
    }
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

  async function removeDocument() {
    if (!globalThis.confirm("Delete this rejected letter permanently? This cannot be undone.")) return;
    setDeleteLoading(true);
    setMessage(null);
    const response = await fetch(`/api/v1/documents/${letter.id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setDeleteLoading(false);
      setMessage({ kind: "error", text: body.error ?? "Delete failed" });
      return;
    }
    if (backHref) router.push(backHref);
    else router.refresh();
  }

  const groupedMissing = groupMissingVariables(missingVariables);
  const documentTitle = letter.number ?? letter.type.replaceAll("_", " ");
  const canIssue = Boolean(fileAssetId);
  const isRejected = status === "REJECTED";

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
                <button type="button" className={`px-3 py-2 font-medium ${view === "edit" ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-50"}`} onClick={() => changeView("edit")}>
                  Edit Draft
                </button>
                <button type="button" className={`px-3 py-2 font-medium ${view === "preview" ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-50"}`} onClick={() => changeView("preview")}>
                  PDF Preview
                </button>
              </div>
              <button type="button" className="btn-outline h-9 px-3 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={() => format("bold")} disabled={view !== "edit"}>
                <Bold size={14} />
              </button>
              <button type="button" className="btn-outline h-9 px-3 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={() => format("italic")} disabled={view !== "edit"}>
                <Italic size={14} />
              </button>
              <button type="button" className="btn-outline h-9 px-3 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={() => format("underline")} disabled={view !== "edit"}>
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
              {fileAssetId && arrangeHref ? (
                <Link className="btn-outline h-9 px-3 text-xs" href={arrangeHref}>
                  <FileText size={14} />
                  Arrange pages
                </Link>
              ) : null}
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
              {isRejected ? (
                <button type="button" className="btn-outline h-9 border-rose-300 px-3 text-xs text-rose-600 hover:bg-rose-50" disabled={deleteLoading} onClick={removeDocument}>
                  {deleteLoading ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                  Delete
                </button>
              ) : (
                <>
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
                </>
              )}
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
          <LetterDraftCanvas
            key={`letter-edit-${letter.id}`}
            editorRef={editorRef}
            draftHtml={draftHtml}
            onInput={() => setDirty(true)}
          />
        ) : (
          <LetterPdfPreview
            key={`letter-preview-${fileAssetId ?? "empty"}-${renderVersion}`}
            fileAssetId={fileAssetId}
            version={renderVersion}
            loading={loading}
            onGenerate={renderPdf}
          />
        )}
      </div>

    </div>
  );
}

function LetterDraftCanvas({
  editorRef,
  draftHtml,
  onInput,
}: {
  editorRef: RefObject<HTMLDivElement>;
  draftHtml: string;
  onInput: () => void;
}) {
  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = draftHtml;
    normalizeEditableTemplateFields(editorRef.current);
  }, [draftHtml, editorRef]);

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    event.preventDefault();
    if (html) {
      const clean = sanitizePastedHtml(html);
      if (clean) {
        globalThis.document.execCommand("insertHTML", false, clean);
        onInput();
        return;
      }
    }
    if (text) globalThis.document.execCommand("insertText", false, text);
    onInput();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-200/70 p-3 shadow-inner md:p-6">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        suppressHydrationWarning
        className="letter-paper-editor"
        onInput={onInput}
        onPaste={handlePaste}
      />
    </section>
  );
}


function normalizeEditableTemplateFields(editor: HTMLDivElement) {
  const markers = [...editor.querySelectorAll<HTMLElement>("mark[data-template-field]")];
  for (const marker of markers) {
    marker.removeAttribute("contenteditable");
    const id = marker.dataset.templateField;
    const nested = id ? marker.querySelector<HTMLElement>(`mark[data-template-field="${id}"]`) : null;
    if (nested) {
      nested.removeAttribute("contenteditable");
      marker.replaceWith(nested);
    }
  }
}

function LetterPdfPreview({
  fileAssetId,
  version = 0,
  loading,
  onGenerate,
}: {
  fileAssetId: string | null;
  version?: number;
  loading: "save" | "render" | "";
  onGenerate: () => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
      {fileAssetId ? (
        <div className="pdf-scroll-viewer h-[calc(100dvh-13rem)] min-h-[640px] overflow-auto rounded-xl border border-slate-200 bg-slate-200">
          <iframe
            title="Generated PDF preview"
            className="h-full min-h-[640px] w-full border-0 bg-white"
            src={`/api/v1/files/${fileAssetId}/download?disposition=inline&proxy=1&v=${version}`}
            scrolling="yes"
          />
        </div>
      ) : (
        <div className="grid min-h-[520px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div>
            <FileText className="mx-auto mb-3 text-slate-400" size={36} />
            <h2 className="font-semibold text-navy-900">No PDF preview yet</h2>
            <p className="mt-2 max-w-sm text-sm text-slate-500">Generate the PDF after reviewing the draft. The preview will open here automatically.</p>
            <button type="button" className="btn-primary mx-auto mt-4" onClick={onGenerate} disabled={Boolean(loading)}>
              {loading === "render" ? <Loader2 className="animate-spin" size={17} /> : <Eye size={17} />}
              Generate PDF
            </button>
          </div>
        </div>
      )}
    </section>
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
