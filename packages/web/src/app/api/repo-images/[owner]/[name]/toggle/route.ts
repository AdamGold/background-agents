import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyControlPlane, requireUser } from "@/lib/api-route";
import { supportsRepoImages } from "@/lib/sandbox-provider";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; name: string }> }
) {
  if (!supportsRepoImages()) {
    return NextResponse.json(
      { error: "Repo images are only available when SANDBOX_PROVIDER=modal" },
      { status: 501 }
    );
  }

  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { owner, name } = await params;
  return proxyControlPlane(
    "Failed to toggle image build",
    `/repo-images/toggle/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    async () => ({
      method: "PUT",
      body: JSON.stringify(await request.json()),
    })
  );
}
