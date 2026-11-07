import "server-only";

// Structured logs (plan §10.2, §11.8): one JSON object per line on stdout, which Workers Observability (and
// `next start`) index as fields. Never log secrets, cookies, tokens or full emails: user ID only. Every value goes
// through `redact()` first, so a careless `log.info("x", { headers })` still can't leak a cookie.

type Level = "debug" | "info" | "warn" | "error";

/** The fields §10.2 names. Extra, event-specific fields are allowed and are redacted the same way. */
export interface LogFields {
  /** `cf-ray` on Cloudflare (see `requestContext`), so a log line can be matched to a Cloudflare request. */
  request_id?: string;
  /** The route pattern or path, never with its query string. */
  route?: string;
  status?: number;
  duration_ms?: number;
  /** Our own user ID. Never an email or a name. */
  user_id?: string;
  tier?: "anonymous" | "free" | "pro";
  cache?: "hit" | "miss" | "stale" | "bypass" | "dynamic";
  /** Cloudflare data centre (IATA code), e.g. `BOM`. */
  colo?: string;
  [key: string]: unknown;
}

const REDACTED = "[redacted]";

/** Field names whose value is dropped whatever it holds. */
const SECRET_KEY =
  /e-?mail|token|cookie|password|passwd|secret|authorization|auth[-_]?header|session|api[-_]?key|signature|credential|card[-_]?number|^card$/i;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;

const MAX_DEPTH = 6;

function redactString(value: string): string {
  return value.replace(EMAIL, "[email]").replace(BEARER, "Bearer [redacted]").replace(JWT, "[jwt]");
}

/**
 * Returns a copy of `value` that is safe to log: fields named like a secret (email, token, cookie, password,
 * authorization, session, API key, signature) are replaced by `[redacted]`, and emails, bearer tokens and JWTs
 * inside any other string are masked. Errors keep their name, message and stack (masked the same way).
 */
export function redact(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") {
    return typeof value === "bigint" ? value.toString() : typeof value === "function" ? undefined : value;
  }
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message), stack: value.stack && redactString(value.stack) };
  }
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Headers) return redact(Object.fromEntries(value.entries()), depth);
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = SECRET_KEY.test(key) ? REDACTED : redact(v, depth + 1);
  }
  return out;
}

type Sink = (level: Level, line: string) => void;

const consoleSink: Sink = (level, line) => {
  // Workers Observability reads the level from the console method.
  console[level](line);
};

let sink: Sink = consoleSink;

/** Tests only: capture lines instead of writing them. Returns a function that restores the console. */
export function setLogSink(next: Sink): () => void {
  sink = next;
  return () => {
    sink = consoleSink;
  };
}

/** Builds the JSON line for one log entry (exported for tests). */
export function formatLog(level: Level, msg: string, fields: LogFields = {}): string {
  const safe = redact(fields) as Record<string, unknown>;
  // The envelope keys always come from the call, never from a field of the same name.
  delete safe.ts;
  delete safe.level;
  delete safe.msg;
  return JSON.stringify({ ts: new Date().toISOString(), level, msg: redactString(msg), ...safe });
}

function write(level: Level, msg: string, fields?: LogFields) {
  sink(level, formatLog(level, msg, fields));
}

export const log = {
  debug: (msg: string, fields?: LogFields) => write("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => write("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => write("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => write("error", msg, fields),
};

/**
 * `request_id` and `colo` from Cloudflare's `cf-ray` header (`<id>-<colo>`, e.g. `8f1c2a3b4d5e6f70-BOM`). Outside
 * Cloudflare there is no `cf-ray`, so `x-request-id` is used if present, else a random ID.
 */
export function requestContext(headers: Headers): Pick<LogFields, "request_id" | "colo"> {
  const ray = headers.get("cf-ray");
  if (ray) {
    const dash = ray.lastIndexOf("-");
    return dash > 0 ? { request_id: ray, colo: ray.slice(dash + 1) } : { request_id: ray };
  }
  return { request_id: headers.get("x-request-id") ?? crypto.randomUUID() };
}
