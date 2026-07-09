import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyControlPlane, requireUser } from "@/lib/api-route";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { key } = await params;
  return proxyControlPlane(
    "Failed to delete global secret",
    `/secrets/${encodeURIComponent(key)}`,
    {
      method: "DELETE",
    }
  );
}
