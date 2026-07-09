import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyControlPlane, requireUser } from "@/lib/api-route";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const repo = request.nextUrl.searchParams.get("repo");
  const path = repo ? `/mcp-servers?repo=${encodeURIComponent(repo)}` : "/mcp-servers";
  return proxyControlPlane("Failed to fetch MCP servers", path);
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  return proxyControlPlane("Failed to create MCP server", "/mcp-servers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
