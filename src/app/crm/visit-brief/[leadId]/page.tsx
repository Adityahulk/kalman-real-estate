import { headers } from "next/headers";
import QRCode from "qrcode";
import { getCrmVisitBrief } from "@/server/services/crm";
import { buildCrmVisitBriefHtml } from "@/server/services/crm-visit-brief";
import { requirePagePermission } from "@/server/page-auth";
import { VisitBriefActions } from "./visit-brief-actions";

export const dynamic = "force-dynamic";

export default async function CrmVisitBriefPage({ params, searchParams }: { params: Promise<{ leadId: string }>; searchParams: Promise<{ visitId?: string }> }) {
  const session = await requirePagePermission("crm.view");
  const leadId = (await params).leadId;
  const visitId = (await searchParams).visitId;
  const context = { tenantId: session.tenantId, userId: session.id, role: session.role, permissions: session.permissions };
  const data = await getCrmVisitBrief(context, leadId, visitId);
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  const profilePath = data.canViewFullProfile ? `/app/crm/contacts/${data.contact.id}` : `/app/crm/leads/${leadId}`;
  const profileUrl = `${protocol}://${host}${profilePath}`;
  const briefUrl = `${protocol}://${host}/crm/visit-brief/${leadId}${visitId ? `?visitId=${encodeURIComponent(visitId)}` : ""}`;
  const qrDataUrl = await QRCode.toDataURL(profileUrl, { width: 240, margin: 1, color: { dark: "#1A1A2E", light: "#FFFFFF" } });
  const html = buildCrmVisitBriefHtml(data, qrDataUrl, profileUrl);
  return <main className="min-h-screen bg-slate-200"><VisitBriefActions briefUrl={briefUrl} leadId={leadId} salespersonEmail={data.salesperson?.email} salespersonPhone={data.salesperson?.phone} visitId={visitId}/><iframe className="mx-auto block h-[calc(100vh-65px)] w-full max-w-[920px] border-0 bg-white shadow-xl" srcDoc={html} title="Client visit brief"/></main>;
}
