import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AgentResponse } from "../types";
import type * as SharedModule from "@open-inspect/shared";

// Mock the shared extractor so we can assert extractAgentResponse maps the
// Linear-bot Env into the generic ExtractorDeps shape correctly.
const sharedExtractMock = vi.fn();
vi.mock("@open-inspect/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof SharedModule>();
  return {
    ...actual,
    extractAgentResponse: (...args: unknown[]) => sharedExtractMock(...args),
  };
});

import { extractAgentResponse, formatAgentResponse } from "./extractor";
import type { Env } from "../types";

function makeAgentResponse(overrides: Partial<AgentResponse> = {}): AgentResponse {
  return {
    textContent: "",
    toolCalls: [],
    artifacts: [],
    success: true,
    ...overrides,
  };
}

// ─── extractAgentResponse ────────────────────────────────────────────────────

describe("extractAgentResponse", () => {
  beforeEach(() => {
    sharedExtractMock.mockReset();
  });

  it("delegates to shared extractor with mapped deps and forwarded args", async () => {
    const expected = makeAgentResponse({ textContent: "done" });
    sharedExtractMock.mockResolvedValue(expected);

    const env = {
      CONTROL_PLANE: { fetch: vi.fn() },
      INTERNAL_CALLBACK_SECRET: "secret",
    } as unknown as Env;

    const result = await extractAgentResponse(env, "sess-1", "msg-1", "trace-1");

    expect(result).toBe(expected);
    expect(sharedExtractMock).toHaveBeenCalledTimes(1);

    const [deps, sessionId, messageId, traceId] = sharedExtractMock.mock.calls[0];
    expect(deps.fetcher).toBe(env.CONTROL_PLANE);
    expect(deps.internalSecret).toBe("secret");
    expect(deps.log).toBeDefined();
    expect(sessionId).toBe("sess-1");
    expect(messageId).toBe("msg-1");
    expect(traceId).toBe("trace-1");
  });

  it("forwards an undefined traceId", async () => {
    sharedExtractMock.mockResolvedValue(makeAgentResponse());

    const env = {
      CONTROL_PLANE: { fetch: vi.fn() },
      INTERNAL_CALLBACK_SECRET: undefined,
    } as unknown as Env;

    await extractAgentResponse(env, "sess-2", "msg-2");

    const [deps, , , traceId] = sharedExtractMock.mock.calls[0];
    expect(deps.internalSecret).toBeUndefined();
    expect(traceId).toBeUndefined();
  });
});

// ─── formatAgentResponse ─────────────────────────────────────────────────────

describe("formatAgentResponse", () => {
  it("returns an empty string for an empty response", () => {
    expect(formatAgentResponse(makeAgentResponse())).toBe("");
  });

  it("includes the PR link when a pr artifact with a url exists", () => {
    const out = formatAgentResponse(
      makeAgentResponse({
        artifacts: [{ type: "pr", url: "https://github.com/o/r/pull/1", label: "PR" }],
      })
    );
    expect(out).toContain("**Pull request opened:** https://github.com/o/r/pull/1");
  });

  it("ignores a pr artifact without a url", () => {
    const out = formatAgentResponse(
      makeAgentResponse({
        artifacts: [{ type: "pr", url: "", label: "PR" }],
      })
    );
    expect(out).not.toContain("Pull request opened");
  });

  it("lists Edit and Write tool calls as file changes", () => {
    const out = formatAgentResponse(
      makeAgentResponse({
        toolCalls: [
          { tool: "Edit", summary: "edited a.ts" },
          { tool: "Write", summary: "wrote b.ts" },
          { tool: "Read", summary: "read c.ts" },
        ],
      })
    );
    expect(out).toContain("**Files changed (2):**");
    expect(out).toContain("- edited a.ts");
    expect(out).toContain("- wrote b.ts");
    expect(out).not.toContain("read c.ts");
  });

  it("truncates the file list to 10 entries with a summary line", () => {
    const toolCalls = Array.from({ length: 12 }, (_, i) => ({
      tool: "Edit",
      summary: `edit ${i}`,
    }));
    const out = formatAgentResponse(makeAgentResponse({ toolCalls }));
    expect(out).toContain("**Files changed (12):**");
    expect(out).toContain("- edit 9");
    expect(out).not.toContain("- edit 10");
    expect(out).toContain("- ... and 2 more");
  });

  it("includes short summary text verbatim", () => {
    const out = formatAgentResponse(makeAgentResponse({ textContent: "all good" }));
    expect(out).toContain("all good");
  });

  it("truncates summary text longer than 500 chars", () => {
    const long = "x".repeat(600);
    const out = formatAgentResponse(makeAgentResponse({ textContent: long }));
    expect(out).toContain("x".repeat(500) + "...");
    expect(out).not.toContain("x".repeat(501));
  });
});
