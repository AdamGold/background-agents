import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-route";
import { controlPlaneFetch } from "@/lib/control-plane";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const userId = auth.user.id || auth.user.email || "anonymous";

  try {
    const response = await controlPlaneFetch(`/sessions/${id}/unarchive`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unarchive session error:", error);
    return NextResponse.json({ error: "Failed to unarchive session" }, { status: 500 });
  }
}
