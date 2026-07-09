import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/control-plane", () => ({
  controlPlaneFetch: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { controlPlaneFetch } from "@/lib/control-plane";
import { proxyControlPlane, requireUser, unauthorized } from "./api-route";

describe("requireUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns a 401 response when there is no session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const result = await requireUser();

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns a 401 response when the session has no user", async () => {
    vi.mocked(getServerSession).mockResolvedValue({} as never);

    const result = await requireUser();

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it("returns the session when a user is present", async () => {
    const session = { user: { id: "user-1" } };
    vi.mocked(getServerSession).mockResolvedValue(session as never);

    const result = await requireUser();

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toBe(session);
  });
});

describe("proxyControlPlane", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("forwards the control plane body and status without passing init", async () => {
    vi.mocked(controlPlaneFetch).mockResolvedValue(Response.json({ ok: true }, { status: 201 }));

    const response = await proxyControlPlane("Failed to do thing", "/thing");

    expect(controlPlaneFetch).toHaveBeenCalledWith("/thing");
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("passes init through when provided", async () => {
    vi.mocked(controlPlaneFetch).mockResolvedValue(Response.json({ ok: true }, { status: 200 }));

    await proxyControlPlane("Failed to do thing", "/thing", { method: "POST" });

    expect(controlPlaneFetch).toHaveBeenCalledWith("/thing", { method: "POST" });
  });

  it("returns a 500 with the error message when the fetch throws", async () => {
    vi.mocked(controlPlaneFetch).mockRejectedValue(new Error("boom"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await proxyControlPlane("Failed to do thing", "/thing");

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to do thing" });
    errorSpy.mockRestore();
  });
});

describe("unauthorized", () => {
  it("returns a 401 JSON response", async () => {
    const response = unauthorized();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});
