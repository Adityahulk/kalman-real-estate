import { History, Landmark, UserRoundCheck } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { fullInr } from "@/lib/format";
import { AllotPlotForm, CreateOwnerForm, RegistryForm, TransferPlotForm } from "./ownership-actions";

export const dynamic = "force-dynamic";

export default async function OwnershipPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const [plots, owners, history] = await Promise.all([
    prisma.plot.findMany({ where: { tenantId: session.tenantId }, include: { currentOwner: true }, orderBy: { code: "asc" } }),
    prisma.owner.findMany({ where: { tenantId: session.tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.ownershipRecord.findMany({ where: { tenantId: session.tenantId }, include: { plot: true, owner: true }, orderBy: { effectiveAt: "desc" }, take: 20 }),
  ]);

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Ownership ledger</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Company inventory, allotment, resale transfer, registry status, and full append-only plot audit history.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <CreateOwnerForm />
          <AllotPlotForm plots={plots.map((plot) => ({ id: plot.id, code: plot.code }))} owners={owners.map((owner) => ({ id: owner.id, name: owner.name }))} />
          <TransferPlotForm plots={plots.map((plot) => ({ id: plot.id, code: plot.code }))} owners={owners.map((owner) => ({ id: owner.id, name: owner.name }))} />
          <RegistryForm plots={plots.map((plot) => ({ id: plot.id, code: plot.code }))} />
        </div>

        <section className="space-y-6">
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
              <Landmark size={18} />
              <h2 className="font-semibold">Plot inventory</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Plot</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Owner</th>
                    <th className="px-5 py-3">Area</th>
                    <th className="px-5 py-3">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plots.map((plot) => (
                    <tr key={plot.id}>
                      <td className="px-5 py-3 font-medium">{plot.code}</td>
                      <td className="px-5 py-3"><span className="chip bg-slate-100 text-slate-700">{plot.status.replaceAll("_", " ")}</span></td>
                      <td className="px-5 py-3">{plot.currentOwner?.name ?? "Company"}</td>
                      <td className="px-5 py-3">{plot.areaSqft?.toString() ?? "-"} sq ft</td>
                      <td className="px-5 py-3">{fullInr(Number(plot.priceInr ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <History size={18} />
              <h2 className="font-semibold">Ownership history</h2>
            </div>
            <div className="space-y-3">
              {history.map((record) => (
                <div key={record.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                  <UserRoundCheck className="mt-0.5 text-navy-800" size={17} />
                  <div>
                    <div className="text-sm font-medium">{record.kind.replaceAll("_", " ")} · {record.plot.code}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {record.owner?.name ?? "Company"} · {record.amountInr ? fullInr(Number(record.amountInr)) : "No amount"} · {record.effectiveAt.toLocaleDateString("en-IN")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
