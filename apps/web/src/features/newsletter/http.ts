import "server-only";
import { NotConfiguredError } from "./server";

// Small HTTP helpers for app/api/newsletter/**, standing in for the shared route() wrapper of plan §11.6
// (src/server/http.ts, not built yet): no-store, a uniform error shape without stack traces, and a body size cap.

const NO_STORE = { "Cache-Control": "no-store" };

export function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export const error = (status: number, code: string, headers?: Record<string, string>) =>
  json(status, { error: code }, headers);

/** 404 for every newsletter API route while the section is not `on` in this build. */
export const sectionOff = () => error(404, "not_found");

/** Reads a small request body as text; null when it is larger than `max` bytes. */
export async function readBody(request: Request, max = 4096): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > max) return null;
  const text = await request.text();
  return new TextEncoder().encode(text).length > max ? null : text;
}

export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export const isJson = (request: Request) =>
  (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() === "application/json";

/** Runs a handler and turns unexpected failures into a 503 or 500 without leaking details. */
export async function guarded(name: string, run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof NotConfiguredError) {
      console.error(`[newsletter] ${name}: not configured: ${e.message}`);
      return error(503, "not_configured");
    }
    console.error(`[newsletter] ${name} failed: ${(e as Error).message}`);
    return error(500, "internal_error");
  }
}
