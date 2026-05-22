import type { Project } from "./types";

export const PROJECTS: Project[] = [
  {
    id: "mh",
    name: "Saldha Land Developers",
    city: "Punjab Growth Corridor",
    cover:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
    tagline: "Operating Vrinda Enclave, Ananta Enclaves and Ambey Homes across plotted colonies, villas and community infrastructure.",
    totalPlots: 48,
    sold: 26,
    available: 12,
    startedAt: "2024-03-01",
    handoverAt: "2027-06-30",
    progress: 58,
    budget: 4_120_000_000,
    spent: 2_380_000_000,
    viewBox: { w: 1200, h: 900 }
  },
  {
    id: "pg",
    name: "ALP - Agarwal Land Developers",
    city: "Ludhiana - Chandigarh Belt",
    cover:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80",
    tagline: "Integrated township execution for premium plots, row houses, internal roads, parks and utility-ready possessions.",
    totalPlots: 32,
    sold: 16,
    available: 10,
    startedAt: "2024-08-15",
    handoverAt: "2026-12-15",
    progress: 34,
    budget: 1_680_000_000,
    spent: 610_000_000,
    viewBox: { w: 1000, h: 800 }
  },
  {
    id: "dr",
    name: "Sushma Group",
    city: "Zirakpur - Mohali Region",
    cover:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=80",
    tagline: "Regional builder portfolio covering Sushma Valencia, Sushma Belleza and Sushma Grande style plotted and villa infrastructure.",
    totalPlots: 48,
    sold: 5,
    available: 38,
    startedAt: "2025-02-01",
    handoverAt: "2028-03-31",
    progress: 9,
    budget: 2_350_000_000,
    spent: 210_000_000,
    viewBox: { w: 1200, h: 900 }
  }
];

export function findProject(id: string) {
  return PROJECTS.find((p) => p.id === id);
}
