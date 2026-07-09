import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyControlPlane, requireUser } from "@/lib/api-route";

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  return proxyControlPlane("Failed to fetch model preferences", "/model-preferences");
}

export async function PUT(request: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  return proxyControlPlane(
    "Failed to update model preferences",
    "/model-preferences",
    async () => ({
      method: "PUT",
      body: JSON.stringify(await request.json()),
    })
  );
}
