"use client";

import { useRouter } from "next/navigation";
import { CadEntityType } from "@prisma/client";
import { Check, Loader2, Send } from "lucide-react";
import { FormEvent, useState } from "react";

type Entity = {
  id: string;
  label: string | null;
  type: CadEntityType;
  status: string;
};

export function CadEntityReviewForm({ cadFileId, entities, issueIds }: { cadFileId: string; entities: Entity[]; issueIds: string[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      entities: entities.map((entity) => ({
        entityId: entity.id,
        label: String(form.get(`${entity.id}:label`) ?? entity.label ?? ""),
        type: String(form.get(`${entity.id}:type`) ?? entity.type),
        status: String(form.get(`${entity.id}:status`) ?? entity.status),
      })),
      resolvedIssueIds: issueIds.filter((id) => form.get(`issue:${id}`) === "on"),
    };

    const response = await fetch(`/api/v1/cad/${cadFileId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? "Map review saved." : body.error ?? "Review failed");
    router.refresh();
  }

  async function publish() {
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/v1/cad/${cadFileId}/publish`, { method: "POST" });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? `Published ${body.data.plots.length} plots and ${body.data.assets.length} assets.` : body.error ?? "Publish failed");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {entities.map((entity) => (
        <div key={entity.id} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_180px_150px]">
          <label>
            <span className="label">Label</span>
            <input name={`${entity.id}:label`} className="input" defaultValue={entity.label ?? ""} />
          </label>
          <label>
            <span className="label">Type</span>
            <select name={`${entity.id}:type`} className="input" defaultValue={entity.type}>
              {Object.values(CadEntityType).map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Status</span>
            <select name={`${entity.id}:status`} className="input" defaultValue={entity.status}>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="SUGGESTED">SUGGESTED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </label>
        </div>
      ))}

      {issueIds.length ? (
        <div className="rounded-lg bg-amber-50 p-3">
          <div className="text-sm font-medium text-amber-900">Resolve warnings</div>
          <div className="mt-2 grid gap-2">
            {issueIds.map((id) => (
              <label key={id} className="flex items-center gap-2 text-sm text-amber-800">
                <input name={`issue:${id}`} type="checkbox" />
                Mark issue {id.slice(-6)} resolved
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {message ? <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{message}</div> : null}

      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />}
          Save review
        </button>
        <button type="button" className="btn-gold" onClick={publish} disabled={loading}>
          <Send size={17} />
          Publish live records
        </button>
      </div>
    </form>
  );
}
