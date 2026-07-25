import { notFound } from "next/navigation";
import { PlotStatus } from "@prisma/client";
import { getSessionUser } from "@/server/session";
import { prisma } from "@/server/db";
import { sortByPlotCode } from "@/lib/plot-code-sort";
import { ActionHint, ActionPageShell } from "../../../action-page-shell";
import { ProjectAllotmentFlow } from "../../../workflow-action-forms";
import { ensureProjectLetterTemplates, extractTemplateFieldsFromBody, templateFields } from "@/server/services/document-templates";
import { listLetterFieldSettings } from "@/server/services/letter-field-settings";

export const dynamic = "force-dynamic";

export default async function NewAllotmentPage({
  params,
  searchParams,
}: {
  params: { projectId: string };
  searchParams: { plotId?: string; edit?: string };
}) {
  const session = await getSessionUser();
  if (!session) return null;
  const project = await prisma.project.findFirst({ where: { id: params.projectId, tenantId: session.tenantId } });
  if (!project) notFound();
  await ensureProjectLetterTemplates(session.tenantId, project.id);
  const [plots, firm, letterTemplate, letterCategories, existingAllotment] = await Promise.all([
    prisma.plot.findMany({
      where: {
        tenantId: session.tenantId,
        projectId: project.id,
        archivedAt: null,
        OR: [
          { status: PlotStatus.COMPANY_OWNED },
          ...(searchParams.plotId ? [{ id: searchParams.plotId }] : []),
        ],
      },
      select: { id: true, code: true, areaSqYards: true, areaSqft: true, priceInr: true, dimensions: true, boundaries: true, currentOwnerId: true },
    }),
    prisma.tenant.findUniqueOrThrow({
      where: { id: session.tenantId },
      select: { name: true, address: true, pan: true, contactEmail: true, contactPhone: true, authorizedPersons: true },
    }),
    prisma.documentTemplate.findFirst({ where: { tenantId: session.tenantId, projectId: project.id, type: "allotment_letter", active: true }, orderBy: { createdAt: "desc" } }),
    listLetterFieldSettings(session.tenantId),
    searchParams.edit && searchParams.plotId
      ? prisma.ownershipRecord.findFirst({
          where: { tenantId: session.tenantId, plotId: searchParams.plotId, kind: "ALLOTMENT" },
          include: { owner: true },
          orderBy: { createdAt: "desc" },
        })
      : null,
  ]);
  const authorizedPersons = Array.isArray(firm.authorizedPersons)
    ? firm.authorizedPersons.map((person) => {
        if (typeof person === "string") return person;
        if (person && typeof person === "object" && "name" in person && typeof person.name === "string") return person.name;
        return JSON.stringify(person);
      })
    : [];

  const existingExtra = existingAllotment?.extraDetails && typeof existingAllotment.extraDetails === "object" && !Array.isArray(existingAllotment.extraDetails)
    ? existingAllotment.extraDetails as Record<string, unknown>
    : {};
  const existingInitialData = existingAllotment?.owner ? buildInitialAllotmentData(existingAllotment.owner, existingExtra, firm) : undefined;

  const availableLetterFields = letterCategories.flatMap((category) => category.fields.map((field) => ({
    id: field.id,
    label: field.label,
    mapping: field.mapping,
  })));
  const resolvedTemplateFields = templateFields(letterTemplate?.variables).length
    ? templateFields(letterTemplate?.variables)
    : extractTemplateFieldsFromBody(letterTemplate?.body, availableLetterFields);

  return (
    <ActionPageShell
      eyebrow={project.name}
      title="New allotment"
      description="Select a plot and record the allottee, firm, payment, and supporting details."
      backHref={`/app/projects/${project.id}/ownership`}
      backLabel="Back to ownership ledger"
      aside={<ActionHint title="After saving">The plot moves out of company inventory and its ownership history is updated.</ActionHint>}
    >
      <ProjectAllotmentFlow
        projectId={project.id}
        defaultPlotId={searchParams.plotId}
        plots={sortByPlotCode(plots).map((plot) => {
          const boundaries = plot.boundaries && typeof plot.boundaries === "object" && !Array.isArray(plot.boundaries)
            ? plot.boundaries as Record<string, unknown>
            : null;
          return {
            id: plot.id,
            code: plot.code,
            areaSqYards: plot.areaSqYards?.toString() ?? (plot.areaSqft ? String(Number(plot.areaSqft) / 9) : null),
            areaSqft: plot.areaSqft?.toString() ?? null,
            priceInr: plot.priceInr?.toString() ?? null,
            dimensions: plot.dimensions,
            currentOwnerId: plot.currentOwnerId,
            boundaries: boundaries
              ? {
                  north: typeof boundaries.north === "string" ? boundaries.north : null,
                  northDimension: typeof boundaries.northDimension === "string" ? boundaries.northDimension : null,
                  south: typeof boundaries.south === "string" ? boundaries.south : null,
                  southDimension: typeof boundaries.southDimension === "string" ? boundaries.southDimension : null,
                  east: typeof boundaries.east === "string" ? boundaries.east : null,
                  eastDimension: typeof boundaries.eastDimension === "string" ? boundaries.eastDimension : null,
                  west: typeof boundaries.west === "string" ? boundaries.west : null,
                  westDimension: typeof boundaries.westDimension === "string" ? boundaries.westDimension : null,
                }
              : null,
          };
        })}
        firm={{ ...firm, authorizedPersons }}
        initialData={existingInitialData}
        manualLetterFields={resolvedTemplateFields
          .filter((field) => !field.mapping || field.mapping.startsWith("manual."))
          .map((field) => ({ key: field.key, label: field.label, inputType: field.inputType }))}
      />
    </ActionPageShell>
  );
}

function buildInitialAllotmentData(
  owner: { id: string; name: string; phone: string | null; address: string | null },
  extra: Record<string, unknown>,
  firm: { authorizedPersons: unknown },
) {
  const allottee = recordOf(extra.allottee);
  const pricing = recordOf(extra.pricing);
  const plotExtra = recordOf(extra.plot);
  const payments = Array.isArray(extra.payments) ? extra.payments.map(recordOf) : [];
  const stamps = Array.isArray(extra.stamps) ? extra.stamps.map(recordOf) : [];
  const witnesses = Array.isArray(extra.witnesses) ? extra.witnesses.map(recordOf) : [];
  const documents = Array.isArray(allottee.documents) ? allottee.documents.map(recordOf) : [];
  const customFields = recordOf(extra.customFields);
  const additionalFields = Array.isArray(extra.additionalFields) ? extra.additionalFields.map(recordOf) : [];
  const customLetterFields = recordOf(extra.customLetterFields);
  const customLetterFiles = recordOf(extra.customLetterFiles);
  const firmData = recordOf(extra.firm);
  const authorizedPersons = Array.isArray(firm.authorizedPersons) ? firm.authorizedPersons : [];

  return {
    ownerId: owner.id,
    name: String(allottee.name ?? owner.name ?? ""),
    address: String(allottee.address ?? owner.address ?? ""),
    phone: String(allottee.phone ?? owner.phone ?? ""),
    selectedAuthorizedPerson: typeof firmData.authorizedPerson === "string" && firmData.authorizedPerson
      ? firmData.authorizedPerson
      : typeof authorizedPersons[0] === "string"
        ? authorizedPersons[0]
        : "",
    signatoryRelation: typeof firmData.signatoryRelation === "string" ? firmData.signatoryRelation : "",
    authorizationDate: typeof firmData.authorizationDate === "string" ? firmData.authorizationDate : "",
    totalAreaPrice: pricing.totalAreaPrice != null ? String(pricing.totalAreaPrice) : "",
    perUnitPrice: pricing.perUnitPrice != null ? String(pricing.perUnitPrice) : "",
    oldPlotCode: typeof plotExtra.oldCode === "string" ? plotExtra.oldCode : "",
    newPlotCode: typeof plotExtra.newCode === "string" ? plotExtra.newCode : "",
    paymentEntries: payments.length
      ? payments.map((payment) => ({
          mode: normalizePaymentMode(payment.mode),
          amount: payment.amount != null ? String(payment.amount) : "",
          reference: typeof payment.reference === "string" ? payment.reference : "",
          date: typeof payment.date === "string" ? payment.date : "",
          bank: typeof payment.bank === "string" ? payment.bank : "",
          files: [],
          uploadedFiles: extractStoredFiles(payment.files),
        }))
      : [{ mode: "Cheque" as const, amount: "", reference: "", files: [], uploadedFiles: [] }],
    effectiveAt: typeof extra.eStampDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(extra.eStampDate) ? extra.eStampDate : new Date().toISOString().slice(0, 10),
    stamps: stamps.length
      ? stamps.map((stamp) => ({ number: typeof stamp.number === "string" ? stamp.number : "", dated: typeof stamp.dated === "string" ? stamp.dated : new Date().toISOString().slice(0, 10) }))
      : [{ number: typeof extra.eStampNumber === "string" ? extra.eStampNumber : "", dated: typeof extra.eStampDate === "string" ? extra.eStampDate : new Date().toISOString().slice(0, 10) }],
    witnesses: witnesses.length
      ? witnesses.map((witness) => ({
          name: typeof witness.name === "string" ? witness.name : "",
          phone: firstString(witness, ["phone", "contact", "mobile", "aadhaar"]),
          address: typeof witness.address === "string" ? witness.address : "",
        }))
      : [{ name: "", phone: "", address: "" }],
    allotteeDocuments: documents.length
      ? documents.map((document) => ({
          kind: normalizeDocumentKind(document.kind),
          number: typeof document.number === "string" ? document.number : "",
          files: [],
          uploadedFiles: extractStoredFiles(document.files),
        }))
      : [{ kind: "Aadhaar" as const, number: "", files: [], uploadedFiles: [] }],
    extraFields: additionalFields.length
      ? additionalFields.map((field) => ({
          label: typeof field.label === "string" ? field.label : "",
          inputType: field.inputType === "FILE" ? "FILE" as const : "TEXT" as const,
          value: typeof field.value === "string" ? field.value : "",
          files: [],
          uploadedFiles: extractStoredFiles(field.files),
        }))
      : Object.entries(customFields).map(([label, value]) => ({
          label,
          inputType: "TEXT" as const,
          value: typeof value === "string" ? value : String(value ?? ""),
          files: [],
          uploadedFiles: [],
        })),
    letterFields: Object.fromEntries(Object.entries(customLetterFields).map(([key, value]) => [key, typeof value === "string" ? value : String(value ?? "")])),
    letterFieldUploadedFiles: Object.fromEntries(
      Object.entries(customLetterFiles).map(([key, value]) => [key, extractStoredFiles(value)]).filter(([, files]) => files.length),
    ),
  };
}

function recordOf(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function extractStoredFiles(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map(recordOf)
    .filter((file) => typeof file.id === "string" && typeof file.fileName === "string")
    .map((file) => ({ id: String(file.id), fileName: String(file.fileName) }));
}

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (typeof record[key] === "string") return record[key] as string;
  }
  return "";
}

function normalizePaymentMode(value: unknown): "Cheque" | "RTGS" | "NEFT" {
  if (value === "RTGS" || value === "NEFT" || value === "Cheque") return value;
  if (value === "Bank transfer") return "RTGS";
  return "Cheque";
}

function normalizeDocumentKind(value: unknown) {
  const text = typeof value === "string" ? value : "Other";
  return ["Aadhaar", "PAN", "DL", "Other"].includes(text) ? text as "Aadhaar" | "PAN" | "DL" | "Other" : "Other";
}
