import { notFound } from "next/navigation";
import { PlotStatus } from "@prisma/client";
import { requirePagePermission } from "@/server/page-auth";
import { prisma } from "@/server/db";
import { sortByPlotCode } from "@/lib/plot-code-sort";
import { ActionHint, ActionPageShell } from "../../../action-page-shell";
import { ProjectAllotmentFlow } from "../../../workflow-action-forms";
import { ensureProjectLetterTemplates, extractTemplateFieldsFromBody, templateFields } from "@/server/services/document-templates";
import { listLetterFieldSettings } from "@/server/services/letter-field-settings";

export const dynamic = "force-dynamic";

export default async function NewAllotmentPage(
  props: {
    params: Promise<{ projectId: string }>;
    searchParams: Promise<{ plotId?: string; edit?: string; historical?: string; historicalFileId?: string; crmLeadId?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const session = await requirePagePermission("documents.generate");
  const project = await prisma.project.findFirst({ where: { id: params.projectId, tenantId: session.tenantId } });
  if (!project) notFound();
  const isHistoricalImport = searchParams.historical === "1";
  await ensureProjectLetterTemplates(session.tenantId, project.id);
  const [plots, firm, letterTemplate, letterCategories, existingAllotment, historicalFile, crmLead] = await Promise.all([
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
    (searchParams.edit || isHistoricalImport) && searchParams.plotId
      ? prisma.ownershipRecord.findFirst({
          where: { tenantId: session.tenantId, plotId: searchParams.plotId, kind: "ALLOTMENT", cancelledAt: null },
          include: { owner: true },
          orderBy: { createdAt: "desc" },
        })
      : null,
    isHistoricalImport && searchParams.historicalFileId && searchParams.plotId
      ? prisma.fileAsset.findFirst({
          where: {
            id: searchParams.historicalFileId,
            tenantId: session.tenantId,
            ownerType: "Plot",
            ownerId: searchParams.plotId,
            categoryKey: { in: ["old-documents", "signed-allotment-letter"] },
            OR: [{ documentType: "ALLOTMENT_LETTER" }, { documentType: null }],
            deletedAt: null,
          },
        })
      : null,
    searchParams.crmLeadId
      ? prisma.crmLead.findFirst({ where: { id: searchParams.crmLeadId, tenantId: session.tenantId, archivedAt: null, status: { in: ["BOOKED", "CUSTOMER"] } } })
      : null,
  ]);
  if (isHistoricalImport && !historicalFile) notFound();
  const existingDocument = existingAllotment?.documentId
    ? await prisma.generatedDocument.findFirst({
        where: {
          id: existingAllotment.documentId,
          tenantId: session.tenantId,
          recordType: "Plot",
          recordId: searchParams.plotId,
          archivedAt: null,
        },
      })
    : searchParams.edit && searchParams.plotId
      ? await prisma.generatedDocument.findFirst({
          where: {
            tenantId: session.tenantId,
            recordType: "Plot",
            recordId: searchParams.plotId,
            type: { in: ["allotment_letter", "allotment_letter_joint"] },
            archivedAt: null,
          },
          orderBy: { updatedAt: "desc" },
        })
      : null;
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
  const mayPrefillExisting = Boolean(
    existingAllotment?.owner
    && (searchParams.edit || (isHistoricalImport && existingExtra.historicalImport === true)),
  );
  const savedAllotmentData = mayPrefillExisting && existingAllotment?.owner
    ? buildInitialAllotmentData(existingAllotment.owner, existingExtra, firm)
    : undefined;
  const existingAllotmentNumber = existingDocument?.number
    ?? (typeof existingExtra.allotmentNumber === "string" && existingExtra.allotmentNumber
      ? existingExtra.allotmentNumber
      : typeof existingExtra.historicalDocumentNumber === "string" && existingExtra.historicalDocumentNumber
        ? existingExtra.historicalDocumentNumber
        : historicalFile?.documentNo ?? historicalFile?.fileName.replace(/\.[^.]+$/, "") ?? "");
  const existingInitialData = savedAllotmentData
    ? {
        ...savedAllotmentData,
        documentId: existingDocument?.id,
        allotmentNumber: existingAllotmentNumber,
        effectiveAt: isHistoricalImport && existingAllotment
          ? dateInput(existingAllotment.effectiveAt)
          : savedAllotmentData.effectiveAt,
      }
    : undefined;
  const crmInitialData = !existingInitialData && crmLead ? {
    name: crmLead.name,
    address: [crmLead.area, crmLead.city].filter(Boolean).join(", "),
    phone: crmLead.primaryPhone,
    selectedAuthorizedPerson: authorizedPersons[0] ?? "",
    totalAreaPrice: crmLead.budgetMaxInr?.toString() ?? "",
    perUnitPrice: "",
    paymentEntries: [{ mode: "Cheque" as const, amount: "", reference: "", files: [], uploadedFiles: [] }],
    effectiveAt: new Date().toISOString().slice(0, 10),
    stamps: [{ number: "", dated: new Date().toISOString().slice(0, 10) }],
    witnesses: [{ name: "", phone: "", address: "" }],
    allotteeDocuments: [{ kind: "Aadhaar" as const, number: "", files: [], uploadedFiles: [] }],
    extraFields: [],
    letterFields: {},
    letterFieldUploadedFiles: {},
  } : undefined;

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
      title={isHistoricalImport ? "Complete imported allotment" : "New allotment"}
      description={isHistoricalImport
        ? "Existing owner information is filled below. Add the remaining details from the old signed allotment."
        : "Select a plot and record the allottee, firm, payment, and supporting details."}
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
        initialData={existingInitialData ?? crmInitialData}
        crmLeadId={crmLead?.id}
        historicalImport={historicalFile ? {
          fileAssetId: historicalFile.id,
          documentNumber: historicalFile.documentNo ?? "",
          documentDate: dateInput(historicalFile.documentDate),
        } : undefined}
        manualLetterFields={resolvedTemplateFields
          .filter((field) => !field.mapping || field.mapping.startsWith("manual."))
          .map((field) => ({ key: field.key, label: field.label, inputType: field.inputType }))}
      />
    </ActionPageShell>
  );
}

function dateInput(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

function buildInitialAllotmentData(
  owner: { id: string; name: string; phone: string | null; address: string | null },
  extra: Record<string, unknown>,
  firm: { authorizedPersons: unknown },
) {
  const allottee = recordOf(extra.allottee);
  const secondAllottee = recordOf(extra.secondAllottee);
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
    jointAllottee: {
      name: typeof secondAllottee.name === "string" ? secondAllottee.name : "",
      fatherName: typeof secondAllottee.fatherName === "string" ? secondAllottee.fatherName : "",
      address: typeof secondAllottee.address === "string" ? secondAllottee.address : "",
      aadhaarNo: typeof secondAllottee.aadhaarNo === "string" ? secondAllottee.aadhaarNo : "",
      panNo: typeof secondAllottee.panNo === "string" ? secondAllottee.panNo : "",
      mobileNo: typeof secondAllottee.mobileNo === "string" ? secondAllottee.mobileNo : "",
      share: typeof secondAllottee.share === "string" ? secondAllottee.share : "",
    },
    allotmentNumber: typeof extra.allotmentNumber === "string"
      ? extra.allotmentNumber
      : typeof extra.historicalDocumentNumber === "string"
        ? extra.historicalDocumentNumber
        : "",
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
