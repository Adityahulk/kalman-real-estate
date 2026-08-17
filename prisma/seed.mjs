import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Kalman@12345", 12);
  const companyAdminPasswordHash = await bcrypt.hash("WideState@2026", 12);
  const saldhaEditKeyHash = await bcrypt.hash("saldhakey", 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "saldha-land-developers" },
    update: { editKeyHash: saldhaEditKeyHash },
    create: {
      name: "Saldha Land Developers",
      slug: "saldha-land-developers",
      region: "North India / Punjab",
      gstin: "03ABCDE1234F1Z5",
      pan: "ABCDE1234F",
      contactEmail: "admin@saldhaland.example",
      contactPhone: "+91 98765 43210",
      editKeyHash: saldhaEditKeyHash,
      crmUrl: "https://crm.example.com/saldha",
      letterhead: {
        address: "Punjab, India",
        footer: "Vrinda Enclave, Ananta Enclaves, Ambey Homes",
      },
    },
  });

  await prisma.projectFileField.createMany({
    data: [
      { tenantId: tenant.id, section: "PROJECT_FILES", label: "Registry", key: "registry" },
      { tenantId: tenant.id, section: "PROJECT_FILES", label: "RERA", key: "rera" },
      { tenantId: tenant.id, section: "PROJECT_FILES", label: "NOC", key: "noc" },
      { tenantId: tenant.id, section: "PROJECT_FILES", label: "License", key: "license" },
      { tenantId: tenant.id, section: "PROJECT_FILES", label: "Development file", key: "development_file" },
      { tenantId: tenant.id, section: "PROJECT_MAPS", label: "Electrical plans", key: "electrical_plan" },
      { tenantId: tenant.id, section: "PROJECT_MAPS", label: "Water sewage", key: "water_sewage" },
    ],
    skipDuplicates: true,
  });

  await prisma.user.upsert({
    where: { email: "owner@saldhaland.example" },
    update: { passwordHash, status: "ACTIVE" },
    create: {
      tenantId: tenant.id,
      email: "owner@saldhaland.example",
      passwordHash,
      name: "Saldha Builder Owner",
      role: "BUILDER_OWNER",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "engineer@saldhaland.example" },
    update: { passwordHash, status: "ACTIVE" },
    create: {
      tenantId: tenant.id,
      email: "engineer@saldhaland.example",
      passwordHash,
      name: "Site Engineer",
      role: "SITE_ENGINEER",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "companyadmin@widestate.in" },
    update: {
      tenantId: null,
      passwordHash: companyAdminPasswordHash,
      name: "Company Admin",
      role: "BUILDER_ADMIN",
      status: "ACTIVE",
    },
    create: {
      tenantId: null,
      email: "companyadmin@widestate.in",
      passwordHash: companyAdminPasswordHash,
      name: "Company Admin",
      role: "BUILDER_ADMIN",
      status: "ACTIVE",
    },
  });
  const companyAdmin = await prisma.user.findUniqueOrThrow({ where: { email: "companyadmin@widestate.in" } });
  await prisma.userFirmMembership.deleteMany({ where: { userId: companyAdmin.id } });

  await prisma.user.upsert({
    where: { email: "amandeep@example.com" },
    update: { passwordHash, status: "ACTIVE" },
    create: {
      tenantId: tenant.id,
      email: "amandeep@example.com",
      passwordHash,
      name: "Amandeep Singh",
      phone: "+91 98765 11111",
      role: "PLOT_OWNER",
      status: "ACTIVE",
    },
  });

  // Additional role-based demo logins so every app role can be exercised in the demo. All firm-scoped
  // users share the standard demo password (Kalman@12345) and are picked up by the membership loop below.
  const extraFirmUsers = [
    { email: "finance@saldhaland.example", name: "Finance Manager", role: "FINANCE_MANAGER", phone: "+91 98765 22222" },
    { email: "marketing@saldhaland.example", name: "Marketing Head", role: "MARKETING_HEAD", phone: "+91 98765 33333" },
    { email: "videographer@saldhaland.example", name: "Site Videographer", role: "VIDEOGRAPHER", phone: "+91 98765 44444" },
    { email: "editor@saldhaland.example", name: "Content Editor", role: "EDITOR", phone: "+91 98765 55555" },
    { email: "contractor@saldhaland.example", name: "Site Contractor", role: "CONTRACTOR", phone: "+91 98765 66666" },
    { email: "viewer@saldhaland.example", name: "Read-only Viewer", role: "VIEWER", phone: "+91 98765 77777" },
  ];
  for (const u of extraFirmUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, status: "ACTIVE", role: u.role, name: u.name },
      create: {
        tenantId: tenant.id,
        email: u.email,
        passwordHash,
        name: u.name,
        phone: u.phone,
        role: u.role,
        status: "ACTIVE",
      },
    });
  }

  // Platform-level admin (not tied to any firm) — uses the company admin password (WideState@2026).
  await prisma.user.upsert({
    where: { email: "platformadmin@widestate.in" },
    update: { tenantId: null, passwordHash: companyAdminPasswordHash, name: "Platform Admin", role: "PLATFORM_ADMIN", status: "ACTIVE" },
    create: {
      tenantId: null,
      email: "platformadmin@widestate.in",
      passwordHash: companyAdminPasswordHash,
      name: "Platform Admin",
      role: "PLATFORM_ADMIN",
      status: "ACTIVE",
    },
  });

  // Fixed super-admin owner account. Signs in with the login ID "Dakshdod" (not an email) and has
  // unrestricted access to every module. Idempotent on the unique loginId.
  const superAdminPasswordHash = await bcrypt.hash("252008", 12);
  const existingSuperAdmin = await prisma.user.findUnique({ where: { loginId: "Dakshdod" } });
  if (existingSuperAdmin) {
    await prisma.user.update({
      where: { id: existingSuperAdmin.id },
      data: { tenantId: tenant.id, passwordHash: superAdminPasswordHash, name: "Daksh (Super Admin)", role: "SUPER_ADMIN", status: "ACTIVE" },
    });
  } else {
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "dakshdod@widestate.in",
        loginId: "Dakshdod",
        passwordHash: superAdminPasswordHash,
        name: "Daksh (Super Admin)",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
  }

  // Allotment approval-chain demo users (standard demo password) so the workflow can be exercised end to end.
  const allotmentChainUsers = [
    { email: "executive@saldhaland.example", name: "Allotment Executive", role: "ALLOTMENT_EXECUTIVE", phone: "+91 98765 88881" },
    { email: "approver@saldhaland.example", name: "Approving Authority", role: "APPROVING_AUTHORITY", phone: "+91 98765 88882" },
    { email: "signatory@saldhaland.example", name: "Authorized Signatory", role: "AUTHORIZED_SIGNATORY", phone: "+91 98765 88883" },
    { email: "headengineer@saldhaland.example", name: "Head Engineer", role: "HEAD_ENGINEER", phone: "+91 98765 88884" },
    { email: "liaison@saldhaland.example", name: "Liaison Officer", role: "LIAISON_OFFICER", phone: "+91 98765 88885" },
  ];
  for (const u of allotmentChainUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, status: "ACTIVE", role: u.role, name: u.name },
      create: {
        tenantId: tenant.id,
        email: u.email,
        passwordHash,
        name: u.name,
        phone: u.phone,
        role: u.role,
        status: "ACTIVE",
      },
    });
  }

  // CRM team structure. These are custom roles so management can change their permissions later
  // without adding another database enum or redeploying the application.
  const crmDepartment = await prisma.department.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "CRM & Sales" } },
    update: {},
    create: { tenantId: tenant.id, name: "CRM & Sales" },
  });
  const crmDesignations = {};
  for (const name of ["CRM Manager", "Caller", "Salesperson", "Reception"]) {
    crmDesignations[name] = await prisma.designation.upsert({
      where: { departmentId_name: { departmentId: crmDepartment.id, name } },
      update: {},
      create: { tenantId: tenant.id, departmentId: crmDepartment.id, name },
    });
  }
  const crmRoleDefinitions = [
    { name: "CRM Manager", permissions: ["projects.view", "crm.view", "crm.manage", "crm.assign", "crm.reports"] },
    { name: "CRM Caller", permissions: ["projects.view", "crm.view", "crm.manage"] },
    { name: "CRM Salesperson", permissions: ["projects.view", "crm.view", "crm.manage"] },
    { name: "CRM Reception", permissions: ["projects.view", "crm.view", "crm.manage"] },
  ];
  const crmRoles = {};
  for (const definition of crmRoleDefinitions) {
    const designationName = definition.name.replace("CRM ", "") === "Manager" ? "CRM Manager" : definition.name.replace("CRM ", "");
    crmRoles[definition.name] = await prisma.customRole.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: definition.name } },
      update: { permissions: definition.permissions, departmentId: crmDepartment.id, designationId: crmDesignations[designationName].id },
      create: { tenantId: tenant.id, name: definition.name, description: `WIDESTATE ${definition.name} access`, baseRole: "VIEWER", permissions: definition.permissions, departmentId: crmDepartment.id, designationId: crmDesignations[designationName].id },
    });
  }
  const crmUsers = [
    { email: "crmmanager@saldhaland.example", name: "CRM Manager", phone: "+91 98765 88901", role: "CRM Manager", designation: "CRM Manager" },
    { email: "caller@saldhaland.example", name: "CRM Caller", phone: "+91 98765 88902", role: "CRM Caller", designation: "Caller" },
    { email: "salesperson@saldhaland.example", name: "CRM Salesperson", phone: "+91 98765 88903", role: "CRM Salesperson", designation: "Salesperson" },
    { email: "reception@saldhaland.example", name: "CRM Reception", phone: "+91 98765 88904", role: "CRM Reception", designation: "Reception" },
  ];
  for (const user of crmUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { tenantId: tenant.id, passwordHash, name: user.name, phone: user.phone, role: "VIEWER", customRoleId: crmRoles[user.role].id, departmentId: crmDepartment.id, designationId: crmDesignations[user.designation].id, status: "ACTIVE" },
      create: { tenantId: tenant.id, email: user.email, passwordHash, name: user.name, phone: user.phone, role: "VIEWER", customRoleId: crmRoles[user.role].id, departmentId: crmDepartment.id, designationId: crmDesignations[user.designation].id, status: "ACTIVE" },
    });
  }

  const firmUsers = await prisma.user.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, role: true },
  });
  for (const firmUser of firmUsers) {
    await prisma.userFirmMembership.upsert({
      where: { userId_tenantId: { userId: firmUser.id, tenantId: tenant.id } },
      update: { role: firmUser.role },
      create: { userId: firmUser.id, tenantId: tenant.id, role: firmUser.role },
    });
  }

  const project = await prisma.project.upsert({
    where: { id: "seed-vrinda-enclave" },
    update: {},
    create: {
      id: "seed-vrinda-enclave",
      tenantId: tenant.id,
      name: "Vrinda Enclave",
      city: "Punjab",
      address: "North India growth corridor",
      budgetInr: 185000000,
      spentInr: 64250000,
      progressPct: 42,
      startedAt: new Date("2026-01-10"),
      handoverAt: new Date("2027-09-30"),
    },
  });

  const owner = await prisma.owner.upsert({
    where: { id: "seed-owner-1" },
    update: {},
    create: {
      id: "seed-owner-1",
      tenantId: tenant.id,
      type: "INDIVIDUAL",
      name: "Amandeep Singh",
      phone: "+91 98765 11111",
      email: "amandeep@example.com",
      address: "Ludhiana, Punjab",
    },
  });

  const plot = await prisma.plot.upsert({
    where: {
      tenantId_projectId_code: {
        tenantId: tenant.id,
        projectId: project.id,
        code: "A-101",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      projectId: project.id,
      code: "A-101",
      label: "Plot A-101",
      areaSqft: 1800,
      priceInr: 5400000,
      status: "ALLOTTED",
      currentOwnerId: owner.id,
      facing: "East",
      geometry: {
        type: "polygon",
        points: [
          [0, 0],
          [60, 0],
          [60, 30],
          [0, 30],
        ],
      },
    },
  });

  await prisma.ownershipRecord.create({
    data: {
      tenantId: tenant.id,
      plotId: plot.id,
      ownerId: owner.id,
      kind: "ALLOTMENT",
      amountInr: 5400000,
      effectiveAt: new Date("2026-03-01"),
      notes: "Seed allotment for end-to-end testing.",
    },
  });

  await prisma.checklistItem.createMany({
    data: [
      {
        tenantId: tenant.id,
        plotId: plot.id,
        parentType: "Plot",
        parentId: plot.id,
        label: "Structure and plinth",
        category: "Structure",
        status: "IN_PROGRESS",
        progressPct: 65,
      },
      {
        tenantId: tenant.id,
        plotId: plot.id,
        parentType: "Plot",
        parentId: plot.id,
        label: "Plumbing rough-in",
        category: "Plumbing",
        status: "IN_PROGRESS",
        progressPct: 40,
      },
      {
        tenantId: tenant.id,
        plotId: plot.id,
        parentType: "Plot",
        parentId: plot.id,
        label: "Electrical conduits",
        category: "Electrical",
        status: "PENDING",
        progressPct: 25,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.siteAsset.createMany({
    data: [
      {
        tenantId: tenant.id,
        projectId: project.id,
        name: "Main Entry Road",
        type: "ROAD",
        progressPct: 55,
        status: "IN_PROGRESS",
        deadline: new Date("2026-08-15"),
      },
      {
        tenantId: tenant.id,
        projectId: project.id,
        name: "Boundary Wall North",
        type: "BOUNDARY",
        progressPct: 78,
        status: "IN_PROGRESS",
        deadline: new Date("2026-07-20"),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.bOQItem.upsert({
    where: {
      tenantId_projectId_code: {
        tenantId: tenant.id,
        projectId: project.id,
        code: "RCC-001",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      projectId: project.id,
      code: "RCC-001",
      description: "RCC for site road works",
      unit: "cum",
      plannedQty: 850,
      plannedRateInr: 6800,
      cadQuantity: 830,
      consumedQty: 910,
      category: "Civil",
    },
  });

  await prisma.marketingTask.create({
    data: {
      tenantId: tenant.id,
      projectId: project.id,
      title: "Vrinda Enclave site progress reel",
      brief: "Capture road, boundary, entry gate, and park development progress.",
      status: "SHOOT_ASSIGNED",
      dueAt: new Date("2026-06-05"),
    },
  });

  const cadFile = await prisma.cadFile.upsert({
    where: { id: "seed-cad-vrinda-master" },
    update: { status: "REVIEW_REQUIRED" },
    create: {
      id: "seed-cad-vrinda-master",
      tenantId: tenant.id,
      projectId: project.id,
      parentType: "PROJECT",
      parentId: project.id,
      format: "DXF",
      status: "REVIEW_REQUIRED",
      originalName: "vrinda-enclave-master-plan.dxf",
      storageKey: `${tenant.id}/cad/project/${project.id}/vrinda-enclave-master-plan.dxf`,
      version: 1,
    },
  });

  const oldScenes = await prisma.cadScene.findMany({ where: { cadFileId: cadFile.id }, select: { id: true } });
  const oldSceneIds = oldScenes.map((item) => item.id);
  if (oldSceneIds.length) {
    const oldEntities = await prisma.cadEntity.findMany({ where: { sceneId: { in: oldSceneIds } }, select: { id: true } });
    const oldEntityIds = oldEntities.map((item) => item.id);
    if (oldEntityIds.length) await prisma.spatialLink.deleteMany({ where: { cadEntityId: { in: oldEntityIds } } });
    await prisma.cadEntity.deleteMany({ where: { sceneId: { in: oldSceneIds } } });
    await prisma.cadLayer.deleteMany({ where: { sceneId: { in: oldSceneIds } } });
    await prisma.cadScene.deleteMany({ where: { id: { in: oldSceneIds } } });
  }
  const scene = await prisma.cadScene.create({
    data: {
      tenantId: tenant.id,
      cadFileId: cadFile.id,
      scope: "PROJECT",
      parentId: project.id,
      bounds: { minX: 0, minY: 0, maxX: 900, maxY: 620 },
      units: "feet",
      sceneJson: { source: "seed", entityCount: 12 },
    },
  });

  const layerRows = await Promise.all(
    [
      ["plots", "PLOT"],
      ["roads", "ROAD"],
      ["utilities", "UTILITY"],
      ["amenities", "PARK"],
      ["boundaries", "BOUNDARY"],
    ].map(([name, purpose]) =>
      prisma.cadLayer.create({
        data: { tenantId: tenant.id, sceneId: scene.id, name, purpose },
      }),
    ),
  );
  const layer = Object.fromEntries(layerRows.map((row) => [row.name, row.id]));

  await prisma.cadEntity.createMany({
    data: [
      {
        tenantId: tenant.id,
        sceneId: scene.id,
        layerId: layer.boundaries,
        type: "BOUNDARY",
        label: "Township boundary",
        confidence: 0.91,
        geometry: { type: "polyline", closed: true, points: [[20, 20], [880, 20], [880, 600], [20, 600], [20, 20]] },
        measurements: { areaSqft: 498800 },
        sourceLayer: "boundaries",
        status: "CONFIRMED",
      },
      {
        tenantId: tenant.id,
        sceneId: scene.id,
        layerId: layer.roads,
        type: "ROAD",
        label: "30 ft Main Spine Road",
        confidence: 0.86,
        geometry: { type: "polyline", points: [[70, 300], [830, 300]] },
        measurements: { length: 760 },
        sourceLayer: "roads",
        status: "CONFIRMED",
      },
      {
        tenantId: tenant.id,
        sceneId: scene.id,
        layerId: layer.roads,
        type: "ROAD",
        label: "24 ft East Avenue",
        confidence: 0.84,
        geometry: { type: "polyline", points: [[450, 70], [450, 555]] },
        measurements: { length: 485 },
        sourceLayer: "roads",
        status: "CONFIRMED",
      },
      ...[
        ["A-101", 90, 90, 120, 90],
        ["A-102", 240, 90, 120, 90],
        ["A-103", 540, 90, 120, 90],
        ["A-104", 690, 90, 120, 90],
        ["B-201", 90, 410, 120, 90],
        ["B-202", 240, 410, 120, 90],
        ["B-203", 540, 410, 120, 90],
        ["B-204", 690, 410, 120, 90],
      ].map(([label, x, y, w, h]) => ({
        tenantId: tenant.id,
        sceneId: scene.id,
        layerId: layer.plots,
        type: "PLOT",
        label,
        confidence: label === "B-204" ? 0.54 : 0.88,
        geometry: { type: "polyline", closed: true, points: [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]] },
        measurements: { areaSqft: w * h },
        sourceLayer: "plots",
        status: label === "B-204" ? "SUGGESTED" : "CONFIRMED",
      })),
      {
        tenantId: tenant.id,
        sceneId: scene.id,
        layerId: layer.amenities,
        type: "PARK",
        label: "Central park",
        confidence: 0.82,
        geometry: { type: "polyline", closed: true, points: [[365, 355], [535, 355], [535, 520], [365, 520], [365, 355]] },
        measurements: { areaSqft: 28050 },
        sourceLayer: "amenities",
        status: "CONFIRMED",
      },
      {
        tenantId: tenant.id,
        sceneId: scene.id,
        layerId: layer.utilities,
        type: "UTILITY",
        label: "Water main",
        confidence: 0.72,
        geometry: { type: "polyline", points: [[80, 335], [820, 335]] },
        measurements: { length: 740 },
        sourceLayer: "utilities",
        status: "CONFIRMED",
      },
    ],
  });

  const unknown = await prisma.cadEntity.findFirst({
    where: { tenantId: tenant.id, sceneId: scene.id, label: "B-204" },
  });
  if (unknown) {
    await prisma.cadReviewIssue.create({
      data: {
        tenantId: tenant.id,
        cadFileId: cadFile.id,
        entityId: unknown.id,
        severity: "MEDIUM",
        code: "LOW_CONFIDENCE_LABEL",
        message: "Plot B-204 label was detected with medium confidence and should be confirmed.",
      },
    });
  }

  console.log("Seeded WIDESTATE OS");
  console.log("--- Demo logins (password Kalman@12345 unless noted) ---");
  console.log("BUILDER_OWNER    : owner@saldhaland.example");
  console.log("SITE_ENGINEER    : engineer@saldhaland.example");
  console.log("FINANCE_MANAGER  : finance@saldhaland.example");
  console.log("MARKETING_HEAD   : marketing@saldhaland.example");
  console.log("VIDEOGRAPHER     : videographer@saldhaland.example");
  console.log("EDITOR           : editor@saldhaland.example");
  console.log("CONTRACTOR       : contractor@saldhaland.example");
  console.log("VIEWER           : viewer@saldhaland.example");
  console.log("PLOT_OWNER       : amandeep@example.com");
  console.log("ALLOTMENT_EXEC   : executive@saldhaland.example");
  console.log("APPROVING_AUTH   : approver@saldhaland.example");
  console.log("AUTH_SIGNATORY   : signatory@saldhaland.example");
  console.log("CRM_MANAGER      : crmmanager@saldhaland.example");
  console.log("CRM_CALLER       : caller@saldhaland.example");
  console.log("CRM_SALESPERSON  : salesperson@saldhaland.example");
  console.log("CRM_RECEPTION    : reception@saldhaland.example");
  console.log("BUILDER_ADMIN    : companyadmin@widestate.in / WideState@2026");
  console.log("PLATFORM_ADMIN   : platformadmin@widestate.in / WideState@2026");
  console.log("SUPER_ADMIN      : login ID 'Dakshdod' / 252008");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
