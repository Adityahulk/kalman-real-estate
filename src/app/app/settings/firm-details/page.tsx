import Link from "next/link";
import { Building2, Plus, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/session";
import { firmFieldsForUser, firmsForUser } from "@/server/services/firms";
import { prisma } from "@/server/db";
import { AddFirmFieldForm, OwnershipSettingsForm } from "./settings-actions";
import { BackButton } from "@/components/back-button";
import { SettingsTabs } from "../settings-tabs";

export const dynamic = "force-dynamic";

export default async function FirmDetailsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const [firms, fields, selectedFirm] = await Promise.all([
    firmsForUser(session),
    firmFieldsForUser(session.id),
    prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { maxTransfersPerPlot: true } }),
  ]);

  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-8">
      <BackButton fallbackHref="/app" />
      <SettingsTabs active="firm" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="self-start overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Settings size={18} />
            <h1 className="font-semibold">Firm details</h1>
          </div>
          <div className="divide-y divide-slate-100">
            {firms.map((firm) => (
              <Link key={firm.id} href={`/app/settings/firm-details/${firm.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-navy-900">
                    <Building2 size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{firm.name}</span>
                    <span className="block truncate text-xs text-slate-500">{firm.contactEmail ?? "No email saved"}</span>
                  </span>
                </span>
                <span className="text-sm text-navy-800">Open</span>
              </Link>
            ))}
            {!firms.length ? <div className="px-5 py-8 text-center text-sm text-slate-500">No firms available.</div> : null}
          </div>
        </section>

        <aside className="space-y-4">
          <AddFirmFieldForm />
          <OwnershipSettingsForm maxTransfersPerPlot={selectedFirm?.maxTransfersPerPlot ?? 3} />
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center gap-2">
              <Plus size={17} />
              <h2 className="font-semibold">Additional fields</h2>
            </div>
            <div className="mt-4 space-y-2">
              {fields.map((field) => (
                <div key={field.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div className="font-medium">{field.label}</div>
                  <div className="text-xs text-slate-500">{field.key}</div>
                </div>
              ))}
              {!fields.length ? <div className="text-sm text-slate-500">No extra fields added yet.</div> : null}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
