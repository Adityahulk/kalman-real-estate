import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { prisma } from "@/server/db";
import { firmFieldsForUser, firmsForUser } from "@/server/services/firms";
import { getSessionUser } from "@/server/session";
import { FirmSelector } from "./firm-selector";

export const dynamic = "force-dynamic";

export default async function FirmsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const [user, firms, customFields] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.id }, select: { name: true, email: true } }),
    firmsForUser(session),
    firmFieldsForUser(session.id),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-navy-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-navy-200 bg-navy-100 text-navy-900">
              <Building2 size={20} />
            </span>
            <span className="text-sm font-semibold tracking-wide">WIDESTATE OS</span>
          </div>
          <form action="/api/v1/auth/logout" method="post">
            <button className="btn-ghost text-slate-600">Sign out</button>
          </form>
        </header>

        <section className="pt-12">
          <p className="text-sm font-medium text-gold-700">Firm workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome {user?.name ?? "Superadmin"},</h1>
          <p className="mt-2 text-sm text-slate-500">{user?.email}</p>
          <FirmSelector
            firms={firms.map((firm) => ({
              id: firm.id,
              name: firm.name,
              address: firm.address,
              logoDataUrl: firm.logoDataUrl,
            }))}
            customFields={customFields.map((field) => ({ id: field.id, key: field.key, label: field.label }))}
          />
        </section>
      </div>
    </main>
  );
}
