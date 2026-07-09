import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyControlPlane, requireUser } from "@/lib/api-route";

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  return proxyControlPlane("Failed to fetch global secrets", "/secrets");
}

export async function PUT(request: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  return proxyControlPlane("Failed to update global secrets", "/secrets", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
