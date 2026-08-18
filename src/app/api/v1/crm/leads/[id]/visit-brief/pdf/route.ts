import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { apiError, getRequestContext } from "@/server/api";
import { getCrmVisitBrief } from "@/server/services/crm";
import { buildCrmVisitBriefHtml } from "@/server/services/crm-visit-brief";
import { renderStandaloneHtmlToPdf } from "@/server/services/letter-pdf-puppeteer";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getRequestContext(request, "crm.view");
    const leadId = (await params).id;
    const visitId = request.nextUrl.searchParams.get("visitId") || undefined;
    const data = await getCrmVisitBrief(context, leadId, visitId);
    const profilePath = data.canViewFullProfile ? `/app/crm/contacts/${data.contact.id}` : `/app/crm/leads/${leadId}`;
    const profileUrl = `${request.nextUrl.origin}${profilePath}`;
    const qrDataUrl = await QRCode.toDataURL(profileUrl, { width: 240, margin: 1, color: { dark: "#1A1A2E", light: "#FFFFFF" } });
    const pdf = await renderStandaloneHtmlToPdf(buildCrmVisitBriefHtml(data, qrDataUrl, profileUrl));
    const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    return new Response(body, { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${safe(data.contact.name)}-${safe(data.project?.name || "visit")}-brief.pdf"`, "cache-control": "no-store" } });
  } catch (error) {
    return apiError(error, { route: "GET /api/v1/crm/leads/[id]/visit-brief/pdf" });
  }
}

function safe(value: string) { return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase(); }
