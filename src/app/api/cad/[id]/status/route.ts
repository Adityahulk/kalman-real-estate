import { NextRequest, NextResponse } from "next/server";
import { getCadStatus } from "@/lib/cad-engine";

export function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const status = getCadStatus(params.id);
  if (!status) {
    return NextResponse.json({ error: "CAD scene not found" }, { status: 404 });
  }
  return NextResponse.json(status);
}
