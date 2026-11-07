import { ENTITLEMENT_COOKIE } from "@/server/edge/entitlement";
import { HINT_COOKIE, formatHint, type EntitlementHint } from "./hint";

// Set-Cookie values for `oa_ent` (plan §11.3: HttpOnly; Secure; SameSite=Lax; Path=/; 15 minutes) and its
// readable hint (see ./hint.ts), which lives as long as a session so the islands know to refresh.

const HINT_MAX_AGE_SEC = 30 * 24 * 60 * 60;

function cookie(name: string, value: string, maxAge: number, opts: { httpOnly: boolean; secure: boolean }) {
  return [
    `${name}=${value}`,
    "Path=/",
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
    "SameSite=Lax",
    ...(opts.httpOnly ? ["HttpOnly"] : []),
    ...(opts.secure ? ["Secure"] : []),
  ].join("; ");
}

export function entitlementCookies(input: {
  token: string;
  hint: EntitlementHint;
  nowSec: number;
  secure: boolean;
}): string[] {
  return [
    cookie(ENTITLEMENT_COOKIE, input.token, input.hint.exp - input.nowSec, { httpOnly: true, secure: input.secure }),
    cookie(HINT_COOKIE, encodeURIComponent(formatHint(input.hint)), HINT_MAX_AGE_SEC, {
      httpOnly: false,
      secure: input.secure,
    }),
  ];
}

export function clearEntitlementCookies(secure: boolean): string[] {
  return [
    cookie(ENTITLEMENT_COOKIE, "", 0, { httpOnly: true, secure }),
    cookie(HINT_COOKIE, "", 0, { httpOnly: false, secure }),
  ];
}
