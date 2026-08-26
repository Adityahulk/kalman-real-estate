import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { SignJWT } from "jose";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

const prisma = new PrismaClient();
const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const stamp = randomUUID().slice(0, 8);
let createdUserId;
let restrictedProjectId;
let restrictedPlotId;
let temporaryRoleId;
let originalSuperRoleId;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => null);
  return { response, body, cookie: response.headers.get("set-cookie")?.split(";")[0] };
}

try {
  const superAdmin = await prisma.user.findUniqueOrThrow({ where: { loginId: "Dakshdod" } });
  originalSuperRoleId = superAdmin.customRoleId;
  const activeTenantId = superAdmin.tenantId;
  assert(activeTenantId, "Super Admin has no active firm");

  // Reproduce the production failure: a stale custom role must never remove a Super Admin grant.
  const temporaryRole = await prisma.customRole.create({
    data: { tenantId: activeTenantId, name: `Restricted smoke ${stamp}`, baseRole: "VIEWER", permissions: [] },
  });
  temporaryRoleId = temporaryRole.id;
  await prisma.user.update({ where: { id: superAdmin.id }, data: { customRoleId: temporaryRole.id } });

  const adminToken = await new SignJWT({
    sub: superAdmin.id,
    tenantId: activeTenantId,
    role: superAdmin.role,
    email: superAdmin.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(process.env.JWT_SECRET ?? "development-secret-change-me"));
  const adminHeaders = { cookie: `kalman_session=${adminToken}` };

  const userList = await request("/api/v1/users", { headers: adminHeaders });
  assert(userList.response.status === 200, `Super Admin lost users.manage: ${userList.body?.error ?? userList.response.status}`);
  const firms = userList.body?.data?.firms ?? [];
  assert(firms.length >= 2, "Multi-firm access test requires at least two firms");
  const currentFirm = firms.find((firm) => firm.id === activeTenantId);
  const secondFirm = firms.find((firm) => firm.id !== activeTenantId);
  assert(currentFirm?.projects?.length, "Current firm requires at least one project");
  assert(secondFirm, "A second firm is required");

  const extraProject = await prisma.project.create({
    data: { tenantId: activeTenantId, name: `Restricted project ${stamp}`, city: "Barnala", state: "Punjab", totalPlots: 0 },
  });
  restrictedProjectId = extraProject.id;
  const restrictedPlot = await prisma.plot.create({
    data: { tenantId: activeTenantId, projectId: extraProject.id, code: `SCOPE-${stamp}`, areaSqYards: 100 },
  });
  restrictedPlotId = restrictedPlot.id;
  const allowedProjectId = currentFirm.projects[0].id;
  const identifier = `access-${stamp}`;
  const created = await request("/api/v1/users", {
    method: "POST",
    headers: { ...adminHeaders, "content-type": "application/json" },
    body: JSON.stringify({
      name: `Access Test ${stamp}`,
      loginId: identifier,
      password: "Access@123",
      role: "BUILDER_ADMIN",
      firmAssignments: [
        { tenantId: activeTenantId, allProjects: false, projectIds: [allowedProjectId] },
        { tenantId: secondFirm.id, allProjects: true, projectIds: [] },
      ],
    }),
  });
  assert(created.response.status === 201, `Scoped user creation failed: ${created.body?.error ?? created.response.status}`);
  createdUserId = created.body.data.id;

  const scopedLogin = await request("/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: "Access@123" }),
  });
  assert(scopedLogin.response.status === 201 && scopedLogin.cookie, "Scoped user login failed");
  const scopedHeaders = { cookie: scopedLogin.cookie };
  const visibleProjects = await request("/api/v1/projects", { headers: scopedHeaders });
  assert(visibleProjects.response.status === 200, "Scoped user could not load assigned projects");
  assert(visibleProjects.body.data.length === 1 && visibleProjects.body.data[0].id === allowedProjectId, "Scoped user saw an unassigned project");

  const forbiddenProject = await request(`/api/v1/projects/${restrictedProjectId}/workspace`, { headers: scopedHeaders });
  assert(forbiddenProject.response.status === 403, "Scoped user opened an unassigned project API");
  const forbiddenPlot = await request(`/api/v1/plots/${restrictedPlotId}/workspace`, { headers: scopedHeaders });
  assert(forbiddenPlot.response.status === 403, "Scoped user opened a plot from an unassigned project by ID");
  const forbiddenCreate = await request("/api/v1/projects", {
    method: "POST",
    headers: { ...scopedHeaders, "content-type": "application/json" },
    body: JSON.stringify({ name: "Should fail", city: "Barnala", state: "Punjab", totalPlots: 0 }),
  });
  assert(forbiddenCreate.response.status === 403, "Project-scoped user created a new project");

  const disabled = await request(`/api/v1/users/${createdUserId}`, { method: "DELETE", headers: adminHeaders });
  assert(disabled.response.status === 200 && disabled.body.data.status === "DISABLED", `Super Admin delete failed: ${disabled.body?.error ?? disabled.response.status}`);
  const disabledLogin = await request("/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: "Access@123" }),
  });
  assert(disabledLogin.response.status === 401, "Disabled user could still sign in");

  console.log("User access workflow passed: Super Admin override, multi-firm scope, project restriction, and account disable.");
} finally {
  const superAdmin = await prisma.user.findUnique({ where: { loginId: "Dakshdod" } });
  if (superAdmin) await prisma.user.update({ where: { id: superAdmin.id }, data: { customRoleId: originalSuperRoleId ?? null } });
  if (createdUserId) {
    await prisma.auditEvent.deleteMany({ where: { entityType: "User", entityId: createdUserId } });
    await prisma.user.deleteMany({ where: { id: createdUserId } });
  }
  if (restrictedPlotId) await prisma.plot.deleteMany({ where: { id: restrictedPlotId } });
  if (restrictedProjectId) await prisma.project.deleteMany({ where: { id: restrictedProjectId } });
  if (temporaryRoleId) await prisma.customRole.deleteMany({ where: { id: temporaryRoleId } });
  await prisma.$disconnect();
}
