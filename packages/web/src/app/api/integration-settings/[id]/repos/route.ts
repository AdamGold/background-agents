import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyControlPlane, requireUser } from "@/lib/api-route";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  return proxyControlPlane(
    "Failed to fetch repo settings",
    `/integration-settings/${encodeURIComponent(id)}/repos`
  );
}
