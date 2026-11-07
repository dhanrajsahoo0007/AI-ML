// Where to continue after sign-in (`/sign-in?callbackURL=…`, `/sign-in/complete?next=…`). Used by the sign-in page
// on the server and by the merge island in the browser, so it has no imports.
//
// Security review M1: a prefix check alone is an open redirect. The WHATWG URL parser strips tab, CR and LF and
// treats `\` like `/`, so `/\t/evil.example` and `/\evil.example` both become `https://evil.example/`, and
// `/..//evil.example` normalises to `//evil.example`. So: refuse control characters and backslashes (also after
// one round of percent-decoding, for values that were encoded twice), resolve against a placeholder origin, keep
// only results on that origin, and return the parser's own path, never the raw input.

const BASE = "https://next-path.invalid";
const MAX_LENGTH = 512;
// C0 and C1 controls, DEL, backslash, and the Unicode line/paragraph separators.
const FORBIDDEN = /[\u0000-\u001F\u007F-\u009F\\\u2028\u2029]/;

function looksLocal(value: string): boolean {
  return !FORBIDDEN.test(value) && value.startsWith("/") && !value.startsWith("//");
}

/** A same-origin path to continue to after sign-in; anything else becomes `fallback`. */
export function safeNextPath(raw: unknown, fallback = "/account"): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || value.length > 2048) return fallback;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (!looksLocal(value) || !looksLocal(decoded)) return fallback;

  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  const path = url.pathname;
  if (path.startsWith("//") || path.startsWith("/api/") || path === "/api" || path.startsWith("/sign-in")) {
    return fallback;
  }
  const result = path + url.search + url.hash;
  return result.length > MAX_LENGTH || !looksLocal(result) ? fallback : result;
}
