import { NextRequest, NextResponse } from "next/server";
import { getCadScene, getSpatialLinks } from "@/lib/cad-engine";

export function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const scene = getCadScene(params.id);
  if (!scene) {
    return NextResponse.json({ error: "CAD scene not found" }, { status: 404 });
  }
  return NextResponse.json({ scene, spatialLinks: getSpatialLinks(scene.id) });
}
