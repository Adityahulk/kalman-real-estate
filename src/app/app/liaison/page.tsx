import { Landmark } from "lucide-react";
import { hasPermission } from "@/server/rbac";
import { prisma } from "@/server/db";
import { requirePagePermission } from "@/server/page-auth";
import { listApprovals } from "@/server/services/approvals";
import { LiaisonManager } from "./liaison-manager";

export const dynamic = "force-dynamic";

export default async function LiaisonPage() {
  const session = await requirePagePermission("liaison.view");

  const context = { tenantId: session.tenantId, userId: session.id, role: session.role, projectIds: session.projectIds };
  const [approvals, projects] = await Promise.all([
    listApprovals(context),
    prisma.project.findMany({ where: { tenantId: session.tenantId, ...(Array.isArray(session.projectIds) ? { id: { in: session.projectIds } } : {}) }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="px-4 py-6 lg:px-8">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Landmark size={22} className="text-navy-800" />
          <h1 className="text-3xl font-semibold tracking-tight">Government approvals</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          RERA, LDC, CLU, NOCs, licenses, agreements and government letters — with version history and expiry tracking.
        </p>
      </div>
      <LiaisonManager
        initial={approvals.map((a) => ({
          id: a.id,
          type: a.type,
          title: a.title,
          number: a.number,
          authority: a.authority,
          version: a.version,
          status: a.status,
          projectName: a.projectName,
          fileAssetId: a.fileAssetId,
          issuedAt: a.issuedAt ? a.issuedAt.toISOString() : null,
          expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
          expiryState: a.expiryState,
        }))}
        projects={projects}
        canManage={hasPermission(session.role, "liaison.manage", session.permissions)}
      />
    </main>
  );
}
