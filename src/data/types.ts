export type Role =
  | "super_admin"
  | "site_engineer"
  | "plot_owner"
  | "marketing_head"
  | "videographer"
  | "editor";

export type PlotStatus = "available" | "allotted" | "sold" | "company" | "registry";

export type OwnerType = "individual" | "company" | "sharing";

export interface Owner {
  type: OwnerType;
  name: string;
  email?: string;
  phone?: string;
  kyc?: string;
  shares?: { name: string; pct: number }[];
}

export interface Plot {
  id: string;
  projectId: string;
  code: string;          // e.g. "A-12"
  area: number;          // sqft
  price: number;         // INR
  status: PlotStatus;
  owner?: Owner;
  shape: { x: number; y: number; w: number; h: number; rotate?: number };
  block: string;         // "A" | "B" | ...
  facing: "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW";
  construction: number;  // 0-100 progress
  registryFiled?: boolean;
}

export type AssetType =
  | "road"
  | "boundary"
  | "electrical"
  | "water"
  | "plantation"
  | "clubhouse"
  | "pool"
  | "park"
  | "gate"
  | "mosque";

export interface SiteAsset {
  id: string;
  projectId: string;
  type: AssetType;
  name: string;
  status: "planned" | "in_progress" | "delayed" | "complete";
  progress: number;
  deadline: string; // iso
  contractor: { company: string; manager: string; phone: string };
  geometry:
    | { kind: "rect"; x: number; y: number; w: number; h: number }
    | { kind: "line"; points: [number, number][]; thickness: number }
    | { kind: "dot"; x: number; y: number; r: number }
    | { kind: "polygon"; points: [number, number][] };
  updates: { at: string; text: string; by: string }[];
}

export interface Project {
  id: string;
  name: string;
  city: string;
  cover: string;
  tagline: string;
  totalPlots: number;
  sold: number;
  available: number;
  startedAt: string;
  handoverAt: string;
  progress: number;
  budget: number;   // INR
  spent: number;
  viewBox: { w: number; h: number };
}

export interface AuditEvent {
  id: string;
  plotId: string;
  at: string;
  kind: "allotted" | "transferred" | "registry" | "company_reserved" | "price_update";
  text: string;
  by: string;
  amount?: number;
}

export type ChecklistGroup =
  | "Structure"
  | "Plumbing"
  | "Electrical"
  | "Finishing"
  | "Paint"
  | "Landscaping";

export interface ChecklistItem {
  id: string;
  plotId: string;
  group: ChecklistGroup;
  title: string;
  done: boolean;
  progress: number;
  updatedAt: string;
  by?: string;
  photo?: string;
}

export type VideoStatus =
  | "Briefed"
  | "Shooting"
  | "Raw Uploaded"
  | "Editing"
  | "Review"
  | "Approved";

export interface VideoTask {
  id: string;
  projectId: string;
  title: string;
  brief: string;
  status: VideoStatus;
  assignedTo: string; // user name
  editor?: string;
  due: string;
  thumbnail: string;
  rawUrl?: string;
  editedUrl?: string;
  comments: { by: string; at: string; text: string }[];
}

export interface AIInsight {
  id: string;
  projectId: string;
  severity: "info" | "warning" | "savings";
  title: string;
  body: string;
  impact: string; // human readable INR savings or % risk
}
