import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, created, parseJson } from "@/server/api";
import { prisma } from "@/server/db";

const demoRequestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  company: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(7).max(30),
  email: z.union([z.string().trim().email().max(160), z.literal("")]).optional(),
  city: z.string().trim().max(100).optional(),
  activeProjects: z.string().trim().max(30).optional(),
  requirement: z.string().trim().min(2).max(160),
  preferredTime: z.string().trim().max(160).optional(),
  website: z.string().max(0).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const input = await parseJson(request, demoRequestSchema);
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");
    const normalizedEmail = input.email?.toLowerCase() ?? "";
    const recent = await prisma.demoRequest.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
        OR: [
          { phone: input.phone },
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ],
      },
    });
    if (recent >= 3) {
      const error = new Error("We already received your request. Our team will contact you shortly.");
      error.name = "BadRequestError";
      throw error;
    }

    const lead = await prisma.demoRequest.create({
      data: {
        name: input.name,
        company: input.company,
        phone: input.phone,
        email: normalizedEmail,
        city: input.city || "Not provided",
        activeProjects: input.activeProjects || "Not provided",
        requirement: input.requirement,
        preferredTime: input.preferredTime || "Contact by phone or WhatsApp",
        source: "PUBLIC_LANDING_PAGE",
        ipAddress,
        userAgent: request.headers.get("user-agent"),
      },
    });

    const delivery = await deliverLead({
      id: lead.id,
      name: lead.name,
      company: lead.company,
      phone: lead.phone,
      email: lead.email,
      city: lead.city,
      activeProjects: lead.activeProjects,
      requirement: lead.requirement,
      preferredTime: lead.preferredTime,
    });

    return created({ id: lead.id, received: true, delivery });
  } catch (error) {
    return apiError(error);
  }
}

async function deliverLead(lead: Record<string, string>) {
  const results: Record<string, boolean> = {};
  if (process.env.DEMO_LEAD_WEBHOOK_URL) {
    results.webhook = await fetch(process.env.DEMO_LEAD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.DEMO_LEAD_WEBHOOK_TOKEN ? { authorization: `Bearer ${process.env.DEMO_LEAD_WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify({ event: "widestate.demo_requested", lead }),
      signal: AbortSignal.timeout(8_000),
    }).then((response) => response.ok).catch(() => false);
  }
  if (process.env.RESEND_API_KEY && process.env.DEMO_LEAD_NOTIFY_EMAIL && process.env.DEMO_LEAD_FROM_EMAIL) {
    results.email = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.DEMO_LEAD_FROM_EMAIL,
        to: [process.env.DEMO_LEAD_NOTIFY_EMAIL],
        subject: `WIDESTATE demo request · ${lead.company}`,
        text: Object.entries(lead).map(([key, value]) => `${key}: ${value}`).join("\n"),
      }),
      signal: AbortSignal.timeout(8_000),
    }).then((response) => response.ok).catch(() => false);
  }
  return results;
}
