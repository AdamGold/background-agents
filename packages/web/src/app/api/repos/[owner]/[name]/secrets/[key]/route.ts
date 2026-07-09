import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyControlPlane, requireUser } from "@/lib/api-route";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ owner: string; name: string; key: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { owner, name, key } = await params;
  return proxyControlPlane(
    "Failed to delete repo secret",
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/secrets/${encodeURIComponent(key)}`,
    {
      method: "DELETE",
    }
  );
}
