import { CadFormat } from "@prisma/client";
import { NextRequest } from "next/server";
import { apiError, getRequestContext, ok } from "@/server/api";
import { replaceCadFile } from "@/server/services/cad";

export const runtime = "nodejs";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "cad.upload");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throwBadRequest("Choose a DXF, DWG, or PDF drawing.");
    const maxBytes = Number(process.env.MAX_CAD_UPLOAD_MB ?? 100) * 1024 * 1024;
    if (file.size <= 0) throwBadRequest("The selected map file is empty.");
    if (file.size > maxBytes) throwBadRequest(`Map files must be smaller than ${process.env.MAX_CAD_UPLOAD_MB ?? 100} MB.`);

    const lower = file.name.toLowerCase();
    const format = lower.endsWith(".dxf")
      ? CadFormat.DXF
      : lower.endsWith(".dwg")
        ? CadFormat.DWG
      : lower.endsWith(".pdf")
        ? CadFormat.VECTOR_PDF
        : null;
    if (!format) throwBadRequest("Only DXF, DWG, and PDF drawings are supported.");

    return ok(await replaceCadFile(context, params.id, {
      bytes: Buffer.from(await file.arrayBuffer()),
      originalName: file.name,
      contentType: file.type || (format === CadFormat.VECTOR_PDF ? "application/pdf" : "application/octet-stream"),
      format,
    }));
  } catch (error) {
    return apiError(error);
  }
}

function throwBadRequest(message: string): never {
  const error = new Error(message);
  error.name = "BadRequestError";
  throw error;
}
