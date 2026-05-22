import type { ChecklistGroup, ChecklistItem, Plot } from "./types";
import { PLOTS } from "./plots";

const TEMPLATES: { group: ChecklistGroup; items: string[] }[] = [
  {
    group: "Structure",
    items: [
      "Excavation & shoring",
      "Raft foundation poured",
      "Ground floor columns & slab",
      "First floor columns & slab",
      "Roof slab",
      "Block work — internal",
      "Block work — external",
      "Plaster — internal",
      "Plaster — external"
    ]
  },
  {
    group: "Plumbing",
    items: [
      "Underground sewer & drainage",
      "Cold & hot water rough-in",
      "Bathroom waste lines",
      "Pressure test",
      "Sanitary ware installation"
    ]
  },
  {
    group: "Electrical",
    items: [
      "Earthing & main DB",
      "Conduit rough-in — slabs",
      "Wall conduits & boxes",
      "Wiring pull",
      "Switchgear & sockets",
      "DISCOM inspection & energization"
    ]
  },
  {
    group: "Finishing",
    items: [
      "Floor tiling — wet areas",
      "Floor tiling — living areas",
      "Kitchen joinery & worktop",
      "Wardrobes & built-ins",
      "Doors & ironmongery",
      "False ceiling & cornices"
    ]
  },
  {
    group: "Paint",
    items: [
      "Primer coat — internal",
      "Putty & sanding",
      "Final coat — internal",
      "External texture & paint"
    ]
  },
  {
    group: "Landscaping",
    items: [
      "Garden grading & topsoil",
      "Irrigation lines",
      "Lawn & ground cover",
      "Boundary planting",
      "Outdoor lighting"
    ]
  }
];

const SAMPLE_PHOTOS = [
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=70",
  "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=70",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=70",
  "https://images.unsplash.com/photo-1503328427499-d92d1ac3d174?auto=format&fit=crop&w=800&q=70",
  "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=70"
];

function buildFor(plot: Plot): ChecklistItem[] {
  const flat = TEMPLATES.flatMap((t) => t.items.map((title) => ({ group: t.group, title })));
  const completedUpto = Math.round((plot.construction / 100) * flat.length);
  return flat.map((entry, idx) => {
    let done = false;
    let progress = 0;
    if (idx < completedUpto) {
      done = true;
      progress = 100;
    } else if (idx === completedUpto && plot.construction < 100) {
      done = false;
      progress = Math.round((plot.construction % (100 / flat.length)) * (flat.length));
      if (progress > 95) progress = 70;
      if (progress < 5) progress = 35;
    }
    const daysAgo = Math.max(1, Math.round((completedUpto - idx + 1) * 6));
    return {
      id: `${plot.id}-cl-${idx}`,
      plotId: plot.id,
      group: entry.group,
      title: entry.title,
      done,
      progress,
      updatedAt: new Date(Date.now() - daysAgo * 86400 * 1000).toISOString(),
      by: idx % 2 === 0 ? "Gurpreet Singh" : "Site Supervisor",
      photo: done || progress > 0 ? SAMPLE_PHOTOS[idx % SAMPLE_PHOTOS.length] : undefined
    };
  });
}

export const CHECKLISTS: Record<string, ChecklistItem[]> = Object.fromEntries(
  PLOTS.filter((p) => p.status !== "available").map((p) => [p.id, buildFor(p)])
);

export function checklistFor(plotId: string): ChecklistItem[] {
  return CHECKLISTS[plotId] ?? [];
}
