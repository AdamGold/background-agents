import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyControlPlane, requireUser } from "@/lib/api-route";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  return proxyControlPlane("Failed to fetch automation", `/automations/${id}`);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  return proxyControlPlane("Failed to update automation", `/automations/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  return proxyControlPlane("Failed to delete automation", `/automations/${id}`, {
    method: "DELETE",
  });
}
