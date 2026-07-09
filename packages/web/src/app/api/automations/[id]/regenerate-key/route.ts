import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyControlPlane, requireUser } from "@/lib/api-route";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  return proxyControlPlane(
    "Failed to regenerate key",
    `/automations/${id}/regenerate-key`,
    async () => {
      const body = await request.text();
      return {
        method: "POST",
        ...(body ? { headers: { "Content-Type": "application/json" }, body } : {}),
      };
    }
  );
}
