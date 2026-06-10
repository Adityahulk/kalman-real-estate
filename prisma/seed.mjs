import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Kalman@12345", 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "saldha-land-developers" },
    update: {},
    create: {
      name: "Saldha Land Developers",
      slug: "saldha-land-developers",
      region: "North India / Punjab",
      gstin: "03ABCDE1234F1Z5",
      pan: "ABCDE1234F",
      contactEmail: "admin@saldhaland.example",
      contactPhone: "+91 98765 43210",
      crmUrl: "https://crm.example.com/saldha",
      letterhead: {
        address: "Punjab, India",
        footer: "Vrinda Enclave, Ananta Enclaves, Ambey Homes",
      },
    },
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

  await prisma.cadScene.deleteMany({ where: { cadFileId: cadFile.id } });
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
  console.log("Login: owner@saldhaland.example / Kalman@12345");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
