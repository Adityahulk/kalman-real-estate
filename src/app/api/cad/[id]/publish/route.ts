import { NextRequest, NextResponse } from "next/server";
import { publishCad } from "@/lib/cad-engine";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const result = publishCad(params.id, body.publishedBy ?? "Amit Kalra");
  if (!result) {
    return NextResponse.json({ error: "CAD scene not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
