import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyControlPlane, requireUser } from "@/lib/api-route";
import { buildControlPlanePath } from "@/lib/control-plane-query";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const path = buildControlPlanePath(`/automations/${id}/runs`, request.nextUrl.searchParams);
  return proxyControlPlane("Failed to fetch automation runs", path);
}
