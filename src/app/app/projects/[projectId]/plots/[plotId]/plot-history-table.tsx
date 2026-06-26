"use client";

import { Eye, FileText, History, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type PlotHistoryItem = {
  id: string;
  at: string | Date;
  type: string;
  title: string;
  detail: string | null;
  actor: string | null;
  fileAssetId: string | null;
  documentId: string | null;
  auditId: string | null;
};

export function PlotHistoryTable({
  items,
  projectId,
  plotId,
}: {
  items: PlotHistoryItem[];
  projectId: string;
  plotId: string;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const auditCount = items.filter((item) => item.auditId).length;

  async function deleteEntry(auditId: string) {
    if (deletingId || cleaning) return;
    if (!globalThis.window.confirm("Delete this history entry? This only removes the log line, not the underlying record.")) return;
    setDeletingId(auditId);
    const response = await fetch(`/api/v1/audit-events/${auditId}`, { method: "DELETE" });
    setDeletingId(null);
    if (response.ok) {
      router.refresh();
    } else {
      globalThis.window.alert("Could not delete this history entry.");
    }
  }

  async function cleanUpHistory() {
    if (deletingId || cleaning || !auditCount) return;
    if (!globalThis.window.confirm("Clean up plot history logs? This removes audit log lines only. Plot details, ownership, documents, and registry records will stay unchanged.")) return;
    setCleaning(true);
    const response = await fetch(`/api/v1/ownership/plots/${plotId}/audit`, { method: "DELETE" });
    setCleaning(false);
    if (response.ok) {
      router.refresh();
    } else {
      globalThis.window.alert("Could not clean up plot history.");
    }
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-4">
        <History size={18} />
        <h2 className="font-semibold">Plot history</h2>
        <span className="chip bg-slate-100 text-slate-700">{items.length}</span>
        <button
          type="button"
          className="btn-outline ml-auto h-8 border-rose-300 px-3 text-xs text-rose-600 hover:bg-rose-50"
          onClick={() => void cleanUpHistory()}
          disabled={cleaning || deletingId !== null || !auditCount}
          title={auditCount ? "Remove plot audit log lines" : "No audit log lines to clean"}
        >
          {cleaning ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
          Clean Up
        </button>
      </div>
      {items.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">Who</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const at = typeof item.at === "string" ? new Date(item.at) : item.at;
                return (
                  <tr key={item.id} className="align-top hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-5 py-3 text-slate-600">{at.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-navy-950">{item.title}</div>
                      {item.detail ? <div className="mt-1 text-xs text-slate-500">{item.detail}</div> : null}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-700">{item.actor ?? "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {item.fileAssetId ? (
                          <a className="btn-outline h-8 px-2 text-xs" href={`/api/v1/files/${item.fileAssetId}/download?disposition=inline&proxy=1`} target="_blank" rel="noreferrer">
                            <Eye size={14} /> View
                          </a>
                        ) : null}
                        {item.documentId && !item.fileAssetId ? (
                          <a className="btn-outline h-8 px-2 text-xs" href={`/app/projects/${projectId}/plots/${plotId}/letters/${item.documentId}`}>
                            <FileText size={14} /> Open
                          </a>
                        ) : null}
                        {item.auditId ? (
                          <button
                            type="button"
                            className="btn-outline h-8 border-rose-300 px-2 text-xs text-rose-600 hover:bg-rose-50"
                            onClick={() => void deleteEntry(item.auditId as string)}
                            disabled={deletingId === item.auditId}
                          >
                            {deletingId === item.auditId ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5">
          <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">No history yet.</div>
        </div>
      )}
    </div>
  );
}
