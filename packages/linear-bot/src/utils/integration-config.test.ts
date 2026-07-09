import { describe, expect, it, vi } from "vitest";
import { getLinearConfig, type ResolvedLinearConfig } from "./integration-config";
import type { Env } from "../types";

const DEFAULT_CONFIG: ResolvedLinearConfig = {
  model: null,
  reasoningEffort: null,
  allowUserPreferenceOverride: true,
  allowLabelModelOverride: true,
  emitToolProgressActivities: true,
  issueSessionInstructions: null,
  enabledRepos: null,
};

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    INTERNAL_CALLBACK_SECRET: "secret",
    CONTROL_PLANE: { fetch: vi.fn() },
    ...overrides,
  } as unknown as Env;
}

describe("getLinearConfig", () => {
  it("returns defaults when INTERNAL_CALLBACK_SECRET is missing", async () => {
    const fetch = vi.fn();
    const env = makeEnv({
      INTERNAL_CALLBACK_SECRET: undefined,
      CONTROL_PLANE: { fetch } as unknown as Fetcher,
    });
    expect(await getLinearConfig(env, "owner/name")).toEqual(DEFAULT_CONFIG);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns defaults when repo is not in owner/name form", async () => {
    const fetch = vi.fn();
    const env = makeEnv({ CONTROL_PLANE: { fetch } as unknown as Fetcher });
    expect(await getLinearConfig(env, "just-a-name")).toEqual(DEFAULT_CONFIG);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns defaults when the fetch throws", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("network"));
    const env = makeEnv({ CONTROL_PLANE: { fetch } as unknown as Fetcher });
    expect(await getLinearConfig(env, "owner/name")).toEqual(DEFAULT_CONFIG);
  });

  it("returns defaults when the response is not ok", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("nope", { status: 500 }));
    const env = makeEnv({ CONTROL_PLANE: { fetch } as unknown as Fetcher });
    expect(await getLinearConfig(env, "owner/name")).toEqual(DEFAULT_CONFIG);
  });

  it("returns defaults when the response config is null", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ config: null }), { status: 200 }));
    const env = makeEnv({ CONTROL_PLANE: { fetch } as unknown as Fetcher });
    expect(await getLinearConfig(env, "owner/name")).toEqual(DEFAULT_CONFIG);
  });

  it("returns the resolved config from the control plane", async () => {
    const config: ResolvedLinearConfig = {
      model: "claude-sonnet-4-5",
      reasoningEffort: "high",
      allowUserPreferenceOverride: false,
      allowLabelModelOverride: false,
      emitToolProgressActivities: false,
      issueSessionInstructions: "be concise",
      enabledRepos: ["owner/name"],
    };
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ config }), { status: 200 }));
    const env = makeEnv({ CONTROL_PLANE: { fetch } as unknown as Fetcher });

    expect(await getLinearConfig(env, "owner/name")).toEqual(config);

    const url = fetch.mock.calls[0][0] as string;
    expect(url).toBe("https://internal/integration-settings/linear/resolved/owner/name");
  });
});
