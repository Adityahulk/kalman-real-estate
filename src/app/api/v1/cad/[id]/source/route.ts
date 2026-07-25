import { NextRequest, NextResponse } from "next/server";
import { apiError, getRequestContext } from "@/server/api";
import { getCadSource } from "@/server/services/cad-browser-extraction";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "cad.review");
    const source = await getCadSource(context, params.id);
    return new NextResponse(source.bytes, {
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": `inline; filename="${safeHeaderFileName(source.cadFile.originalName)}"`,
        "content-type": source.contentType,
        "x-cad-source-sha256": source.sha256,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

function safeHeaderFileName(value: string) {
  return value.replace(/[\r\n"]/g, "_");
}
