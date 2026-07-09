import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Env, ControlPlaneRepo, RepoConfig } from "../types";

// repos.ts keeps a module-level local cache, so reset the module registry
// before each test to guarantee a clean cache.
beforeEach(() => {
  vi.resetModules();
});

async function importFresh() {
  return import("./repos");
}

function makeControlPlaneRepo(overrides: Partial<ControlPlaneRepo> = {}): ControlPlaneRepo {
  return {
    id: 1,
    owner: "Org",
    name: "Repo",
    fullName: "Org/Repo",
    description: "top-level description",
    private: false,
    defaultBranch: "main",
    language: "TypeScript",
    topics: ["a", "b"],
    ...overrides,
  } as ControlPlaneRepo;
}

interface FakeKVOptions {
  cache?: RepoConfig[];
  throwOnGet?: boolean;
}

function makeEnv(
  fetchImpl: (url: string, init?: RequestInit) => Promise<Response> | Response,
  kvOptions: FakeKVOptions = {}
): { env: Env; kvPut: ReturnType<typeof vi.fn> } {
  const kvPut = vi.fn(async () => {});
  const kv = {
    async get(_key: string, _type?: string) {
      if (kvOptions.throwOnGet) throw new Error("KV get failed");
      return kvOptions.cache ?? null;
    },
    put: kvPut,
  };
  const env = {
    INTERNAL_CALLBACK_SECRET: "secret",
    LINEAR_KV: kv,
    CONTROL_PLANE: { fetch: vi.fn(fetchImpl) },
  } as unknown as Env;
  return { env, kvPut };
}

// ─── getAvailableRepos ───────────────────────────────────────────────────────

describe("getAvailableRepos", () => {
  it("maps control-plane repos to lowercased RepoConfig and caches to KV", async () => {
    const { getAvailableRepos } = await importFresh();
    const { env, kvPut } = makeEnv(() =>
      Response.json({ repos: [makeControlPlaneRepo()], cached: false, cachedAt: "" })
    );

    const repos = await getAvailableRepos(env);

    expect(repos).toHaveLength(1);
    expect(repos[0]).toMatchObject({
      id: "org/repo",
      owner: "org",
      name: "repo",
      fullName: "org/repo",
      displayName: "Repo",
      description: "top-level description",
      defaultBranch: "main",
      private: false,
      language: "TypeScript",
    });
    expect(kvPut).toHaveBeenCalledTimes(1);
    expect(kvPut.mock.calls[0][0]).toBe("repos:cache");
  });

  it("prefers metadata.description over the top-level description", async () => {
    const { getAvailableRepos } = await importFresh();
    const repo = makeControlPlaneRepo({
      description: "fallback",
      metadata: { description: "from metadata", aliases: ["alias1"], keywords: ["kw"] },
    });
    const { env } = makeEnv(() => Response.json({ repos: [repo], cached: false, cachedAt: "" }));

    const repos = await getAvailableRepos(env);
    expect(repos[0].description).toBe("from metadata");
    expect(repos[0].aliases).toEqual(["alias1"]);
    expect(repos[0].keywords).toEqual(["kw"]);
  });

  it("serves subsequent calls from the local cache without re-fetching", async () => {
    const { getAvailableRepos } = await importFresh();
    const { env } = makeEnv(() =>
      Response.json({ repos: [makeControlPlaneRepo()], cached: false, cachedAt: "" })
    );
    const fetchMock = env.CONTROL_PLANE.fetch as ReturnType<typeof vi.fn>;

    await getAvailableRepos(env);
    await getAvailableRepos(env);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the KV cache when the control plane returns non-ok", async () => {
    const { getAvailableRepos } = await importFresh();
    const cached: RepoConfig[] = [
      {
        id: "org/cached",
        owner: "org",
        name: "cached",
        fullName: "org/cached",
        displayName: "cached",
        description: "d",
        defaultBranch: "main",
        private: false,
      },
    ];
    const { env } = makeEnv(() => new Response("err", { status: 500 }), { cache: cached });

    expect(await getAvailableRepos(env)).toEqual(cached);
  });

  it("falls back to the KV cache when the fetch throws", async () => {
    const { getAvailableRepos } = await importFresh();
    const cached: RepoConfig[] = [
      {
        id: "org/cached",
        owner: "org",
        name: "cached",
        fullName: "org/cached",
        displayName: "cached",
        description: "d",
        defaultBranch: "main",
        private: false,
      },
    ];
    const { env } = makeEnv(
      () => {
        throw new Error("boom");
      },
      { cache: cached }
    );

    expect(await getAvailableRepos(env)).toEqual(cached);
  });

  it("returns [] when neither control plane nor KV cache has data", async () => {
    const { getAvailableRepos } = await importFresh();
    const { env } = makeEnv(() => new Response("err", { status: 503 }));
    expect(await getAvailableRepos(env)).toEqual([]);
  });

  it("returns [] when the KV cache read throws", async () => {
    const { getAvailableRepos } = await importFresh();
    const { env } = makeEnv(() => new Response("err", { status: 503 }), { throwOnGet: true });
    expect(await getAvailableRepos(env)).toEqual([]);
  });
});

// ─── buildRepoDescriptions ───────────────────────────────────────────────────

describe("buildRepoDescriptions", () => {
  it("returns a placeholder message when no repos are available", async () => {
    const { buildRepoDescriptions } = await importFresh();
    const { env } = makeEnv(() => new Response("err", { status: 500 }));
    expect(await buildRepoDescriptions(env)).toBe("No repositories are currently available.");
  });

  it("renders a markdown block per repo with N/A fallbacks", async () => {
    const { buildRepoDescriptions } = await importFresh();
    const repo = makeControlPlaneRepo({ language: null, topics: undefined });
    const { env } = makeEnv(() => Response.json({ repos: [repo], cached: false, cachedAt: "" }));

    const out = await buildRepoDescriptions(env);
    expect(out).toContain("- **org/repo** (org/repo)");
    expect(out).toContain("Description: top-level description");
    expect(out).toContain("Language: N/A");
    expect(out).toContain("Topics: N/A");
    expect(out).toContain("Also known as: N/A");
    expect(out).toContain("Default branch: main");
    expect(out).toContain("Private: No");
  });
});
