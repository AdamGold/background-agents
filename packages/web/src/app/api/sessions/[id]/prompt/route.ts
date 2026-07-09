import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-route";
import { controlPlaneFetch } from "@/lib/control-plane";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id: sessionId } = await params;

  try {
    const body = await request.json();
    const { content, model, reasoningEffort } = body;

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const user = auth.user;
    const userId = user.id || user.email || "anonymous";

    const response = await controlPlaneFetch(`/sessions/${sessionId}/prompt`, {
      method: "POST",
      body: JSON.stringify({
        content,
        authorId: userId,
        source: "web",
        model,
        reasoningEffort,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to send prompt: ${errorText}`);
      return NextResponse.json({ error: "Failed to send prompt" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to send prompt:", error);
    return NextResponse.json({ error: "Failed to send prompt" }, { status: 500 });
  }
}
