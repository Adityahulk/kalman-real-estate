import { NextRequest, NextResponse } from "next/server";
import { apiError, getRequestContext } from "@/server/api";
import { listCrmLeads } from "@/server/services/crm";

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "crm.reports");
    const data = await listCrmLeads(context, { q: request.nextUrl.searchParams.get("q") || undefined });
    const sources = Object.fromEntries(data.sources.map((item) => [item.id, item.name]));
    const projects = Object.fromEntries(data.projects.map((item) => [item.id, item.name]));
    const users = Object.fromEntries(data.users.map((item) => [item.id, item.name]));
    const rows = [["Lead ID","Name","Primary Phone","WhatsApp","Email","City","Source","Project","Property","Status","Potential","Caller","Salesperson","Next Follow-up","Created"]];
    data.leads.forEach((lead) => rows.push([lead.leadCode, lead.name, lead.primaryPhone, lead.whatsappPhone || "", lead.email || "", lead.city || "", sources[lead.sourceId || ""] || "", projects[lead.interestedProjectId || ""] || "", lead.interestedProperty || lead.propertyType || "", lead.status, lead.potential, users[lead.assignedCallerId || ""] || "", users[lead.assignedSalespersonId || ""] || "", lead.nextFollowUpAt?.toISOString() || "", lead.createdAt.toISOString()]));
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="widestate-crm-leads-${new Date().toISOString().slice(0,10)}.csv"` } });
  } catch (error) { return apiError(error, { route: "GET /api/v1/crm/export" }); }
}
function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }
