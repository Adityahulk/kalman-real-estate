import { Role } from "@prisma/client";

export type Permission =
  | "tenant.manage"
  | "users.manage"
  | "projects.manage"
  | "cad.upload"
  | "cad.review"
  | "cad.publish"
  | "cad.view"
  | "ownership.manage"
  | "ownership.view"
  | "documents.generate"
  | "documents.approve"
  | "documents.view"
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
    "cad.view",
    "ownership.manage",
    "ownership.view",
    "documents.generate",
    "documents.approve",
    "documents.view",
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
    "cad.view",
    "ownership.manage",
    "ownership.view",
    "documents.generate",
    "documents.approve",
    "documents.view",
    "development.manage",
    "development.view",
    "marketing.manage",
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
    "cad.view",
    "ownership.manage",
    "ownership.view",
    "documents.generate",
    "documents.approve",
    "documents.view",
    "development.manage",
    "development.view",
    "marketing.manage",
    "finance.view",
    "ai.generate",
  ],
  SITE_ENGINEER: ["cad.view", "development.manage", "development.view", "documents.view"],
  FINANCE_MANAGER: ["finance.manage", "finance.view", "documents.view", "ai.generate"],
  MARKETING_HEAD: ["marketing.manage", "marketing.execute", "documents.view"],
  VIDEOGRAPHER: ["marketing.execute"],
  EDITOR: ["marketing.execute"],
  CONTRACTOR: ["development.manage", "development.view"],
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
