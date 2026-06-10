import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, LogOut } from "lucide-react";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=/owner");

  const user = await prisma.user.findUnique({ where: { id: session.id }, include: { tenant: true } });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/owner" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-navy-200 bg-navy-100 text-navy-900"><Building2 size={18} /></span>
            <span>
              <span className="block text-sm font-semibold">{user?.tenant?.name ?? "Owner Portal"}</span>
              <span className="block text-xs text-slate-500">Owner portal</span>
            </span>
          </Link>
          <form action="/api/v1/auth/logout" method="post">
            <button className="btn-ghost"><LogOut size={17} />Sign out</button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
