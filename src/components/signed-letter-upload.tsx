"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploader } from "@/components/file-uploader";

function isTransferLetter(type: string) {
  return type.toLowerCase().includes("transfer");
}

export function SignedLetterUpload({
  documentId,
  plotId,
  documentType,
  documentNo,
  documentDate,
  replacing = false,
  compact = true,
  onSigned,
}: {
  documentId: string;
  plotId: string;
  documentType: string;
  documentNo?: string | null;
  documentDate?: string;
  replacing?: boolean;
  compact?: boolean;
  onSigned?: (fileAssetId: string) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const transfer = isTransferLetter(documentType);

  async function recordSignedCopy(fileAssetId: string) {
    setError("");
    const response = await fetch(`/api/v1/documents/${documentId}/sign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ signedFileAssetId: fileAssetId }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = body.error ?? "The file was uploaded, but the letter could not be marked as signed.";
      setError(message);
      globalThis.window?.alert(message);
      return;
    }
    onSigned?.(fileAssetId);
    router.refresh();
  }

  return (
    <div>
      <FileUploader
        compact={compact}
        label={replacing ? "Replace signed" : "Upload signed"}
        ownerType="Plot"
        ownerId={plotId}
        visibility="OWNER_VISIBLE"
        accept="application/pdf,image/*"
        metadata={{
          categoryKey: transfer ? "signed-transfer-letter" : "signed-allotment-letter",
          documentType: transfer ? "TRANSFER_LETTER" : "ALLOTMENT_LETTER",
          documentNo: documentNo ?? undefined,
          documentDate,
          notes: `Signed version of ${transfer ? "transfer" : "allotment"} letter`,
        }}
        onUploaded={(file) => void recordSignedCopy(file.id)}
      />
      {error ? <div className="mt-1 max-w-56 text-xs text-rose-700">{error}</div> : null}
    </div>
  );
}
