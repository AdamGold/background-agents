import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyControlPlane, requireUser } from "@/lib/api-route";
import { buildControlPlanePath } from "@/lib/control-plane-query";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const path = buildControlPlanePath("/automations", request.nextUrl.searchParams);
  return proxyControlPlane("Failed to fetch automations", path);
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const user = auth.user;
  const userId = user.id || user.email || "anonymous";

  return proxyControlPlane("Failed to create automation", "/automations", {
    method: "POST",
    body: JSON.stringify({
      ...body,
      userId,
      scmUserId: user.id,
      scmLogin: user.login,
      scmName: user.name,
      scmEmail: user.email,
      scmAvatarUrl: user.image,
    }),
  });
}
