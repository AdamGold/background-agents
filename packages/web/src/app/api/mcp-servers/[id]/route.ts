import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyControlPlane, requireUser } from "@/lib/api-route";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  return proxyControlPlane("Failed to fetch MCP server", `/mcp-servers/${id}`);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  return proxyControlPlane("Failed to update MCP server", `/mcp-servers/${id}`, {
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
  return proxyControlPlane("Failed to delete MCP server", `/mcp-servers/${id}`, {
    method: "DELETE",
  });
}
