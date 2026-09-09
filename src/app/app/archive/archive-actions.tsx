"use client";

import { EyeOff, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type ArchiveRecord = {
  id: string;
  recordType: "Plot" | "GeneratedDocument" | "FileAsset" | "MarketingTask";
  section: "Plots" | "Generated documents" | "Files" | "Marketing projects";
  title: string;
  subtitle: string;
  archiveVersion: string;
  restoreEndpoint: string;
};

const sectionOrder: ArchiveRecord["section"][] = ["Plots", "Generated documents", "Files", "Marketing projects"];

export function ArchiveRecords({ records }: { records: ArchiveRecord[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"selected" | "all" | "">("");
  const selectedRecords = records.filter((record) => selected.has(recordKey(record)));

  async function clear(mode: "selected" | "all") {
    const count = mode === "all" ? records.length : selectedRecords.length;
    if (!count || !window.confirm(`Clear ${count} archived record${count === 1 ? "" : "s"} from this view? The legal data and audit history will remain preserved.`)) return;
    setBusy(mode);
    try {
      const response = await fetch("/api/v1/archive/clear", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "all" ? { mode } : {
          mode,
          items: selectedRecords.map(({ recordType, id: recordId, archiveVersion }) => ({ recordType, recordId, archiveVersion })),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? "Archive cleanup failed.");
      setSelected(new Set());
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Archive cleanup failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">{selected.size ? `${selected.size} selected` : `${records.length} archived records visible`}</div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline h-9 px-3 text-sm" type="button" disabled={!selectedRecords.length || Boolean(busy)} onClick={() => void clear("selected")}>
            <EyeOff size={15} />{busy === "selected" ? "Clearing..." : "Clear selected"}
          </button>
          <button className="btn-outline h-9 px-3 text-sm text-rose-700" type="button" disabled={!records.length || Boolean(busy)} onClick={() => void clear("all")}>
            <EyeOff size={15} />{busy === "all" ? "Clearing..." : "Clear all"}
          </button>
        </div>
      </div>

      {sectionOrder.map((section) => {
        const items = records.filter((record) => record.section === section);
        return (
          <section className="card overflow-hidden" key={section}>
            <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">{section}</h2></div>
            <div className="divide-y divide-slate-100">
              {items.map((record) => (
                <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" key={recordKey(record)}>
                  <label className="flex min-w-0 cursor-pointer items-start gap-3">
                    <input className="mt-1 h-4 w-4 rounded border-slate-300" type="checkbox" checked={selected.has(recordKey(record))}
                      onChange={(event) => setSelected((current) => toggleSelection(current, recordKey(record), event.target.checked))} />
                    <span className="min-w-0">
                      <span className="block break-words font-medium">{record.title}</span>
                      <span className="mt-1 block break-words text-xs text-slate-500">{record.subtitle}</span>
                      <span className="mt-1 block text-xs text-slate-400">{formatArchiveDate(record.archiveVersion)}</span>
                    </span>
                  </label>
                  <RestoreButton endpoint={record.restoreEndpoint} label={record.title} />
                </div>
              ))}
              {!items.length ? <div className="px-5 py-8 text-center text-sm text-slate-500">No archived {section.toLowerCase()}.</div> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function RestoreButton({ endpoint, label }: { endpoint: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function restore() {
    if (!window.confirm(`Restore ${label}?`)) return;
    setBusy(true);
    try {
      const response = await fetch(endpoint, { method: "POST" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? "Restore failed.");
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Restore failed.");
    } finally {
      setBusy(false);
    }
  }
  return <button className="btn-outline h-8 px-3 text-xs" type="button" disabled={busy} onClick={() => void restore()}><RotateCcw size={13} />{busy ? "Restoring..." : "Restore"}</button>;
}

function recordKey(record: Pick<ArchiveRecord, "recordType" | "id" | "archiveVersion">) {
  return `${record.recordType}/${record.id}/${record.archiveVersion}`;
}

function toggleSelection(current: Set<string>, key: string, checked: boolean) {
  const next = new Set(current);
  if (checked) next.add(key); else next.delete(key);
  return next;
}

function formatArchiveDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}
