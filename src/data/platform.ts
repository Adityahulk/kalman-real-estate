import { ASSETS } from "./assets";
import { AUDITS } from "./audits";
import { CHECKLISTS } from "./checklists";
import { PLOTS } from "./plots";
import { PROJECTS } from "./projects";
import { PERSONAS } from "./users";

export type DocumentStatus = "draft" | "pending_approval" | "approved" | "issued";
export type PaymentStatus = "pending" | "part_paid" | "paid" | "blocked";

export interface Tenant {
  id: string;
  name: string;
  region: string;
  gstin: string;
  plan: "demo" | "growth" | "enterprise";
  crmUrl: string;
}

export interface GeneratedDocument {
  id: string;
  tenantId: string;
  projectId: string;
  plotId: string;
  type: "allotment_letter" | "transfer_letter" | "registry_file" | "contractor_work_order";
  title: string;
  status: DocumentStatus;
  version: number;
  issuedTo: string;
  generatedAt: string;
}

export interface BOQItem {
  id: string;
  tenantId: string;
  projectId: string;
  cadEntityId?: string;
  category: "civil" | "road" | "electrical" | "plumbing" | "landscape" | "finishing";
  item: string;
  plannedQty: number;
  actualQty: number;
  unit: string;
  plannedCost: number;
  committedCost: number;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  projectId: string;
  vendor: string;
  amount: number;
  status: PaymentStatus;
  linkedBoqIds: string[];
  dueDate: string;
}

export interface PlatformNotification {
  id: string;
  tenantId: string;
  role: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "approval";
}

export const TENANTS: Tenant[] = [
  {
    id: "tenant-demo",
    name: "Kalman North India Builder Portfolio",
    region: "Punjab / Chandigarh / Mohali",
    gstin: "03KALMANDEMO1Z5",
    plan: "enterprise",
    crmUrl: "https://crm.example.com/kalman-demo"
  }
];

export const GENERATED_DOCUMENTS: GeneratedDocument[] = [
  {
    id: "doc-allot-a12",
    tenantId: "tenant-demo",
    projectId: "mh",
    plotId: "mh-A-12",
    type: "allotment_letter",
    title: "Allotment Letter - Plot A-12",
    status: "issued",
    version: 2,
    issuedTo: "Manpreet Dhillon",
    generatedAt: "2026-05-24T10:30:00.000Z"
  },
  {
    id: "doc-transfer-a08",
    tenantId: "tenant-demo",
    projectId: "mh",
    plotId: "mh-A-08",
    type: "transfer_letter",
    title: "Transfer Letter - Plot A-08",
    status: "pending_approval",
    version: 1,
    issuedTo: "Rajiv Bansal",
    generatedAt: "2026-05-25T14:05:00.000Z"
  }
];

export const BOQ_ITEMS: BOQItem[] = [
  {
    id: "boq-road-01",
    tenantId: "tenant-demo",
    projectId: "mh",
    cadEntityId: "cad-ent-road-1",
    category: "road",
    item: "Main avenue WMM + asphalt",
    plannedQty: 940,
    actualQty: 972,
    unit: "running ft",
    plannedCost: 14_200_000,
    committedCost: 15_150_000
  },
  {
    id: "boq-boundary-01",
    tenantId: "tenant-demo",
    projectId: "mh",
    cadEntityId: "cad-ent-boundary-1",
    category: "civil",
    item: "Perimeter wall",
    plannedQty: 3380,
    actualQty: 3380,
    unit: "running ft",
    plannedCost: 20_500_000,
    committedCost: 19_950_000
  },
  {
    id: "boq-elec-01",
    tenantId: "tenant-demo",
    projectId: "mh",
    cadEntityId: "cad-ent-elec-1",
    category: "electrical",
    item: "Feeder cable and poles",
    plannedQty: 980,
    actualQty: 1045,
    unit: "running ft",
    plannedCost: 8_400_000,
    committedCost: 9_280_000
  }
];

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: "po-road-001",
    tenantId: "tenant-demo",
    projectId: "mh",
    vendor: "Punjab Infra Buildwell",
    amount: 15_150_000,
    status: "part_paid",
    linkedBoqIds: ["boq-road-01"],
    dueDate: "2026-06-12"
  },
  {
    id: "po-elec-004",
    tenantId: "tenant-demo",
    projectId: "mh",
    vendor: "North Electromech",
    amount: 9_280_000,
    status: "pending",
    linkedBoqIds: ["boq-elec-01"],
    dueDate: "2026-06-20"
  }
];

export const NOTIFICATIONS: PlatformNotification[] = [
  {
    id: "notify-cad-review",
    tenantId: "tenant-demo",
    role: "builder_admin",
    title: "CAD review pending",
    body: "Saldha site CAD has 2 review warnings before publish.",
    severity: "approval"
  },
  {
    id: "notify-cost-risk",
    tenantId: "tenant-demo",
    role: "finance_manager",
    title: "Electrical BOQ variance",
    body: "Actual feeder quantity is 6.6% above plan. Review purchase order PO-ELEC-004.",
    severity: "warning"
  },
  {
    id: "notify-owner-update",
    tenantId: "tenant-demo",
    role: "plot_owner",
    title: "Plot progress updated",
    body: "Plot A-12 plumbing checklist has a new engineer update.",
    severity: "info"
  }
];

export function platformOverview(tenantId = "tenant-demo") {
  const projects = PROJECTS;
  const plots = PLOTS;
  const assets = ASSETS;
  const checklists = Object.values(CHECKLISTS).flat();
  const boqVariance = BOQ_ITEMS.reduce((sum, item) => sum + (item.committedCost - item.plannedCost), 0);

  return {
    tenant: TENANTS.find((tenant) => tenant.id === tenantId) ?? TENANTS[0],
    counts: {
      users: PERSONAS.length,
      projects: projects.length,
      plots: plots.length,
      siteAssets: assets.length,
      checklistItems: checklists.length,
      auditEvents: AUDITS.length,
      generatedDocuments: GENERATED_DOCUMENTS.length,
      purchaseOrders: PURCHASE_ORDERS.length,
      notifications: NOTIFICATIONS.length
    },
    finance: {
      budget: projects.reduce((sum, project) => sum + project.budget, 0),
      spent: projects.reduce((sum, project) => sum + project.spent, 0),
      plannedBoq: BOQ_ITEMS.reduce((sum, item) => sum + item.plannedCost, 0),
      committedBoq: BOQ_ITEMS.reduce((sum, item) => sum + item.committedCost, 0),
      boqVariance
    },
    documents: GENERATED_DOCUMENTS,
    purchaseOrders: PURCHASE_ORDERS,
    notifications: NOTIFICATIONS,
    crm: {
      mode: "external_link",
      url: TENANTS[0].crmUrl,
      contextSupported: ["tenantId", "projectId", "plotId", "leadId"]
    },
    security: {
      tenantIsolation: true,
      ownerPortalScopedByPlot: true,
      rawCadRestrictedToAdmins: true,
      mutatingActionsWriteAuditEvents: true
    }
  };
}
