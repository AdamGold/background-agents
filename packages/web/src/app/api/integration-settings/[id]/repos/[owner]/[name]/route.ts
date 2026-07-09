import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyControlPlane, requireUser } from "@/lib/api-route";

function repoSettingsPath(id: string, owner: string, name: string): string {
  return `/integration-settings/${encodeURIComponent(id)}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; owner: string; name: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id, owner, name } = await params;
  return proxyControlPlane(
    "Failed to fetch repo integration settings",
    repoSettingsPath(id, owner, name)
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; owner: string; name: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id, owner, name } = await params;
  const body = await request.json();
  return proxyControlPlane(
    "Failed to update repo integration settings",
    repoSettingsPath(id, owner, name),
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; owner: string; name: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id, owner, name } = await params;
  return proxyControlPlane(
    "Failed to delete repo integration settings",
    repoSettingsPath(id, owner, name),
    {
      method: "DELETE",
    }
  );
}
