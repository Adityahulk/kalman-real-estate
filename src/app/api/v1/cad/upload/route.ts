import { NextRequest } from "next/server";
import { apiError, created, getRequestContext, parseJson } from "@/server/api";
import { CadFormat, CadScope } from "@prisma/client";
import { cadUploadSchema, createCadUpload, createStoredCadUpload } from "@/server/services/cad";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request, "cad.upload");
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throwBadRequest("Choose a DXF or PDF drawing.");
      const maxBytes = Number(process.env.MAX_CAD_UPLOAD_MB ?? 100) * 1024 * 1024;
      if (file.size <= 0) throwBadRequest("The selected map file is empty.");
      if (file.size > maxBytes) {
        throwBadRequest(`Map files must be smaller than ${process.env.MAX_CAD_UPLOAD_MB ?? 100} MB.`);
      }

      const format = parseCadFormat(String(form.get("format") ?? ""), file.name);
      return created(await createStoredCadUpload(context, {
        projectId: optionalString(form.get("projectId")),
        parentType: parseCadScope(form.get("parentType")),
        parentId: requiredString(form.get("parentId"), "Map parent is required."),
        format,
        originalName: file.name,
        contentType: file.type || (format === CadFormat.VECTOR_PDF ? "application/pdf" : "application/octet-stream"),
        bytes: Buffer.from(await file.arrayBuffer()),
      }));
    }
    return created(await createCadUpload(context, await parseJson(request, cadUploadSchema)));
  } catch (error) {
    return apiError(error);
  }
}

function parseCadScope(value: FormDataEntryValue | null) {
  const scope = String(value ?? "");
  if (!Object.values(CadScope).includes(scope as CadScope)) throwBadRequest("Invalid map scope.");
  return scope as CadScope;
}

function parseCadFormat(value: string, fileName: string) {
  const lower = fileName.toLowerCase();
  const inferred = lower.endsWith(".pdf") ? CadFormat.VECTOR_PDF : lower.endsWith(".dxf") ? CadFormat.DXF : null;
  const requested = Object.values(CadFormat).includes(value as CadFormat) ? value as CadFormat : inferred;
  if (!requested || (requested !== CadFormat.DXF && requested !== CadFormat.VECTOR_PDF)) {
    throwBadRequest("Only DXF and PDF drawings are supported in this deployment.");
  }
  if (requested === CadFormat.DXF && !lower.endsWith(".dxf")) throwBadRequest("The selected file must use the .dxf extension.");
  if (requested === CadFormat.VECTOR_PDF && !lower.endsWith(".pdf")) throwBadRequest("The selected file must use the .pdf extension.");
  return requested;
}

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function requiredString(value: FormDataEntryValue | null, message: string) {
  const text = optionalString(value);
  if (!text) throwBadRequest(message);
  return text;
}

function throwBadRequest(message: string): never {
  const error = new Error(message);
  error.name = "BadRequestError";
  throw error;
}
