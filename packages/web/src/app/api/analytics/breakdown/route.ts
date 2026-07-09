import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyControlPlane, requireUser } from "@/lib/api-route";
import { buildAnalyticsBreakdownPath } from "@/lib/analytics-query";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const path = buildAnalyticsBreakdownPath(new URL(request.url).searchParams);
  return proxyControlPlane("Failed to fetch analytics breakdown", path);
}
