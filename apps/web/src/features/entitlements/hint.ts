// The `tts_ent_hint` cookie: a readable companion of the HttpOnly `tts_ent` cookie (plan §9.2, §11.3). It
// carries no authority (middleware never reads it), only what the client islands need to know: when `tts_ent`
// expires (refresh just before), the tier (show the right CTA) and whether the subscription is on hold
// (dunning banner). No imports: shared by the refresh endpoint and the client islands.

export const HINT_COOKIE = "tts_ent_hint";

export const REFRESH_PATH = "/api/entitlements/refresh";

/** Refresh this long before `tts_ent` expires (plan §9.2: under 2 minutes from expiry). */
export const REFRESH_EARLY_SEC = 120;

export interface EntitlementHint {
  /** `exp` of the current `tts_ent`, in seconds. */
  exp: number;
  tier: "free" | "pro";
  /** The subscription is on hold (payment failed, 7-day grace period running). */
  hold: boolean;
}

export function formatHint(hint: EntitlementHint): string {
  return `${hint.exp}.${hint.tier}.${hint.hold ? 1 : 0}`;
}

export function parseHint(value: string | undefined | null): EntitlementHint | null {
  const m = /^(\d{1,12})\.(free|pro)\.([01])$/.exec(value ?? "");
  return m ? { exp: Number(m[1]), tier: m[2] as "free" | "pro", hold: m[3] === "1" } : null;
}

/** The hint from a `document.cookie` string. */
export function hintFromCookies(cookies: string): EntitlementHint | null {
  const pair = cookies.split(/;\s*/).find((c) => c.startsWith(`${HINT_COOKIE}=`));
  return parseHint(pair ? decodeURIComponent(pair.slice(HINT_COOKIE.length + 1)) : null);
}

/** Whether a refresh is due (signed in and `tts_ent` expired or about to). */
export function refreshDue(hint: EntitlementHint | null, nowSec: number): boolean {
  return hint !== null && nowSec >= hint.exp - REFRESH_EARLY_SEC;
}
