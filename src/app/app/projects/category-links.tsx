"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState } from "react";

type Field = { id: string; key: string; label: string; logoFileId?: string | null };

export function CategoryLinks({ fields, selectedId, hrefPrefix }: { fields: Field[]; selectedId?: string; hrefPrefix: string }) {
  const [query, setQuery] = useState("");
  const visible = fields.filter((field) => field.label.toLowerCase().includes(query.toLowerCase()));
  return <div className="mt-4">
    <label className="relative mb-3 block max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
      <input className="input h-9 pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
    </label>
    <div className="flex flex-wrap gap-2">
      {visible.map((field) => <Link className={selectedId === field.id ? "btn-primary" : "btn-outline"} href={`${hrefPrefix}${field.key}`} key={field.id}>{field.logoFileId ? <img className="size-5 rounded object-contain" src={`/api/v1/files/${field.logoFileId}/download?disposition=inline&proxy=1`} alt="" /> : null}{field.label}</Link>)}
      {!visible.length ? <span className="py-2 text-sm text-slate-500">No matching options.</span> : null}
    </div>
  </div>;
}
