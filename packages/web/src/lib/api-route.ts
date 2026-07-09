/**
 * Shared helpers for Next.js API routes that proxy to the control plane.
 *
 * Every route under `src/app/api` repeats the same two pieces of boilerplate:
 *
 *   1. Reject unauthenticated requests with a 401.
 *   2. Call the control plane, forward its JSON body and status, and turn a
 *      thrown error into a logged 500.
 *
 * `requireUser` and `proxyControlPlane` capture those patterns so individual
 * routes only express what is unique to them (path, method, body).
 */

import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { controlPlaneFetch } from "@/lib/control-plane";

/** Standard JSON response for unauthenticated requests. */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Resolve the current authenticated session.
 *
 * Returns the {@link Session} when a user is signed in, otherwise a 401
 * {@link NextResponse}. Callers guard with `instanceof NextResponse`:
 *
 *   const auth = await requireUser();
 *   if (auth instanceof NextResponse) return auth;
 *   // auth is a Session with a defined user here
 */
export async function requireUser(): Promise<Session | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return unauthorized();
  return session;
}

/**
 * Fetch options for a proxied control plane request. Pass a function (which may
 * be async) when the options depend on work that can throw — e.g. parsing the
 * request body. The factory runs inside {@link proxyControlPlane}'s try/catch so
 * a malformed body maps to the same logged 500 as any other failure.
 */
export type ProxyInit = RequestInit | (() => RequestInit | Promise<RequestInit>);

/**
 * Proxy a request to the control plane and mirror its JSON body and status.
 *
 * On a thrown error, logs `${errorMessage}:` with the error and responds with a
 * 500 carrying `{ error: errorMessage }` — matching the convention used across
 * the API routes.
 *
 * @param errorMessage Human-readable label for logs and the 500 error body.
 * @param path         Control plane path (e.g. "/automations/123").
 * @param init         Optional fetch options, or a factory producing them.
 */
export async function proxyControlPlane(
  errorMessage: string,
  path: string,
  init?: ProxyInit
): Promise<NextResponse> {
  try {
    const resolvedInit = typeof init === "function" ? await init() : init;
    const response = resolvedInit
      ? await controlPlaneFetch(path, resolvedInit)
      : await controlPlaneFetch(path);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
