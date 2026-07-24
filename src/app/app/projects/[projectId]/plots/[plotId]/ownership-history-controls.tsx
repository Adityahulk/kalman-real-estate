"use client";

import { ArrowRight, CalendarDays, Loader2, RotateCcw, UserRound, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type OwnershipEvent = {
  id: string;
  kind: "ALLOTMENT" | "TRANSFER";
  ownerName: string;
  effectiveAt: string | Date;
  actorName: string | null;
  notes: string | null;
};

export function OwnershipEventHistory({
  plotId,
  records,
  canCancel,
}: {
  plotId: string;
  records: OwnershipEvent[];
  canCancel: boolean;
}) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const ordered = useMemo(
    () => [...records].sort((left, right) => new Date(left.effectiveAt).getTime() - new Date(right.effectiveAt).getTime()),
    [records],
  );
  const latestId = ordered.at(-1)?.id ?? null;

  async function cancel(record: OwnershipEvent) {
    if (cancellingId) return;
    const label = record.kind === "TRANSFER"
      ? `the latest transfer to ${record.ownerName}`
      : `the allotment to ${record.ownerName}`;
    if (!globalThis.window.confirm(
      `Cancel ${label}? All letters, signed copies, and supporting documents linked to this update will be permanently removed.`,
    )) return;

    setCancellingId(record.id);
    setError("");
    try {
      const response = await fetch(`/api/v1/ownership/plots/${plotId}/records/${record.id}/cancel`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "The ownership update could not be cancelled.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The ownership update could not be cancelled.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold">Ownership history</h2>
        <p className="mt-1 text-sm text-slate-500">Completed allotments and owner transfers for this plot.</p>
      </div>
      {error ? <div className="mx-5 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {ordered.length ? (
        <div className="divide-y divide-slate-100">
          {ordered.map((record, index) => {
            const isLatest = record.id === latestId;
            return (
              <div key={record.id} className="grid gap-4 px-5 py-4 md:grid-cols-[44px_1fr_auto] md:items-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${record.kind === "TRANSFER" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {record.kind === "TRANSFER" ? <ArrowRight size={18} /> : <UserRound size={18} />}
                </div>
                <div>
                  <div className="font-medium text-navy-950">
                    {record.kind === "TRANSFER"
                      ? `Transferred to ${record.ownerName}`
                      : `Allotted to ${record.ownerName}`}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><CalendarDays size={13} />{new Date(record.effectiveAt).toLocaleString("en-IN")}</span>
                    <span>Updated by {record.actorName ?? "System"}</span>
                    <span>Ownership update {index + 1}</span>
                  </div>
                  {record.notes ? <p className="mt-2 text-xs text-slate-500">{record.notes}</p> : null}
                </div>
                {canCancel && isLatest ? (
                  <button
                    type="button"
                    className="btn-outline h-9 border-rose-300 px-3 text-xs text-rose-700 hover:bg-rose-50"
                    onClick={() => void cancel(record)}
                    disabled={cancellingId !== null}
                  >
                    {cancellingId === record.id ? <Loader2 className="animate-spin" size={14} /> : <RotateCcw size={14} />}
                    Cancel {record.kind === "TRANSFER" ? "transfer" : "allotment"}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-5">
          <div className="rounded-lg border border-dashed border-slate-200 p-5 text-sm text-slate-500">
            No allotment has been completed. This plot is ready for a fresh allotment.
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoricalAllotmentToggle({
  plotId,
  sourceFileCount,
  active,
  historicalRecordId,
  latestRecordId,
}: {
  plotId: string;
  sourceFileCount: number;
  active: boolean;
  historicalRecordId: string | null;
  latestRecordId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState<"INDIVIDUAL" | "COMPANY" | "SHARED">("INDIVIDUAL");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [effectiveAt, setEffectiveAt] = useState("");
  const canTurnOff = active && historicalRecordId === latestRecordId;

  async function toggle() {
    if (loading) return;
    setError("");
    if (!active) {
      setOpen(true);
      return;
    }
    if (!canTurnOff || !historicalRecordId) {
      setError("A newer transfer exists. Cancel the latest transfer from History first.");
      return;
    }
    if (!globalThis.window.confirm(
      "Mark this historical allotment as not completed? The uploaded old letters linked to it will be permanently removed.",
    )) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/ownership/plots/${plotId}/records/${historicalRecordId}/cancel`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "The historical allotment could not be cancelled.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The historical allotment could not be cancelled.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/ownership/plots/${plotId}/historical-allotment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          name,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          effectiveAt: effectiveAt ? new Date(`${effectiveAt}T12:00:00`).toISOString() : undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "The historical allotment could not be recorded.");
      setOpen(false);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The historical allotment could not be recorded.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className={`mb-4 rounded-lg border px-4 py-3 ${active ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className={`text-sm font-medium ${active ? "text-emerald-900" : "text-slate-800"}`}>
              Allotment already completed in the past
            </div>
            <div className={`mt-1 text-xs ${active ? "text-emerald-700" : "text-slate-500"}`}>
              {active
                ? "The previous owner is recorded. New transfer is now available."
                : `${sourceFileCount} old signed document${sourceFileCount === 1 ? "" : "s"} uploaded. Turn this on to record the previous owner.`}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            aria-label="Allotment already completed in the past"
            className={`relative h-7 w-12 rounded-full transition ${active ? "bg-emerald-600" : "bg-slate-300"}`}
            onClick={() => void toggle()}
            disabled={loading}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${active ? "left-6" : "left-1"}`} />
          </button>
        </div>
        {error ? <div className="mt-3 text-sm text-rose-700">{error}</div> : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={() => !loading && setOpen(false)}>
          <form className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Record previous owner</h3>
                <p className="mt-1 text-sm text-slate-500">These details establish the old allotment so future transfers start from the correct owner.</p>
              </div>
              <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={() => setOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="label">Owner type</span>
                <select className="input" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="COMPANY">Company</option>
                  <option value="SHARED">Shared ownership</option>
                </select>
              </label>
              <label>
                <span className="label">Allotment date</span>
                <input className="input" type="date" value={effectiveAt} onChange={(event) => setEffectiveAt(event.target.value)} />
              </label>
              <label className="sm:col-span-2">
                <span className="label">Previous owner name</span>
                <input className="input" value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <label>
                <span className="label">Phone</span>
                <input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </label>
              <label>
                <span className="label">Email</span>
                <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="sm:col-span-2">
                <span className="label">Address</span>
                <textarea className="input min-h-24" value={address} onChange={(event) => setAddress(event.target.value)} />
              </label>
            </div>
            {error ? <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading || name.trim().length < 2}>
                {loading ? <Loader2 className="animate-spin" size={16} /> : null}
                Save previous owner
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
