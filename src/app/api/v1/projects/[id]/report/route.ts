import { NextRequest, NextResponse } from "next/server";
import { apiError, getRequestContext } from "@/server/api";
import { getProjectReportCsv } from "@/server/services/projects";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const context = await getRequestContext(request, "ownership.view");
    const report = await getProjectReportCsv(context, params.id);
    return new NextResponse(report.csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${report.fileName}"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
