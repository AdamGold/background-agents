import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Env, RepoConfig } from "../types";

const getAvailableReposMock = vi.fn();
const buildRepoDescriptionsMock = vi.fn();

vi.mock("./repos", () => ({
  getAvailableRepos: (...args: unknown[]) => getAvailableReposMock(...args),
  buildRepoDescriptions: (...args: unknown[]) => buildRepoDescriptionsMock(...args),
}));

import { classifyRepo } from "./index";

function makeRepo(id: string): RepoConfig {
  const [owner, name] = id.split("/");
  return {
    id,
    owner,
    name,
    fullName: id,
    displayName: name,
    description: "",
    defaultBranch: "main",
    private: false,
  };
}

const env = { ANTHROPIC_API_KEY: "test-key" } as unknown as Env;

function mockAnthropic(input: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        content: [{ type: "tool_use", name: "classify_repository", input }],
      })
    )
  );
}

beforeEach(() => {
  getAvailableReposMock.mockReset();
  buildRepoDescriptionsMock.mockReset();
  buildRepoDescriptionsMock.mockResolvedValue("repo descriptions");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("classifyRepo", () => {
  it("needs clarification when no repos are available", async () => {
    getAvailableReposMock.mockResolvedValue([]);
    const result = await classifyRepo(env, "title", null, [], null, null, null, null);
    expect(result).toEqual({
      repo: null,
      confidence: "low",
      reasoning: "No repositories are currently available.",
      needsClarification: true,
    });
  });

  it("auto-selects with high confidence when only one repo exists", async () => {
    const only = makeRepo("org/only");
    getAvailableReposMock.mockResolvedValue([only]);
    const result = await classifyRepo(env, "title", null, [], null, null, null, null);
    expect(result.repo).toBe(only);
    expect(result.confidence).toBe("high");
    expect(result.needsClarification).toBe(false);
  });

  it("matches the repo returned by the model (case-insensitive)", async () => {
    getAvailableReposMock.mockResolvedValue([makeRepo("org/api"), makeRepo("org/web")]);
    mockAnthropic({
      repoId: "ORG/API",
      confidence: "high",
      reasoning: "matches api",
      alternatives: [],
    });

    const result = await classifyRepo(env, "fix api", null, [], null, null, null, null);
    expect(result.repo?.id).toBe("org/api");
    expect(result.confidence).toBe("high");
    expect(result.needsClarification).toBe(false);
  });

  it("collects distinct alternatives and excludes the matched repo", async () => {
    getAvailableReposMock.mockResolvedValue([
      makeRepo("org/api"),
      makeRepo("org/web"),
      makeRepo("org/cli"),
    ]);
    mockAnthropic({
      repoId: "org/api",
      confidence: "medium",
      reasoning: "maybe api",
      alternatives: ["org/web", "org/api", "org/cli"],
    });

    const result = await classifyRepo(env, "title", null, [], null, null, null, null);
    expect(result.repo?.id).toBe("org/api");
    expect(result.alternatives?.map((r) => r.id)).toEqual(["org/web", "org/cli"]);
    expect(result.needsClarification).toBe(true);
  });

  it("needs clarification when the model returns low confidence", async () => {
    getAvailableReposMock.mockResolvedValue([makeRepo("org/api"), makeRepo("org/web")]);
    mockAnthropic({
      repoId: "org/api",
      confidence: "low",
      reasoning: "unsure",
      alternatives: [],
    });

    const result = await classifyRepo(env, "title", null, [], null, null, null, null);
    expect(result.needsClarification).toBe(true);
  });

  it("needs clarification when the model matches no known repo", async () => {
    getAvailableReposMock.mockResolvedValue([makeRepo("org/api"), makeRepo("org/web")]);
    mockAnthropic({
      repoId: "org/unknown",
      confidence: "high",
      reasoning: "?",
      alternatives: [],
    });

    const result = await classifyRepo(env, "title", null, [], null, null, null, null);
    expect(result.repo).toBeNull();
    expect(result.needsClarification).toBe(true);
  });

  it("falls back to a clarification prompt when the Anthropic call fails", async () => {
    getAvailableReposMock.mockResolvedValue([makeRepo("org/api"), makeRepo("org/web")]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500 }))
    );

    const result = await classifyRepo(env, "title", null, [], null, null, null, null);
    expect(result.repo).toBeNull();
    expect(result.confidence).toBe("low");
    expect(result.needsClarification).toBe(true);
    expect(result.alternatives).toHaveLength(2);
  });

  it("falls back when the Anthropic response has no tool_use block", async () => {
    getAvailableReposMock.mockResolvedValue([makeRepo("org/api"), makeRepo("org/web")]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ content: [{ type: "text", text: "hi" }] }))
    );

    const result = await classifyRepo(env, "title", null, [], null, null, null, null);
    expect(result.needsClarification).toBe(true);
    expect(result.reasoning).toContain("Could not classify repository automatically");
  });

  it("passes issue context to the prompt builder", async () => {
    getAvailableReposMock.mockResolvedValue([makeRepo("org/api"), makeRepo("org/web")]);
    mockAnthropic({
      repoId: "org/api",
      confidence: "high",
      reasoning: "ok",
      alternatives: [],
    });

    await classifyRepo(env, "the title", "the body", ["bug"], "Proj", "Team", "ENG", "please help");
    expect(buildRepoDescriptionsMock).toHaveBeenCalled();
  });
});
