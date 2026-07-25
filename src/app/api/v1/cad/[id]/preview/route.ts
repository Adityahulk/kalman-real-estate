import { NextRequest, NextResponse } from "next/server";
import { apiError, getRequestContext } from "@/server/api";
import { getCadPreview } from "@/server/services/cad";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const context = await getRequestContext(request, "cad.view");
    const preview = await getCadPreview(context, params.id);
    return new NextResponse(new Uint8Array(preview.bytes), {
      headers: {
        "content-type": preview.contentType,
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
