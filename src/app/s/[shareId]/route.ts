import { NextRequest, NextResponse } from "next/server";
import { publicAppOrigin } from "@/server/public-app-url";

export async function GET(request: NextRequest, props: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await props.params;
  const destination = new URL("/share", publicAppOrigin(request));
  if (/^[A-Za-z0-9_-]{12,16}$/.test(shareId)) destination.searchParams.set("s", shareId);
  return NextResponse.redirect(destination, 307);
}
