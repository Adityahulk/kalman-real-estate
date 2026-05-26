import { NextRequest, NextResponse } from "next/server";
import { reviewCad } from "@/lib/cad-engine";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const scene = reviewCad(params.id, body);
  if (!scene) {
    return NextResponse.json({ error: "CAD scene not found" }, { status: 404 });
  }
  return NextResponse.json({ scene });
}
