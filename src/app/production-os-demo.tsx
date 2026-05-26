"use client";

import { AlertTriangle, Bell, Building2, FileCheck2, Link2, ReceiptIndianRupee, ShieldCheck } from "lucide-react";
import { BOQ_ITEMS, GENERATED_DOCUMENTS, NOTIFICATIONS, PURCHASE_ORDERS, platformOverview } from "@/data/platform";
import { inr } from "@/lib/format";

const overview = platformOverview();

export function ProductionOsDemo() {
  return (
    <section id="production-os" className="bg-slate-50">
      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-7 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-gold-700">Production OS layer</p>
          <h2 className="mt-2 section-title">End-to-end builder SaaS control plane</h2>
          <p className="mt-3 leading-7 text-slate-600">
            Tenant, CRM, document, BOQ, purchase, notification, and security contracts are wired as production-ready module surfaces.
          </p>
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
            <Building2 className="mb-3 text-gold-600" size={20} />
            <p className="text-2xl font-semibold text-navy-950">{overview.counts.projects}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tenant projects</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
            <FileCheck2 className="mb-3 text-emerald-600" size={20} />
            <p className="text-2xl font-semibold text-navy-950">{overview.counts.generatedDocuments}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Generated documents</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
            <ReceiptIndianRupee className="mb-3 text-sky-600" size={20} />
            <p className="text-2xl font-semibold text-navy-950">{inr(overview.finance.committedBoq)}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Committed BOQ</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
            <Bell className="mb-3 text-amber-500" size={20} />
            <p className="text-2xl font-semibold text-navy-950">{overview.counts.notifications}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active notifications</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-navy-950">
              <FileCheck2 size={18} /> Documents and approvals
            </h3>
            <div className="space-y-3">
              {GENERATED_DOCUMENTS.map((doc) => (
                <div key={doc.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-navy-950">{doc.title}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {doc.status.replaceAll("_", " ")} · v{doc.version} · {doc.issuedTo}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-navy-950">
              <ReceiptIndianRupee size={18} /> BOQ and purchase control
            </h3>
            <div className="space-y-3">
              {BOQ_ITEMS.map((item) => (
                <div key={item.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-navy-950">{item.item}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.actualQty}/{item.plannedQty} {item.unit}
                      </p>
                    </div>
                    <span className="chip bg-gold-50 text-gold-800">{inr(item.committedCost - item.plannedCost)}</span>
                  </div>
                </div>
              ))}
              {PURCHASE_ORDERS.map((po) => (
                <div key={po.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-semibold text-navy-950">{po.vendor}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {po.id} · {po.status.replaceAll("_", " ")} · {inr(po.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-navy-950">
              <ShieldCheck size={18} /> Tenant security and CRM
            </h3>
            <div className="space-y-3">
              <div className="rounded-lg bg-navy-950 p-4 text-white">
                <p className="text-sm font-semibold">{overview.tenant.name}</p>
                <p className="mt-1 text-sm text-slate-300">{overview.tenant.region}</p>
                <a className="btn-gold mt-4" href={overview.crm.url} target="_blank" rel="noreferrer">
                  <Link2 size={16} /> Open external CRM
                </a>
              </div>
              {NOTIFICATIONS.map((notification) => (
                <div key={notification.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="flex items-center gap-2 font-semibold text-navy-950">
                    {notification.severity === "warning" ? <AlertTriangle size={16} className="text-amber-500" /> : <Bell size={16} />}
                    {notification.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
