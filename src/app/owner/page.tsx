import Link from "next/link";
import { FileText, Hammer, MapPinned } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { fullInr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OwnerPortalPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  const owner = await prisma.owner.findFirst({
    where: {
      tenantId: session.tenantId,
      OR: [{ email: user?.email }, { phone: user?.phone ?? undefined }],
    },
  });

  const plots = owner
    ? await prisma.plot.findMany({
        where: { tenantId: session.tenantId, currentOwnerId: owner.id, ownerVisible: true },
        include: { currentOwner: true, checklistItems: true },
        orderBy: { code: "asc" },
      })
    : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-3xl font-semibold tracking-tight">My plots</h1>
      <p className="mt-2 text-sm text-slate-600">Owner-visible CAD, documents, registry, construction progress, and photos.</p>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {plots.map((plot) => {
          const progress = plot.checklistItems.length
            ? Math.round(plot.checklistItems.reduce((sum, item) => sum + item.progressPct, 0) / plot.checklistItems.length)
            : 0;
          return (
            <Link key={plot.id} href={`/owner/plots/${plot.id}`} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-500">{plot.status.replaceAll("_", " ")}</div>
                  <h2 className="mt-1 text-xl font-semibold">{plot.code}</h2>
                </div>
                <span className="chip bg-slate-100 text-slate-700">{plot.areaSqft?.toString() ?? "-"} sq ft</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3"><MapPinned size={16} /><div className="mt-2">CAD</div></div>
                <div className="rounded-lg bg-slate-50 p-3"><Hammer size={16} /><div className="mt-2">{progress}%</div></div>
                <div className="rounded-lg bg-slate-50 p-3"><FileText size={16} /><div className="mt-2">{fullInr(Number(plot.priceInr ?? 0))}</div></div>
              </div>
            </Link>
          );
        })}
        {!plots.length ? <div className="card p-8 text-center text-sm text-slate-500">No owner-linked plots found for this login.</div> : null}
      </section>
    </main>
  );
}
