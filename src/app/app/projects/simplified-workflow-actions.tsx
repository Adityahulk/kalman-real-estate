"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, FileText, GitBranch, Plus, Send, Upload, UserRoundPlus } from "lucide-react";
import { DocumentStatus, PlotStatus } from "@prisma/client";
import { ManualPlotForm } from "./manual-entry-actions";
import {
  GeneratePlotDocumentPanel,
  OwnershipDocumentUpload,
  PlotAllotmentForm,
  PlotRegistryForm,
  PlotTransferForm,
} from "../ownership/ownership-actions";
import { DocumentApprovalButtons } from "../documents/document-actions";

type OwnerOption = { id: string; name: string; email: string | null; phone: string | null };
type GeneratedLetter = {
  id: string;
  type: string;
  status: DocumentStatus;
  number: string | null;
  fileAssetId: string | null;
  createdAt: Date;
};

export function AddPlotPanel({ projectId, compact = false }: { projectId: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={compact ? "" : "rounded-xl border border-slate-200 bg-white p-4 shadow-card"}>
      <button
        type="button"
        className={compact ? "btn-outline" : "flex w-full items-center justify-between text-left"}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex items-center gap-2 font-semibold">
          <Plus size={17} />
          Add plot
        </span>
        <ChevronDown className={open ? "rotate-180 transition" : "transition"} size={17} />
      </button>
      {open ? (
        <div className={compact ? "mt-4" : "mt-4 border-t border-slate-100 pt-4"}>
          <ManualPlotForm projectId={projectId} />
        </div>
      ) : null}
    </div>
  );
}

export function QuickAllotmentLink({ projectId }: { projectId: string }) {
  return (
    <a className="btn-gold" href={`/app/projects/${projectId}/ownership/new-allotment`}>
      <UserRoundPlus size={17} />
      New allotment
    </a>
  );
}

export function WhatsAppShareLink({
  label = "Share on WhatsApp",
  text,
  compact = false,
}: {
  label?: string;
  text: string;
  compact?: boolean;
}) {
  return (
    <a
      className={compact ? "btn-outline h-8 px-3 text-xs" : "btn-outline"}
      href={`https://wa.me/?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noreferrer"
    >
      <Send size={compact ? 14 : 17} />
      {label}
    </a>
  );
}

export function GuidedOwnershipPanel({
  plotId,
  plotStatus,
  owners,
}: {
  plotId: string;
  plotStatus: PlotStatus;
  owners: OwnerOption[];
}) {
  const isCompanyOwned = plotStatus === "COMPANY_OWNED";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{isCompanyOwned ? "Add owner" : "Change owner"}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {isCompanyOwned
              ? "Record the first allotment, then generate the allotment letter."
              : "Record transfer or resale, then generate the transfer letter."}
          </p>
        </div>
        {isCompanyOwned ? <UserRoundPlus className="text-navy-800" size={20} /> : <GitBranch className="text-navy-800" size={20} />}
      </div>
      {isCompanyOwned ? <PlotAllotmentForm plotId={plotId} owners={owners} /> : <PlotTransferForm plotId={plotId} owners={owners} />}
    </div>
  );
}

export function QuickActionPanel({
  plotId,
  plotCode,
  ownerName,
  plotStatus,
  owners,
}: {
  plotId: string;
  plotCode: string;
  ownerName: string;
  plotStatus: PlotStatus;
  owners: OwnerOption[];
}) {
  const isCompanyOwned = plotStatus === "COMPANY_OWNED";
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <a className="btn-primary justify-center" href="#ownership-action">
        {isCompanyOwned ? <UserRoundPlus size={17} /> : <GitBranch size={17} />}
        {isCompanyOwned ? "Add Owner" : "Change Owner"}
      </a>
      <a className="btn-outline justify-center" href="#plot-documents">
        <Upload size={17} />
        Upload Document
      </a>
      <a className="btn-outline justify-center" href="#smart-letter">
        <FileText size={17} />
        Generate Letter
      </a>
      <a className="btn-outline justify-center" href="#registry-action">
        <CheckCircle2 size={17} />
        Update Registry
      </a>
      <div id="ownership-action" className="md:col-span-2 xl:col-span-4">
        <GuidedOwnershipPanel plotId={plotId} plotStatus={plotStatus} owners={owners} />
      </div>
      <div id="smart-letter" className="md:col-span-2">
        <SmartLetterCard plotId={plotId} plotCode={plotCode} ownerName={ownerName} letters={[]} compactFallback />
      </div>
      <div id="registry-action" className="md:col-span-2">
        <PlotRegistryForm plotId={plotId} />
      </div>
    </div>
  );
}

export function SmartLetterCard({
  plotId,
  plotCode,
  ownerName,
  letters,
  compactFallback = false,
}: {
  plotId: string;
  plotCode: string;
  ownerName: string;
  letters: GeneratedLetter[];
  compactFallback?: boolean;
}) {
  const allotment = useMemo(() => latestLetter(letters, "allotment"), [letters]);
  const transfer = useMemo(() => latestLetter(letters, "transfer"), [letters]);
  const primary = transfer ?? allotment;

  if (!primary) {
    return <GeneratePlotDocumentPanel plotId={plotId} plotCode={plotCode} ownerName={ownerName} />;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Letter status</h3>
          <p className="mt-1 text-xs text-slate-500">{primary.number ?? primary.type} · {primary.status.replaceAll("_", " ")}</p>
        </div>
        <FileText className="text-navy-800" size={19} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {primary.fileAssetId ? (
          <a className="btn-outline h-8 px-3 text-xs" href={`/api/v1/files/${primary.fileAssetId}/download`}>
            {primary.status === "APPROVED" || primary.status === "ISSUED" ? "Download" : "Download Draft"}
          </a>
        ) : null}
        {primary.status === "APPROVED" || primary.status === "ISSUED" ? (
          <span className="chip bg-emerald-50 text-emerald-700">Owner-download ready</span>
        ) : (
          <>
            <span className="chip bg-amber-50 text-amber-800">Approval pending</span>
            <DocumentApprovalButtons documentId={primary.id} />
          </>
        )}
      </div>
      {compactFallback ? null : (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <GeneratePlotDocumentPanel plotId={plotId} plotCode={plotCode} ownerName={ownerName} />
        </div>
      )}
    </div>
  );
}

export function PlotDocumentUploadPanel({ plotId }: { plotId: string }) {
  return (
    <OwnershipDocumentUpload
      ownerType="Plot"
      ownerId={plotId}
      defaultVisibility="OWNER_VISIBLE"
      defaultDocumentType="ALLOTMENT_LETTER"
      title="Upload plot document"
    />
  );
}

export function OwnerKycUploadPanel({ ownerId }: { ownerId: string }) {
  return (
    <OwnershipDocumentUpload
      ownerType="Owner"
      ownerId={ownerId}
      defaultVisibility="TEAM"
      defaultDocumentType="PAN_CARD"
      title="Upload owner PAN / Aadhaar / KYC"
    />
  );
}

function latestLetter(letters: GeneratedLetter[], kind: "allotment" | "transfer") {
  return letters.find((letter) => letter.type.toLowerCase().includes(kind)) ?? null;
}
