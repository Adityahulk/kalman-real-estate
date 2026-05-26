import { BadgeIndianRupee, ChartNoAxesCombined, ReceiptIndianRupee } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { fullInr } from "@/lib/format";
import { BoqForm, InvoicePaymentPanel, VendorContractorForm } from "./finance-actions";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const session = await getSessionUser();
  if (!session) return null;

  const [projects, boq, invoices, insights] = await Promise.all([
    prisma.project.findMany({ where: { tenantId: session.tenantId }, orderBy: { name: "asc" } }),
    prisma.bOQItem.findMany({ where: { tenantId: session.tenantId }, include: { project: true }, orderBy: { updatedAt: "desc" } }),
    prisma.invoice.findMany({ where: { tenantId: session.tenantId }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.costInsight.findMany({ where: { tenantId: session.tenantId }, orderBy: { createdAt: "desc" }, take: 12 }),
  ]);

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Cost control and BOQ</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Project budgets, BOQ, purchase orders, invoices, contractor bills, CAD-linked quantities, and variance intelligence.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <BoqForm projects={projects.map((project) => ({ id: project.id, name: project.name }))} />
          <VendorContractorForm />
          <InvoicePaymentPanel projects={projects.map((project) => ({ id: project.id, name: project.name }))} invoices={invoices.map((invoice) => ({ id: invoice.id, number: invoice.number }))} />
        </div>
        <div className="space-y-6">
          <section className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
              <ChartNoAxesCombined size={18} />
              <h2 className="font-semibold">BOQ variance</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Code</th>
                    <th className="px-5 py-3">Project</th>
                    <th className="px-5 py-3">Planned</th>
                    <th className="px-5 py-3">Consumed</th>
                    <th className="px-5 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {boq.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3 font-medium">{item.code}</td>
                      <td className="px-5 py-3">{item.project.name}</td>
                      <td className="px-5 py-3">{item.plannedQty.toString()} {item.unit}</td>
                      <td className="px-5 py-3">{item.consumedQty?.toString() ?? "-"} {item.unit}</td>
                      <td className="px-5 py-3">{fullInr(Number(item.plannedQty) * Number(item.plannedRateInr))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2"><ReceiptIndianRupee size={18} /><h2 className="font-semibold">Invoices</h2></div>
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                    <span>{invoice.number}</span>
                    <span>{fullInr(Number(invoice.totalInr))}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2"><BadgeIndianRupee size={18} /><h2 className="font-semibold">Cost insights</h2></div>
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div key={insight.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="font-medium">{insight.title}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{insight.explanation}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
