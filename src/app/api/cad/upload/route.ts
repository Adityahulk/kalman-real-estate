import { NextRequest, NextResponse } from "next/server";
import { uploadCad } from "@/lib/cad-engine";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const fileName = file instanceof File ? file.name : String(form.get("fileName") ?? "uploaded-layout.dxf");
    const result = uploadCad({
      fileName,
      byteSize: file instanceof File ? file.size : undefined,
      tenantId: String(form.get("tenantId") ?? "tenant-demo"),
      uploadedBy: String(form.get("uploadedBy") ?? "Amit Kalra"),
      parentSceneId: form.get("parentSceneId") ? String(form.get("parentSceneId")) : undefined,
      parentEntityId: form.get("parentEntityId") ? String(form.get("parentEntityId")) : undefined
    });
    return NextResponse.json(result, { status: 201 });
  }

  const body = await request.json().catch(() => ({}));
  const result = uploadCad({
    fileName: body.fileName ?? "uploaded-layout.dxf",
    byteSize: body.byteSize,
    tenantId: body.tenantId ?? "tenant-demo",
    uploadedBy: body.uploadedBy ?? "Amit Kalra",
    parentSceneId: body.parentSceneId,
    parentEntityId: body.parentEntityId
  });
  return NextResponse.json(result, { status: 201 });
}
