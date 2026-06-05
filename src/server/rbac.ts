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
  | "documents.approve"
  | "documents.view"
  | "files.upload"
  | "development.manage"
  | "development.view"
  | "marketing.manage"
  | "marketing.execute"
  | "finance.manage"
  | "finance.view"
  | "ai.generate"
  | "owner.portal";

const permissionsByRole: Record<Role, Permission[]> = {
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
    "documents.approve",
    "documents.view",
    "files.upload",
    "development.manage",
    "development.view",
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
    "documents.approve",
    "documents.view",
    "files.upload",
    "development.manage",
    "development.view",
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
    "documents.approve",
    "documents.view",
    "files.upload",
    "development.manage",
    "development.view",
    "marketing.manage",
    "marketing.execute",
    "finance.view",
    "ai.generate",
  ],
  SITE_ENGINEER: ["cad.view", "development.manage", "development.view", "documents.view", "files.upload"],
  FINANCE_MANAGER: ["finance.manage", "finance.view", "documents.view", "files.upload", "ai.generate"],
  MARKETING_HEAD: ["marketing.manage", "marketing.execute", "documents.view", "files.upload"],
  VIDEOGRAPHER: ["marketing.execute", "files.upload"],
  EDITOR: ["marketing.execute", "files.upload"],
  CONTRACTOR: ["development.manage", "development.view", "files.upload"],
  PLOT_OWNER: ["cad.view", "documents.view", "development.view", "owner.portal"],
  VIEWER: ["cad.view", "ownership.view", "documents.view", "development.view", "finance.view"],
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
