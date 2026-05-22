import type { Owner, Plot, PlotStatus } from "./types";

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FACINGS: Plot["facing"][] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const COMPANIES = [
  "Bansal Infra LLP",
  "Gill Family Holdings",
  "Tricity Capital Partners",
  "Punjab Agro Estates",
  "Northway Realty LLP"
];
const INDIVIDUALS: [string, string, string][] = [
  ["Rajiv Bansal", "+91 98760 41422", "PAN-BNSPB2141K"],
  ["Simran Kaur", "+91 98155 82911", "PAN-KAURS1120P"],
  ["Vikram Malhotra", "+91 98722 10558", "PAN-MLHTV7782R"],
  ["Harleen Sidhu", "+91 95019 98012", "PAN-SIDHH6678Q"],
  ["Gaurav Garg", "+91 99888 22077", "PAN-GARGG2298M"],
  ["Sonia Mehta", "+91 98787 66144", "PAN-MEHTS7710L"],
  ["Rahul Bhatia", "+91 98765 71144", "PAN-BHATR1132A"],
  ["Manpreet Dhillon", "+91 98148 80779", "PAN-DHILM1184D"]
];

function makeOwner(rand: () => number, kind: "individual" | "company" | "sharing"): Owner {
  if (kind === "company") {
    const c = COMPANIES[Math.floor(rand() * COMPANIES.length)];
    return {
      type: "company",
      name: c,
      email: `legal@${c.toLowerCase().replace(/[^a-z]+/g, "")}.in`,
      phone: "+91 172 402 8800",
      kyc: `GSTIN-03${Math.floor(rand() * 1e9).toString().padStart(9, "0")}Z`
    };
  }
  if (kind === "sharing") {
    const a = INDIVIDUALS[Math.floor(rand() * INDIVIDUALS.length)];
    const b = INDIVIDUALS[Math.floor(rand() * INDIVIDUALS.length)];
    return {
      type: "sharing",
      name: `${a[0]} & ${b[0]}`,
      phone: a[1],
      kyc: a[2],
      shares: [
        { name: a[0], pct: 60 },
        { name: b[0], pct: 40 }
      ]
    };
  }
  const p = INDIVIDUALS[Math.floor(rand() * INDIVIDUALS.length)];
  return {
    type: "individual",
    name: p[0],
    phone: p[1],
    kyc: p[2],
    email: `${p[0].split(" ")[0].toLowerCase()}@gmail.com`
  };
}

interface Block {
  name: string;
  cols: number;
  rows: number;
  originX: number;
  originY: number;
  cellW: number;
  cellH: number;
  gap: number;
}

interface GridSpec {
  projectId: string;
  blocks: Block[];
  basePrice: number;
  avgArea: number;
  soldRatio: number;
  allottedRatio: number;
  companyRatio: number;
  progressMax: number;
  seed: number;
}

function genProject(spec: GridSpec): Plot[] {
  const rand = mulberry32(spec.seed);
  const plots: Plot[] = [];
  for (const block of spec.blocks) {
    for (let r = 0; r < block.rows; r++) {
      for (let c = 0; c < block.cols; c++) {
        const idx = plots.filter((p) => p.block === block.name).length + 1;
        const code = `${block.name}-${String(idx).padStart(2, "0")}`;
        const x = block.originX + c * (block.cellW + block.gap);
        const y = block.originY + r * (block.cellH + block.gap);
        const areaJitter = 0.85 + rand() * 0.3;
        const area = Math.round(spec.avgArea * areaJitter);
        const priceJitter = 0.9 + rand() * 0.25;
        const price = Math.round(area * spec.basePrice * priceJitter);
        const roll = rand();
        let status: PlotStatus;
        let owner: Owner | undefined;
        if (roll < spec.soldRatio) {
          status = "sold";
          owner = makeOwner(rand, rand() < 0.3 ? "company" : rand() < 0.5 ? "sharing" : "individual");
        } else if (roll < spec.soldRatio + spec.allottedRatio) {
          status = "allotted";
          owner = makeOwner(rand, rand() < 0.4 ? "company" : "individual");
        } else if (roll < spec.soldRatio + spec.allottedRatio + spec.companyRatio) {
          status = "company";
          owner = { type: "company", name: "Builder Inventory", phone: "+91 172 455 1212", kyc: "GSTIN-03BUILDER001Z" };
        } else {
          status = "available";
        }
        const construction = status === "available" ? 0 : Math.round(rand() * spec.progressMax);
        plots.push({
          id: `${spec.projectId}-${code}`,
          projectId: spec.projectId,
          code,
          area,
          price,
          status,
          owner,
          block: block.name,
          facing: FACINGS[Math.floor(rand() * FACINGS.length)],
          construction,
          registryFiled: status === "sold" && rand() < 0.4,
          shape: { x, y, w: block.cellW, h: block.cellH }
        });
      }
    }
  }
  return plots;
}

// Saldha Land Developers: viewBox 1200x900. 3 blocks of 8x2 = 48 plots arranged around central amenities.
const MH_PLOTS = genProject({
  projectId: "mh",
  basePrice: 5200,
  avgArea: 2250,
  soldRatio: 0.55,
  allottedRatio: 0.12,
  companyRatio: 0.08,
  progressMax: 95,
  seed: 1337,
  blocks: [
    { name: "A", cols: 8, rows: 2, originX: 80, originY: 90,  cellW: 125, cellH: 105, gap: 8 },
    { name: "B", cols: 8, rows: 2, originX: 80, originY: 380, cellW: 125, cellH: 105, gap: 8 },
    { name: "C", cols: 8, rows: 2, originX: 80, originY: 670, cellW: 125, cellH: 105, gap: 8 }
  ]
});

// ALP - Agarwal Land Developers: viewBox 1000x800. 32 plotted units and row houses.
const PG_PLOTS = genProject({
  projectId: "pg",
  basePrice: 4700,
  avgArea: 1900,
  soldRatio: 0.5,
  allottedRatio: 0.12,
  companyRatio: 0.07,
  progressMax: 60,
  seed: 7777,
  blocks: [
    { name: "A", cols: 6, rows: 2, originX: 80, originY: 110, cellW: 135, cellH: 115, gap: 10 },
    { name: "B", cols: 5, rows: 2, originX: 145, originY: 400, cellW: 135, cellH: 115, gap: 10 },
    { name: "C", cols: 5, rows: 2, originX: 145, originY: 650, cellW: 135, cellH: 115, gap: 10 }
  ]
});

// Sushma Group: viewBox 1200x900. 48 plots, mostly available in a launch-stage sector.
const DR_PLOTS = genProject({
  projectId: "dr",
  basePrice: 6100,
  avgArea: 1800,
  soldRatio: 0.1,
  allottedRatio: 0.04,
  companyRatio: 0.06,
  progressMax: 25,
  seed: 4242,
  blocks: [
    { name: "A", cols: 8, rows: 2, originX: 80, originY: 90,  cellW: 125, cellH: 105, gap: 8 },
    { name: "B", cols: 8, rows: 2, originX: 80, originY: 380, cellW: 125, cellH: 105, gap: 8 },
    { name: "C", cols: 8, rows: 2, originX: 80, originY: 670, cellW: 125, cellH: 105, gap: 8 }
  ]
});

export const PLOTS: Plot[] = [...MH_PLOTS, ...PG_PLOTS, ...DR_PLOTS];

export function plotsByProject(projectId: string) {
  return PLOTS.filter((p) => p.projectId === projectId);
}
export function findPlot(id: string) {
  return PLOTS.find((p) => p.id === id);
}
