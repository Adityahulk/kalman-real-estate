import {
  SAMPLE_CAD_SCENES,
  type CadEntity,
  type CadFile,
  type CadFormat,
  type CadReviewIssue,
  type CadScene,
  type CadStatus,
  type CadVersionComparison,
  type SpatialLink
} from "@/data/cad";

type CadStore = {
  scenes: CadScene[];
  files: CadFile[];
  links: SpatialLink[];
};

const globalCadStore = globalThis as typeof globalThis & { __kalmanCadStore?: CadStore };

function cloneScene(scene: CadScene): CadScene {
  return JSON.parse(JSON.stringify(scene)) as CadScene;
}

function store(): CadStore {
  if (!globalCadStore.__kalmanCadStore) {
    globalCadStore.__kalmanCadStore = {
      scenes: SAMPLE_CAD_SCENES.map(cloneScene),
      files: SAMPLE_CAD_SCENES.map((scene) => ({
        id: `file-${scene.id}`,
        tenantId: scene.tenantId,
        sceneId: scene.id,
        format: scene.format,
        originalFileName: scene.originalFileName,
        storageKey: scene.storageKey,
        uploadedBy: scene.auditTrail[0]?.by ?? "System",
        uploadedAt: scene.auditTrail[0]?.at ?? new Date().toISOString(),
        byteSize: 2_400_000 + scene.entities.length * 18_000,
        checksum: `sha256-demo-${scene.id}`
      })),
      links: SAMPLE_CAD_SCENES.flatMap((scene) =>
        scene.entities
          .filter((entity) => entity.confirmed)
          .map((entity) => ({
            id: `link-${scene.id}-${entity.id}`,
            cadSceneId: scene.id,
            cadEntityId: entity.id,
            targetType:
              entity.type === "plot"
                ? "plot"
                : entity.type === "room" || entity.type === "bathroom" || entity.type === "kitchen"
                  ? "room"
                  : entity.type === "plumbing" || entity.type === "electrical_point"
                    ? "utility_point"
                    : "site_asset",
            targetId: `${entity.type}-${entity.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            linkStatus: "suggested" as const
          }))
      )
    };
  }
  return globalCadStore.__kalmanCadStore;
}

function inferFormat(fileName: string): CadFormat {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "dwg" || ext === "dxf" || ext === "pdf") return ext;
  return "dxf";
}

function templateForParent(parentScene?: CadScene, parentEntity?: CadEntity): CadScene {
  if (parentScene?.scope === "plot" || parentEntity?.type === "room") {
    return store().scenes.find((scene) => scene.id === "cad-room-living-v1") ?? SAMPLE_CAD_SCENES[2];
  }
  if (parentScene?.scope === "project" || parentEntity?.type === "plot") {
    return store().scenes.find((scene) => scene.id === "cad-plot-a04-v1") ?? SAMPLE_CAD_SCENES[1];
  }
  return store().scenes.find((scene) => scene.id === "cad-site-saldha-v1") ?? SAMPLE_CAD_SCENES[0];
}

function nextSceneId(fileName: string) {
  return `cad-${fileName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`;
}

export function listCadScenes() {
  return store().scenes;
}

export function getCadScene(id: string) {
  return store().scenes.find((scene) => scene.id === id);
}

export function getCadStatus(id: string) {
  const scene = getCadScene(id);
  if (!scene) return undefined;
  const file = store().files.find((item) => item.sceneId === scene.id);
  return {
    id: scene.id,
    status: scene.status,
    file,
    entityCount: scene.entities.length,
    issueCount: scene.issues.length,
    confirmedCount: scene.entities.filter((entity) => entity.confirmed).length,
    publishedCount: scene.entities.filter((entity) => entity.published).length,
    pipeline: ["uploaded", "converting", "parsing", "extracting", "review_required", "published"] as CadStatus[]
  };
}

export function getCadVersions(id: string): CadVersionComparison {
  const scene = getCadScene(id);
  if (!scene) {
    return {
      sceneId: id,
      currentVersion: 0,
      added: 0,
      removed: 0,
      changed: 0,
      warnings: ["CAD scene not found"]
    };
  }
  return {
    sceneId: scene.id,
    previousVersion: scene.version > 1 ? scene.version - 1 : undefined,
    currentVersion: scene.version,
    added: scene.version === 1 ? scene.entities.length : 2,
    removed: scene.version === 1 ? 0 : 1,
    changed: scene.issues.length,
    warnings: scene.issues.map((issue) => issue.title)
  };
}

export function uploadCad(input: {
  tenantId?: string;
  fileName: string;
  byteSize?: number;
  uploadedBy?: string;
  parentSceneId?: string;
  parentEntityId?: string;
}) {
  const cadStore = store();
  const parentScene = input.parentSceneId ? getCadScene(input.parentSceneId) : undefined;
  const parentEntity = parentScene?.entities.find((entity) => entity.id === input.parentEntityId);
  const template = templateForParent(parentScene, parentEntity);
  const sceneId = nextSceneId(input.fileName);
  const now = new Date().toISOString();
  const scene: CadScene = {
    ...cloneScene(template),
    id: sceneId,
    tenantId: input.tenantId ?? parentScene?.tenantId ?? "tenant-demo",
    parentId: parentScene?.id,
    parentEntityId: parentEntity?.id,
    scope: parentScene?.scope === "project" ? "plot" : parentScene?.scope === "plot" ? "room" : template.scope,
    title: parentEntity ? `${parentEntity.label} - Auto extracted CAD` : `${input.fileName} - Auto extracted CAD`,
    version: 1,
    status: "review_required",
    format: inferFormat(input.fileName),
    originalFileName: input.fileName,
    storageKey: `cad/${input.tenantId ?? "tenant-demo"}/${sceneId}/${input.fileName}`,
    entities: template.entities.map((entity, index) => ({
      ...entity,
      id: `${sceneId}-entity-${index + 1}`,
      sourceHandle: `${entity.sourceHandle}-UPLOAD`,
      published: false
    })),
    issues: template.issues.map((issue, index) => ({
      ...issue,
      id: `${sceneId}-issue-${index + 1}`,
      entityId: issue.entityId ? `${sceneId}-entity-${index + 1}` : undefined
    })),
    auditTrail: [
      { at: now, by: input.uploadedBy ?? "Amit Kalra", text: "CAD uploaded through API and queued for automatic extraction." },
      { at: now, by: "CAD Engine", text: `Converted, parsed, and extracted ${template.entities.length} entities.` }
    ]
  };
  const file: CadFile = {
    id: `file-${sceneId}`,
    tenantId: scene.tenantId,
    sceneId,
    format: scene.format,
    originalFileName: input.fileName,
    storageKey: scene.storageKey,
    uploadedBy: input.uploadedBy ?? "Amit Kalra",
    uploadedAt: now,
    byteSize: input.byteSize ?? 1_250_000,
    checksum: `sha256-demo-${sceneId}`
  };
  cadStore.scenes.push(scene);
  cadStore.files.push(file);
  if (parentScene && parentEntity) {
    parentEntity.childSceneId = scene.id;
  }
  return { scene, file, status: getCadStatus(scene.id) };
}

export function reviewCad(
  id: string,
  input: {
    confirmedEntityIds?: string[];
    unconfirmedEntityIds?: string[];
    corrections?: Array<{ entityId: string; label?: string; type?: CadEntity["type"] }>;
    issue?: CadReviewIssue;
    reviewedBy?: string;
  }
) {
  const scene = getCadScene(id);
  if (!scene) return undefined;
  const confirmed = new Set(input.confirmedEntityIds ?? []);
  const unconfirmed = new Set(input.unconfirmedEntityIds ?? []);
  scene.entities = scene.entities.map((entity) => {
    const correction = input.corrections?.find((item) => item.entityId === entity.id);
    return {
      ...entity,
      label: correction?.label ?? entity.label,
      type: correction?.type ?? entity.type,
      confirmed: confirmed.has(entity.id) ? true : unconfirmed.has(entity.id) ? false : entity.confirmed
    };
  });
  if (input.issue) scene.issues.push(input.issue);
  scene.auditTrail.unshift({
    at: new Date().toISOString(),
    by: input.reviewedBy ?? "Amit Kalra",
    text: "CAD review corrections saved. Live records remain unchanged until publish."
  });
  return scene;
}

export function publishCad(id: string, publishedBy = "Amit Kalra") {
  const cadStore = store();
  const scene = getCadScene(id);
  if (!scene) return undefined;
  scene.status = "published";
  scene.entities = scene.entities.map((entity) => ({ ...entity, published: entity.confirmed }));
  scene.auditTrail.unshift({
    at: new Date().toISOString(),
    by: publishedBy,
    text: "Confirmed CAD entities published to ownership, site, plot, cost, and progress records."
  });
  const newLinks = scene.entities
    .filter((entity) => entity.confirmed)
    .map((entity) => ({
      id: `link-${scene.id}-${entity.id}`,
      cadSceneId: scene.id,
      cadEntityId: entity.id,
      targetType:
        entity.type === "plot"
          ? ("plot" as const)
          : entity.type === "room" || entity.type === "bathroom" || entity.type === "kitchen"
            ? ("room" as const)
            : entity.type === "plumbing" || entity.type === "electrical_point"
              ? ("utility_point" as const)
              : ("site_asset" as const),
      targetId: `${entity.type}-${entity.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      linkStatus: "published" as const
    }));
  cadStore.links = [...cadStore.links.filter((link) => link.cadSceneId !== scene.id), ...newLinks];
  return { scene, links: newLinks, comparison: getCadVersions(id) };
}

export function getSpatialLinks(sceneId: string) {
  return store().links.filter((link) => link.cadSceneId === sceneId);
}
