export type PortfolioEvidence = "NAMED_ENGAGEMENT" | "CONFIDENTIAL_ENGAGEMENT" | "PRODUCT_CAPABILITY";

export type PortfolioEngagement = {
  slug: string;
  displayName: string;
  descriptor: string;
  evidence: PortfolioEvidence;
  publicationApproved: boolean;
  featured: boolean;
  categories: string[];
  status: string;
  summary: string;
  requirement: string;
  delivered: string[];
  outcomes: string[];
  projects?: string[];
};

export const portfolioSolutions = [
  {
    slug: "widestate-os",
    label: "WIDESTATE OS",
    eyebrow: "Builder operating system",
    summary: "Connect projects, ownership, legal records, construction, costs, marketing and owner services without forcing every team into one screen.",
    outcomes: ["One operational record across projects", "Management visibility without chasing updates", "Configurable workflows for different builder structures"],
  },
  {
    slug: "real-estate-crm",
    label: "Real Estate CRM + CLM",
    eyebrow: "Revenue and customer lifecycle",
    summary: "Carry every enquiry from campaign and follow-up through site visit, inventory matching, booking and the post-booking customer relationship.",
    outcomes: ["Clear sales accountability", "Live project and inventory context", "Clean handover from sales to ownership"],
  },
  {
    slug: "ownership-legal",
    label: "Ownership + Legal Suite",
    eyebrow: "Property trust record",
    summary: "Keep allotments, transfers, registry, KYC, generated letters, signed pages and complete plot history connected to the property.",
    outcomes: ["Faster document retrieval", "Traceable ownership changes", "Controlled owner access"],
  },
  {
    slug: "project-intelligence",
    label: "Project + Construction Intelligence",
    eyebrow: "Spatial execution",
    summary: "Turn supported drawings or manual project structures into clickable operational workspaces for plots, assets, contractors, progress and issues.",
    outcomes: ["Spatially connected work", "Mobile-friendly site updates", "Earlier visibility into delays"],
  },
  {
    slug: "custom-solutions",
    label: "Custom Real Estate Solutions",
    eyebrow: "Built around your process",
    summary: "Configure portals, approvals, dashboards, reports, integrations and specialist workflows around the systems and teams already in place.",
    outcomes: ["Selected modules or complete platform", "Migration and integration support", "Builder-branded experiences"],
  },
] as const;

export const portfolioEngagements: PortfolioEngagement[] = [
  {
    slug: "saldha-land-developers",
    displayName: "Saldha Land Developers",
    descriptor: "Named builder engagement",
    evidence: "NAMED_ENGAGEMENT",
    publicationApproved: true,
    featured: true,
    categories: ["Plotted development", "Ownership", "Documents"],
    status: "Implementation and workflow delivery",
    summary: "A connected project, plot, ownership and document environment designed for the operational needs of a plotted-development builder.",
    requirement: "Create an easier way to manage projects, plots, ownership changes, legal records, generated letters and owner-facing information.",
    delivered: [
      "Project and plot workspaces",
      "Allotment, transfer and registry workflows",
      "Property-centred document vault",
      "Editable Letter Studio and PDF composition",
      "Ownership history and controlled owner access",
      "Project visualization and manual project setup",
    ],
    outcomes: [
      "Connected operational records to the plot they belong to",
      "Created reusable document and approval workflows",
      "Established a chronological property trust record",
    ],
    projects: ["Vrinda Enclave", "Ananta Enclaves", "Ambey Homes"],
  },
  {
    slug: "agarwal-land-developers",
    displayName: "Agarwal Land Developers",
    descriptor: "Named engagement pending publication approval",
    evidence: "NAMED_ENGAGEMENT",
    publicationApproved: false,
    featured: false,
    categories: ["Plotted development"],
    status: "Private engagement record",
    summary: "This engagement remains private until its approved scope, projects and publishable evidence are confirmed.",
    requirement: "Publication details pending approval.",
    delivered: [],
    outcomes: [],
  },
  {
    slug: "confidential-plotted-developer",
    displayName: "North India Plotted Development Company",
    descriptor: "Client name confidential",
    evidence: "CONFIDENTIAL_ENGAGEMENT",
    publicationApproved: true,
    featured: true,
    categories: ["Multi-project", "Inventory", "Management"],
    status: "Confidential workflow engagement",
    summary: "A multi-project operating model for inventory visibility, ownership actions, registry tracking and management reporting.",
    requirement: "Give management and project teams a consistent view of company-held and allotted inventory across developments.",
    delivered: ["Project and inventory structure", "Plot status and ownership workflows", "Registry visibility", "Management reporting model"],
    outcomes: ["Standardized project records", "Clearer inventory visibility", "Reusable reporting structure"],
  },
  {
    slug: "crm-customer-lifecycle",
    displayName: "CRM + Customer Lifecycle Environment",
    descriptor: "Configurable product implementation",
    evidence: "PRODUCT_CAPABILITY",
    publicationApproved: true,
    featured: true,
    categories: ["CRM", "Sales", "Customer service"],
    status: "Available platform capability",
    summary: "A connected sales environment covering lead capture, assignment, follow-up, site visits, bookings and customer lifecycle management.",
    requirement: "Replace fragmented lead follow-up and disconnected inventory conversations with a visible, accountable sales process.",
    delivered: ["Lead pipeline", "Follow-up activity", "Site-visit workflow", "Inventory matching", "Booking handover", "Sales reporting"],
    outcomes: ["Improved sales visibility", "Better customer context", "Connected booking handover"],
  },
  {
    slug: "legal-document-digitization",
    displayName: "Property Legal + Document Digitization",
    descriptor: "Configurable specialist solution",
    evidence: "PRODUCT_CAPABILITY",
    publicationApproved: true,
    featured: true,
    categories: ["Legal", "Documents", "Migration"],
    status: "Available specialist capability",
    summary: "A property-centred legal record covering migrated documents, KYC, dynamic letters, signed pages, approvals and audit history.",
    requirement: "Make sensitive property records easy to locate, update and share without losing historical accountability.",
    delivered: ["Document migration model", "KYC and legal classifications", "Dynamic letter templates", "PDF page composition", "Visibility and approval rules"],
    outcomes: ["Faster record retrieval", "Consistent document generation", "Safer customer access"],
  },
  {
    slug: "construction-management-control",
    displayName: "Construction + Management Control",
    descriptor: "Configurable WIDESTATE OS solution",
    evidence: "PRODUCT_CAPABILITY",
    publicationApproved: true,
    featured: true,
    categories: ["Construction", "BOQ", "Management"],
    status: "Available platform capability",
    summary: "A management layer for site progress, contractors, BOQ, cost variance, photographs, issues and owner-visible updates.",
    requirement: "Connect site execution and management reporting before delays and cost variance become end-stage surprises.",
    delivered: ["Site progress", "Contractor tracking", "BOQ and invoices", "Issue workflow", "Progress media", "Management summaries"],
    outcomes: ["Earlier operational visibility", "Clearer contractor accountability", "Structured owner updates"],
  },
];

export const publicEngagements = portfolioEngagements.filter((engagement) => engagement.publicationApproved);

export const connectedJourney = [
  "Campaign",
  "Lead",
  "Follow-up",
  "Site visit",
  "Booking",
  "Allotment",
  "Ownership",
  "Documents",
  "Registry",
  "Construction",
  "Cost control",
  "Owner service",
] as const;

export function evidenceLabel(evidence: PortfolioEvidence) {
  if (evidence === "NAMED_ENGAGEMENT") return "Delivered engagement";
  if (evidence === "CONFIDENTIAL_ENGAGEMENT") return "Confidential engagement";
  return "Configurable solution";
}

