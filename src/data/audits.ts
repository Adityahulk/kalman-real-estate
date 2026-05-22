import type { AuditEvent } from "./types";
import { PLOTS } from "./plots";

// Build deterministic audit history for non-available plots.
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(99);

function isoMinus(daysAgo: number) {
  return new Date(Date.now() - daysAgo * 86400 * 1000).toISOString();
}

const PRIOR_OWNERS = [
  "Bansal Infra LLP",
  "Amanpreet Kaur",
  "Pratik Joshi",
  "Hardeep Builders"
];

export const AUDITS: AuditEvent[] = PLOTS.flatMap((p) => {
  const events: AuditEvent[] = [];
  let counter = 0;
  const newId = () => `${p.id}-ev-${++counter}`;
  if (p.status === "company") {
    events.push({
      id: newId(),
      plotId: p.id,
      at: isoMinus(720),
      kind: "company_reserved",
      text: "Plot retained on the company balance sheet for long-term hold.",
      by: "Amit Kalra"
    });
  } else if (p.status === "allotted") {
    events.push({
      id: newId(),
      plotId: p.id,
      at: isoMinus(200 + Math.floor(rand() * 200)),
      kind: "allotted",
      text: `Allotted to ${p.owner?.name}. Allotment letter issued.`,
      by: "Amit Kalra",
      amount: p.price
    });
  } else if (p.status === "sold") {
    const sold180 = 180 + Math.floor(rand() * 400);
    // First allotted to prior owner
    if (rand() < 0.5) {
      const prior = PRIOR_OWNERS[Math.floor(rand() * PRIOR_OWNERS.length)];
      events.push({
        id: newId(),
        plotId: p.id,
        at: isoMinus(sold180 + 120),
        kind: "allotted",
        text: `Originally allotted to ${prior}.`,
        by: "Amit Kalra",
        amount: Math.round(p.price * 0.85)
      });
      events.push({
        id: newId(),
        plotId: p.id,
        at: isoMinus(sold180),
        kind: "transferred",
        text: `Transferred from ${prior} to ${p.owner?.name}. Transfer letter generated.`,
        by: prior,
        amount: p.price
      });
    } else {
      events.push({
        id: newId(),
        plotId: p.id,
        at: isoMinus(sold180),
        kind: "allotted",
        text: `Sold and allotted to ${p.owner?.name}.`,
        by: "Amit Kalra",
        amount: p.price
      });
    }
    if (p.registryFiled) {
      events.push({
        id: newId(),
        plotId: p.id,
        at: isoMinus(Math.max(10, sold180 - 60)),
        kind: "registry",
        text: "Marked as filed with the local revenue office for registry.",
        by: p.owner?.name ?? ""
      });
    }
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
});

export function auditsByPlot(plotId: string) {
  return AUDITS.filter((a) => a.plotId === plotId).sort((a, b) => b.at.localeCompare(a.at));
}
