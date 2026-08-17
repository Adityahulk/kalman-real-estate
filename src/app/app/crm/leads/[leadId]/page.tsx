import { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { hasPermission } from "@/server/rbac";
import { getCrmLead } from "@/server/services/crm";
import { CrmNav } from "../../crm-nav";
import { requireCrmContext } from "../../crm-page-context";
import { LeadWorkspace } from "./lead-workspace";

export const dynamic = "force-dynamic";

export default async function CrmLeadPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { session, context } = await requireCrmContext();
  let data;
  try {
    data = await getCrmLead(context, (await params).leadId);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") notFound();
    throw error;
  }
  return <main className="px-4 py-6 lg:px-8"><CrmNav canManageSettings={hasPermission(session.role, "crm.assign", session.permissions)}/><LeadWorkspace canAssign={hasPermission(session.role, "crm.assign", session.permissions)} data={JSON.parse(JSON.stringify(data))}/></main>;
}
