import { Role } from "@prisma/client";

export type Permission =
  | "tenant.manage"
  | "users.manage"
  | "projects.manage"
  | "cad.upload"
  | "cad.review"
  | "cad.publish"
  | "cad.delete"
  | "cad.view"
  | "ownership.manage"
  | "ownership.view"
  | "documents.generate"
  | "documents.submit"
  | "documents.approve"
  | "documents.sign"
  | "documents.view"
  | "files.upload"
  | "development.manage"
  | "development.view"
  | "engineering.assign"
  | "engineering.verify"
  | "liaison.manage"
  | "liaison.view"
  | "marketing.manage"
  | "marketing.execute"
  | "finance.manage"
  | "finance.view"
  | "ai.generate"
  | "owner.portal";

// Every permission literal, used to grant the SUPER_ADMIN role the full set without
// having to hand-maintain a parallel list. Keep in sync with the union above.
export const ALL_PERMISSIONS: Permission[] = [
  "tenant.manage",
  "users.manage",
  "projects.manage",
  "cad.upload",
  "cad.review",
  "cad.publish",
  "cad.delete",
  "cad.view",
  "ownership.manage",
  "ownership.view",
  "documents.generate",
  "documents.submit",
  "documents.approve",
  "documents.sign",
  "documents.view",
  "files.upload",
  "development.manage",
  "development.view",
  "engineering.assign",
  "engineering.verify",
  "liaison.manage",
  "liaison.view",
  "marketing.manage",
  "marketing.execute",
  "finance.manage",
  "finance.view",
  "ai.generate",
  "owner.portal",
];

const permissionsByRole: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  PLATFORM_ADMIN: [
    "tenant.manage",
    "users.manage",
    "projects.manage",
    "cad.upload",
    "cad.review",
    "cad.publish",
    "cad.delete",
    "cad.view",
    "ownership.manage",
    "ownership.view",
    "documents.generate",
    "documents.submit",
    "documents.approve",
    "documents.sign",
    "documents.view",
    "files.upload",
    "development.manage",
    "development.view",
    "engineering.assign",
    "engineering.verify",
    "liaison.manage",
    "liaison.view",
    "marketing.manage",
    "marketing.execute",
    "finance.manage",
    "finance.view",
    "ai.generate",
    "owner.portal",
  ],
  BUILDER_OWNER: [
    "tenant.manage",
    "users.manage",
    "projects.manage",
    "cad.upload",
    "cad.review",
    "cad.publish",
    "cad.delete",
    "cad.view",
    "ownership.manage",
    "ownership.view",
    "documents.generate",
    "documents.submit",
    "documents.approve",
    "documents.sign",
    "documents.view",
    "files.upload",
    "development.manage",
    "development.view",
    "engineering.assign",
    "engineering.verify",
    "liaison.manage",
    "liaison.view",
    "marketing.manage",
    "marketing.execute",
    "finance.manage",
    "finance.view",
    "ai.generate",
  ],
  BUILDER_ADMIN: [
    "users.manage",
    "projects.manage",
    "cad.upload",
    "cad.review",
    "cad.publish",
    "cad.delete",
    "cad.view",
    "ownership.manage",
    "ownership.view",
    "documents.generate",
    "documents.submit",
    "documents.approve",
    "documents.sign",
    "documents.view",
    "files.upload",
    "development.manage",
    "development.view",
    "engineering.assign",
    "engineering.verify",
    "liaison.manage",
    "liaison.view",
    "marketing.manage",
    "marketing.execute",
    "finance.view",
    "ai.generate",
  ],
  // Phase 1 — allotment approval chain
  ALLOTMENT_EXECUTIVE: [
    "ownership.view",
    "documents.generate",
    "documents.submit",
    "documents.view",
    "files.upload",
    "cad.view",
  ],
  APPROVING_AUTHORITY: [
    "documents.view",
    "documents.approve",
    "ownership.view",
    "files.upload",
  ],
  AUTHORIZED_SIGNATORY: [
    "documents.view",
    "documents.sign",
    "ownership.view",
    "cad.view",
    "files.upload",
  ],
  // Phase 2 — engineering verification loop
  HEAD_ENGINEER: [
    "development.manage",
    "development.view",
    "engineering.assign",
    "engineering.verify",
    "documents.view",
    "files.upload",
    "cad.view",
  ],
  // Phase 3 — liaison / government approvals
  LIAISON_OFFICER: [
    "liaison.manage",
    "liaison.view",
    "documents.view",
    "files.upload",
    "cad.view",
  ],
  SITE_ENGINEER: ["cad.view", "development.manage", "development.view", "documents.view", "files.upload"],
  FINANCE_MANAGER: ["finance.manage", "finance.view", "documents.view", "files.upload", "ai.generate"],
  MARKETING_HEAD: ["marketing.manage", "marketing.execute", "documents.view", "files.upload"],
  VIDEOGRAPHER: ["marketing.execute", "files.upload"],
  EDITOR: ["marketing.execute", "files.upload"],
  CONTRACTOR: ["development.manage", "development.view", "files.upload"],
  PLOT_OWNER: ["cad.view", "documents.view", "development.view", "owner.portal"],
  VIEWER: ["cad.view", "ownership.view", "documents.view", "development.view", "finance.view", "liaison.view"],
};

export function hasPermission(role: Role, permission: Permission) {
  return permissionsByRole[role]?.includes(permission) ?? false;
}

export function assertPermission(role: Role, permission: Permission) {
  if (!hasPermission(role, permission)) {
    const error = new Error(`Missing permission: ${permission}`);
    error.name = "ForbiddenError";
    throw error;
  }
}
