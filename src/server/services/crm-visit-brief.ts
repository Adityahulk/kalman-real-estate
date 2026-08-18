type BriefData = Awaited<ReturnType<typeof import("./crm").getCrmVisitBrief>>;

export function buildCrmVisitBriefHtml(data: BriefData, qrDataUrl: string, profileUrl: string) {
  const { lead, contact, visit, project, source, salesperson, caller, tenant } = data;
  const activities = data.activities.filter((item) => ["INCOMING_CALL", "OUTGOING_CALL", "NOTE"].includes(item.type)).slice(0, 6);
  const previousVisits = data.visits.filter((item) => item.id !== visit?.id).slice(0, 4);
  const nextFollowUp = data.followUps.find((item) => ["PENDING", "OVERDUE"].includes(item.status));
  const projectMap = Object.fromEntries(data.projects.map((item) => [item.id, item.name]));
  const otherInteractions = data.otherInteractions.slice(0, 5);
  const money = (value: unknown) => value ? `₹${Number(value).toLocaleString("en-IN")}` : "Not recorded";
  const dateTime = (value: Date | string | null | undefined) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";
  const list = (value: unknown) => Array.isArray(value) && value.length ? value.join(", ") : "Not recorded";
  const rows = (items: Array<[string, unknown]>) => items.map(([label, value]) => `<div class="brief-row"><dt>${esc(label)}</dt><dd>${esc(String(value || "Not recorded"))}</dd></div>`).join("");
  const activityRows = activities.length ? activities.map((item) => `<tr><td>${esc(dateTime(item.occurredAt))}</td><td>${esc(item.title)}</td><td>${esc(item.outcome || item.notes || "-")}</td></tr>`).join("") : `<tr><td colspan="3">No previous calls recorded.</td></tr>`;
  const visitRows = previousVisits.length ? previousVisits.map((item) => `<tr><td>${esc(dateTime(item.scheduledAt))}</td><td>${esc(item.visitCode)}</td><td>${esc(item.customerResponse || item.status)}</td></tr>`).join("") : `<tr><td colspan="3">No previous visits recorded.</td></tr>`;
  const otherRows = otherInteractions.length ? `<section class="brief-section compact"><h2>Other company interactions</h2><ul>${otherInteractions.map((item) => `<li>${esc(projectMap[item.projectId || ""] || "Unassigned project")} · ${esc(dateTime(item.firstEnquiryAt))} · ${esc(item.status)}</li>`).join("")}</ul></section>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(contact.name)} · Client visit brief</title><style>${VISIT_BRIEF_CSS}</style></head><body><article class="brief-page">
    <header class="brief-header"><div>${tenant?.logoDataUrl ? `<img src="${esc(tenant.logoDataUrl)}" alt="">` : ""}<div><p>${esc(tenant?.name || "WIDESTATE OS")}</p><h1>Client Visit Brief</h1><span>${esc(project?.name || "Project not selected")} · ${esc(visit?.visitCode || lead.leadCode)}</span></div></div><div class="brief-qr"><div><b>Live CRM record</b><span>Permission-controlled</span></div><img src="${esc(qrDataUrl)}" alt="QR code"></div></header>
    <div class="brief-grid two">
      <section class="brief-section"><h2>Client information</h2><dl>${rows([["Client", contact.name],["Primary number", contact.primaryPhone],["Alternate number", contact.alternatePhone],["Location", [contact.area, contact.city].filter(Boolean).join(", ")],["Lead ID", lead.leadCode],["Client type", contact.clientType]])}</dl></section>
      <section class="brief-section"><h2>Current project</h2><dl>${rows([["Project", project?.name],["Location", [project?.city, project?.state].filter(Boolean).join(", ")],["Interested property", lead.propertyType],["Preferred plot / unit", lead.interestedProperty],["Budget", `${money(lead.budgetMinInr)} – ${money(lead.budgetMaxInr)}`],["Purchase timeline", lead.purchaseTimeline],["Lead potential", lead.potential],["Current status", lead.status]])}</dl></section>
    </div>
    <section class="brief-section"><h2>Client history</h2><dl class="brief-grid three">${rows([["First enquiry", dateTime(lead.firstEnquiryAt)],["Lead source", source?.name],["Requested information", lead.requestedInformation],["Previous interaction", contact.previousInteraction],["Previous objections", lead.mainObjections],["Last interaction", dateTime(lead.lastContactAt)]])}</dl><table><thead><tr><th>Date</th><th>Interaction</th><th>Notes / outcome</th></tr></thead><tbody>${activityRows}</tbody></table><table><thead><tr><th>Date</th><th>Previous visit</th><th>Result</th></tr></thead><tbody>${visitRows}</tbody></table></section>
    <div class="brief-grid two">
      <section class="brief-section accent"><h2>Today's visit</h2><dl>${rows([["Visit date / time", dateTime(visit?.scheduledAt)],["Assigned salesperson", salesperson?.name],["Visit purpose", visit?.visitPurpose],["Property / unit to show", visit?.propertyToShow || lead.interestedProperty],["Special instructions", visit?.specialRequirements]])}</dl></section>
      <section class="brief-section"><h2>Sales information</h2><dl>${rows([["Price discussed", money(lead.priceDiscussedInr)],["Offers / discounts", lead.offersDiscounts],["Payment preference", lead.paymentPreference],["Negotiation status", lead.negotiationStatus],["Main objections", lead.mainObjections],["Competitor comparison", lead.competitorComparison]])}</dl></section>
    </div>
    <section class="brief-section"><h2>Follow-up</h2><dl class="brief-grid three">${rows([["Last interaction", dateTime(lead.lastContactAt)],["Next follow-up", dateTime(nextFollowUp?.dueAt || lead.nextFollowUpAt)],["Next action", nextFollowUp?.actionType],["Person responsible", salesperson?.name || caller?.name]])}</dl></section>
    ${otherRows}
    <section class="brief-section after"><h2>After visit</h2><div class="brief-grid two"><dl>${rows([["Customer response", visit?.customerResponse],["Properties shown", list(visit?.propertiesShown)],["Customer liked", list(visit?.propertiesLiked)],["Customer disliked", list(visit?.customerDisliked)]])}</dl><dl>${rows([["Objections", visit?.objections],["Revised requirement", visit?.revisedRequirement],["Probability of booking", visit?.purchaseProbability == null ? null : `${visit.purchaseProbability}%`],["Next action", visit?.salespersonNextAction],["Next follow-up", dateTime(visit?.nextFollowUpAt)]])}</dl></div></section>
    <p class="brief-record-url">Live record: ${esc(profileUrl)}</p>
  </article></body></html>`;
}

export const VISIT_BRIEF_CSS = `
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #e9eef3; color: #182235; font-family: Arial, Helvetica, sans-serif; font-size: 10.2px; line-height: 1.35; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .brief-page { width: 190mm; min-height: 277mm; margin: 12px auto; padding: 0; background: white; }
  .brief-header { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; border-bottom:3px solid #2D5986; padding:0 0 10px; margin-bottom:10px; }
  .brief-header > div:first-child { display:flex; gap:10px; align-items:center; }
  .brief-header img { width:42px; height:42px; object-fit:contain; }
  .brief-header p { margin:0; color:#5A8A6E; font-size:9px; font-weight:700; text-transform:uppercase; }
  .brief-header h1 { margin:1px 0; color:#1A1A2E; font-size:22px; line-height:1.05; }
  .brief-header span { color:#6B7A8D; }
  .brief-qr { display:flex; align-items:center; gap:8px; color:#6B7A8D; font-size:8px; text-align:right; text-transform:uppercase; }
  .brief-qr b, .brief-qr span { display:block; } .brief-qr img { width:17mm; height:17mm; }
  .brief-grid { display:grid; gap:8px; }
  .brief-grid.two { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .brief-grid.three { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .brief-section { break-inside:avoid; border:1px solid #d7e1ea; margin:0 0 8px; padding:8px 10px; }
  .brief-section.accent { border-left:4px solid #5A8A6E; background:#f7fbf8; }
  .brief-section h2 { margin:-8px -10px 7px; padding:5px 9px; background:#E8F0F7; color:#2D5986; font-size:10px; letter-spacing:.04em; text-transform:uppercase; }
  .brief-section.compact ul { margin:0; padding-left:18px; }
  .brief-row { display:grid; grid-template-columns:38% minmax(0,1fr); gap:6px; padding:2px 0; border-bottom:1px dotted #d7e1ea; }
  .brief-row:last-child { border-bottom:0; }
  dt { color:#6B7A8D; } dd { margin:0; font-weight:600; overflow-wrap:anywhere; }
  table { width:100%; border-collapse:collapse; margin-top:7px; font-size:9px; }
  th, td { border:1px solid #d7e1ea; padding:4px 5px; text-align:left; vertical-align:top; }
  th { background:#f6f8fa; color:#5d6b7e; font-weight:700; }
  .after { min-height:32mm; }
  .brief-record-url { margin:4px 0 0; color:#8a98aa; font-size:7px; overflow-wrap:anywhere; }
  @media print { html, body { background:white; } .brief-page { margin:0; } }
`;

function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}
