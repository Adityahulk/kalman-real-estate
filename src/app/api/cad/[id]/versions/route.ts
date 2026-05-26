import { NextRequest, NextResponse } from "next/server";
import { getCadVersions } from "@/lib/cad-engine";

export function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json(getCadVersions(params.id));
}
