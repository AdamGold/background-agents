import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyControlPlane, requireUser } from "@/lib/api-route";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ owner: string; name: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { owner, name } = await params;
  return proxyControlPlane(
    "Failed to fetch repo secrets",
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/secrets`
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; name: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { owner, name } = await params;
  return proxyControlPlane(
    "Failed to update repo secrets",
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/secrets`,
    async () => ({
      method: "PUT",
      body: JSON.stringify(await request.json()),
    })
  );
}
