import { Role } from "@prisma/client";

export type Permission =
  | "tenant.manage"
  | "users.manage"
  | "projects.manage"
  | "projects.view"
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
  | "development.update_assigned"
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
  | "audit.view"
  | "records.restore"
  | "reports.view"
  | "owner.portal";

// Every permission literal, used to grant the SUPER_ADMIN role the full set without
// having to hand-maintain a parallel list. Keep in sync with the union above.
export const ALL_PERMISSIONS: Permission[] = [
  "tenant.manage",
  "users.manage",
  "projects.manage",
  "projects.view",
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
  "development.update_assigned",
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
  "audit.view",
  "records.restore",
  "reports.view",
  "owner.portal",
];

export const permissionsByRole: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  PLATFORM_ADMIN: [
    "tenant.manage",
    "users.manage",
    "projects.manage",
    "projects.view",
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
    "development.update_assigned",
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
    "audit.view",
    "records.restore",
    "reports.view",
    "owner.portal",
  ],
  BUILDER_OWNER: [
    "tenant.manage",
    "users.manage",
    "projects.manage",
    "projects.view",
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
    "development.update_assigned",
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
    "audit.view",
    "records.restore",
    "reports.view",
  ],
  BUILDER_ADMIN: [
    "users.manage",
    "projects.manage",
    "projects.view",
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
    "development.update_assigned",
    "development.view",
    "engineering.assign",
    "engineering.verify",
    "liaison.manage",
    "liaison.view",
    "marketing.manage",
    "marketing.execute",
    "finance.view",
    "ai.generate",
    "audit.view",
    "reports.view",
  ],
  // Phase 1 — allotment approval chain
  ALLOTMENT_EXECUTIVE: [
    "projects.view",
    "ownership.view",
    "documents.generate",
    "documents.submit",
    "documents.view",
    "files.upload",
    "cad.view",
  ],
  APPROVING_AUTHORITY: [
    "projects.view",
    "documents.view",
    "documents.approve",
    "ownership.view",
    "files.upload",
  ],
  AUTHORIZED_SIGNATORY: [
    "projects.view",
    "documents.view",
    "documents.sign",
    "ownership.view",
    "cad.view",
    "files.upload",
  ],
  // Phase 2 — engineering verification loop
  HEAD_ENGINEER: [
    "projects.view",
    "development.manage",
    "development.update_assigned",
    "development.view",
    "engineering.assign",
    "engineering.verify",
    "documents.view",
    "files.upload",
    "cad.view",
  ],
  // Phase 3 — liaison / government approvals
  LIAISON_OFFICER: [
    "projects.view",
    "liaison.manage",
    "liaison.view",
    "documents.view",
    "files.upload",
    "cad.view",
  ],
  SITE_ENGINEER: ["projects.view", "cad.view", "development.update_assigned", "development.view", "documents.view", "files.upload"],
  FINANCE_MANAGER: ["projects.view", "finance.manage", "finance.view", "documents.view", "files.upload", "ai.generate", "reports.view"],
  MARKETING_HEAD: ["projects.view", "marketing.manage", "marketing.execute", "documents.view", "files.upload"],
  VIDEOGRAPHER: ["projects.view", "marketing.execute", "files.upload"],
  EDITOR: ["projects.view", "marketing.execute", "files.upload"],
  CONTRACTOR: ["projects.view", "development.update_assigned", "development.view", "files.upload"],
  PLOT_OWNER: ["projects.view", "cad.view", "documents.view", "development.view", "owner.portal"],
  VIEWER: ["projects.view", "cad.view", "ownership.view", "documents.view", "development.view", "finance.view", "liaison.view", "reports.view"],
};

export function normalizePermissions(value: unknown): Permission[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowed = new Set<Permission>(ALL_PERMISSIONS);
  return value.filter((permission): permission is Permission =>
    typeof permission === "string" && allowed.has(permission as Permission));
}

export function hasPermission(role: Role, permission: Permission, customPermissions?: Permission[]) {
  return (customPermissions ?? permissionsByRole[role] ?? []).includes(permission);
}

export function assertPermission(role: Role, permission: Permission, customPermissions?: Permission[]) {
  if (!hasPermission(role, permission, customPermissions)) {
    const error = new Error(`Missing permission: ${permission}`);
    error.name = "ForbiddenError";
    throw error;
  }
}
