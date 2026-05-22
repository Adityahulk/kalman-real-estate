import type { SiteAsset } from "./types";

export const ASSETS: SiteAsset[] = [
  // ---------- Saldha Land Developers ----------
  // Main entrance road (horizontal across top)
  {
    id: "mh-road-1",
    projectId: "mh",
    type: "road",
    name: "Vrinda Main Avenue",
    status: "complete",
    progress: 100,
    deadline: "2024-12-30",
    contractor: { company: "Punjab Infra Buildwell", manager: "Maninder Gill", phone: "+91 98140 33211" },
    geometry: { kind: "line", points: [[40, 50], [1160, 50]], thickness: 30 },
    updates: [
      { at: "2024-11-21T10:12:00Z", text: "Final asphalt layer laid and compacted.", by: "Gurpreet Singh" }
    ]
  },
  // Internal east-west roads between blocks
  {
    id: "mh-road-2",
    projectId: "mh",
    type: "road",
    name: "Vrinda-Ananta Service Road",
    status: "complete",
    progress: 100,
    deadline: "2025-02-15",
    contractor: { company: "Punjab Infra Buildwell", manager: "Maninder Gill", phone: "+91 98140 33211" },
    geometry: { kind: "line", points: [[40, 320], [1160, 320]], thickness: 22 },
    updates: [{ at: "2025-02-04T08:30:00Z", text: "Storm-water chambers and side drains installed.", by: "Gurpreet Singh" }]
  },
  {
    id: "mh-road-3",
    projectId: "mh",
    type: "road",
    name: "Ananta-Ambey Service Road",
    status: "in_progress",
    progress: 78,
    deadline: "2025-08-30",
    contractor: { company: "Punjab Infra Buildwell", manager: "Maninder Gill", phone: "+91 98140 33211" },
    geometry: { kind: "line", points: [[40, 615], [1160, 615]], thickness: 22 },
    updates: [{ at: "2025-04-12T11:00:00Z", text: "Base course compaction at 78%.", by: "Gurpreet Singh" }]
  },
  // Boundary walls
  {
    id: "mh-boundary",
    projectId: "mh",
    type: "boundary",
    name: "Perimeter Wall",
    status: "complete",
    progress: 100,
    deadline: "2024-09-30",
    contractor: { company: "Tricity Civil Works", manager: "Sandeep Sharma", phone: "+91 98782 22033" },
    geometry: {
      kind: "polygon",
      points: [[20, 20], [1180, 20], [1180, 880], [20, 880]]
    },
    updates: []
  },
  // Clubhouse (right side strip)
  {
    id: "mh-clubhouse",
    projectId: "mh",
    type: "clubhouse",
    name: "Vrinda Community Club",
    status: "in_progress",
    progress: 64,
    deadline: "2026-03-15",
    contractor: { company: "Mohan Buildtech", manager: "Deepak Arora", phone: "+91 98156 77845" },
    geometry: { kind: "rect", x: 1090, y: 100, w: 90, h: 240 },
    updates: [
      { at: "2025-05-01T09:14:00Z", text: "Structural concrete to roof slab complete.", by: "Site Supervisor" },
      { at: "2025-04-18T10:02:00Z", text: "MEP rough-in underway on G+1.", by: "Gurpreet Singh" }
    ]
  },
  // Swimming pool
  {
    id: "mh-pool",
    projectId: "mh",
    type: "pool",
    name: "Residents Pool",
    status: "in_progress",
    progress: 40,
    deadline: "2026-05-30",
    contractor: { company: "Aqua Blue Pools India", manager: "Ravi Sharma", phone: "+91 98761 11088" },
    geometry: { kind: "rect", x: 1090, y: 360, w: 90, h: 130 },
    updates: [{ at: "2025-05-12T13:00:00Z", text: "Excavation complete; waterproof membrane delivered.", by: "Ravi Sharma" }]
  },
  // Park / plantation
  {
    id: "mh-park",
    projectId: "mh",
    type: "plantation",
    name: "Central Plantation Belt",
    status: "in_progress",
    progress: 22,
    deadline: "2026-10-30",
    contractor: { company: "Green Leaf Landscapes", manager: "Aaliya Saini", phone: "+91 98754 22099" },
    geometry: { kind: "rect", x: 1090, y: 510, w: 90, h: 200 },
    updates: [{ at: "2025-05-04T07:45:00Z", text: "Irrigation network laid; topsoil scheduled.", by: "Aaliya Saini" }]
  },
  // Electrical poles (5 dots along right service road)
  ...[120, 320, 500, 700, 850].map((y, i) => ({
    id: `mh-elec-${i + 1}`,
    projectId: "mh",
    type: "electrical" as const,
    name: `Sub-station Feeder ${i + 1}`,
    status: i < 3 ? ("complete" as const) : ("in_progress" as const),
    progress: i < 3 ? 100 : 55 - i * 5,
    deadline: "2025-09-30",
    contractor: { company: "PSPCL Approved - North Electromech", manager: "Imran Bedi", phone: "+91 172 884 1122" },
    geometry: { kind: "dot" as const, x: 30, y, r: 9 },
    updates: []
  })),
  // Water connection points (left side)
  ...[200, 480, 760].map((y, i) => ({
    id: `mh-water-${i + 1}`,
    projectId: "mh",
    type: "water" as const,
    name: `Water Manifold ${i + 1}`,
    status: "complete" as const,
    progress: 100,
    deadline: "2025-01-30",
    contractor: { company: "Punjab Water Utilities", manager: "Karan Mehra", phone: "+91 172 776 5500" },
    geometry: { kind: "dot" as const, x: 60, y, r: 8 },
    updates: []
  })),
  // Main gate
  {
    id: "mh-gate",
    projectId: "mh",
    type: "gate",
    name: "Main Security Gate",
    status: "complete",
    progress: 100,
    deadline: "2024-12-30",
    contractor: { company: "SecureGate Systems", manager: "Amandeep Saini", phone: "+91 172 802 4444" },
    geometry: { kind: "rect", x: 540, y: 10, w: 120, h: 30 },
    updates: []
  },

  // ---------- ALP - Agarwal Land Developers ----------
  {
    id: "pg-road-1",
    projectId: "pg",
    type: "road",
    name: "ALP Central Avenue",
    status: "complete",
    progress: 100,
    deadline: "2025-01-30",
    contractor: { company: "Bharat Roadlines Infra", manager: "Taranpreet Bajwa", phone: "+91 98750 70088" },
    geometry: { kind: "line", points: [[40, 60], [960, 60]], thickness: 24 },
    updates: []
  },
  {
    id: "pg-road-2",
    projectId: "pg",
    type: "road",
    name: "Central Lane",
    status: "in_progress",
    progress: 65,
    deadline: "2025-09-30",
    contractor: { company: "Bharat Roadlines Infra", manager: "Taranpreet Bajwa", phone: "+91 98750 70088" },
    geometry: { kind: "line", points: [[40, 350], [960, 350]], thickness: 18 },
    updates: []
  },
  {
    id: "pg-pool",
    projectId: "pg",
    type: "pool",
    name: "Community Pool",
    status: "planned",
    progress: 0,
    deadline: "2026-06-30",
    contractor: { company: "Aqua Blue Pools India", manager: "Ravi Sharma", phone: "+91 98761 11088" },
    geometry: { kind: "rect", x: 30, y: 380, w: 100, h: 100 },
    updates: []
  },
  {
    id: "pg-park",
    projectId: "pg",
    type: "plantation",
    name: "Family Park",
    status: "in_progress",
    progress: 18,
    deadline: "2026-08-30",
    contractor: { company: "Green Leaf Landscapes", manager: "Aaliya Saini", phone: "+91 98754 22099" },
    geometry: { kind: "rect", x: 30, y: 620, w: 100, h: 150 },
    updates: []
  },
  {
    id: "pg-boundary",
    projectId: "pg",
    type: "boundary",
    name: "Perimeter Wall",
    status: "in_progress",
    progress: 72,
    deadline: "2025-10-30",
    contractor: { company: "Tricity Civil Works", manager: "Sandeep Sharma", phone: "+91 98782 22033" },
    geometry: { kind: "polygon", points: [[15, 15], [985, 15], [985, 785], [15, 785]] },
    updates: []
  },

  // ---------- Sushma Group (early stage) ----------
  {
    id: "dr-road-1",
    projectId: "dr",
    type: "road",
    name: "Zirakpur Access Road",
    status: "in_progress",
    progress: 35,
    deadline: "2026-02-28",
    contractor: { company: "Punjab Infra Buildwell", manager: "Maninder Gill", phone: "+91 98140 33211" },
    geometry: { kind: "line", points: [[40, 50], [1160, 50]], thickness: 28 },
    updates: []
  },
  {
    id: "dr-road-2",
    projectId: "dr",
    type: "road",
    name: "A/B Internal Road",
    status: "planned",
    progress: 0,
    deadline: "2026-08-30",
    contractor: { company: "Punjab Infra Buildwell", manager: "Maninder Gill", phone: "+91 98140 33211" },
    geometry: { kind: "line", points: [[40, 320], [1160, 320]], thickness: 22 },
    updates: []
  },
  {
    id: "dr-road-3",
    projectId: "dr",
    type: "road",
    name: "B/C Internal Road",
    status: "planned",
    progress: 0,
    deadline: "2026-10-30",
    contractor: { company: "Punjab Infra Buildwell", manager: "Maninder Gill", phone: "+91 98140 33211" },
    geometry: { kind: "line", points: [[40, 615], [1160, 615]], thickness: 22 },
    updates: []
  },
  {
    id: "dr-mosque",
    projectId: "dr",
    type: "mosque",
    name: "Community Centre",
    status: "planned",
    progress: 0,
    deadline: "2027-04-30",
    contractor: { company: "Mohan Buildtech", manager: "Baldev Sood", phone: "+91 172 884 7700" },
    geometry: { kind: "rect", x: 1090, y: 100, w: 90, h: 160 },
    updates: []
  },
  {
    id: "dr-boundary",
    projectId: "dr",
    type: "boundary",
    name: "Perimeter Wall",
    status: "in_progress",
    progress: 41,
    deadline: "2025-12-30",
    contractor: { company: "Tricity Civil Works", manager: "Sandeep Sharma", phone: "+91 98782 22033" },
    geometry: { kind: "polygon", points: [[20, 20], [1180, 20], [1180, 880], [20, 880]] },
    updates: []
  }
];

export function assetsByProject(projectId: string) {
  return ASSETS.filter((a) => a.projectId === projectId);
}
