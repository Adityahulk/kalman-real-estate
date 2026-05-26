import { NextRequest, NextResponse } from "next/server";
import { platformOverview } from "@/data/platform";

export function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get("tenantId") ?? "tenant-demo";
  return NextResponse.json(platformOverview(tenantId));
}
