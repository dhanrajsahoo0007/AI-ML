import { CONSENT_VERSIONS } from "@/server/db/consent";

// The age / parental-consent confirmation (plan §8.3). /sign-in posts the checkbox to /api/account/consent,
// which sets this short-lived cookie scoped to /api/auth. Better Auth then:
// - refuses `/sign-in/social` without it (hooks.before in server.ts), and
// - records it in consent_log (kind `age_confirmation`) when the session is created after the Google callback.

const AGE_COOKIE = "oa_age_ok";
const AGE_COOKIE_PATH = "/api/auth";
const AGE_COOKIE_MAX_AGE = 15 * 60;
export const AGE_TEXT_VERSION = CONSENT_VERSIONS.age_confirmation;

export function ageCookie(secure: boolean): string {
  return [
    `${secure ? "__Secure-" : ""}${AGE_COOKIE}=${AGE_TEXT_VERSION}`,
    `Path=${AGE_COOKIE_PATH}`,
    `Max-Age=${AGE_COOKIE_MAX_AGE}`,
    "HttpOnly",
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export const ageCookieName = (secure: boolean) => `${secure ? "__Secure-" : ""}${AGE_COOKIE}`;

/** ISO country from Cloudflare's header, when present. */
export function requestCountry(headers: Headers | undefined | null): string | null {
  const c = headers?.get("cf-ipcountry")?.toUpperCase();
  return c && /^[A-Z]{2}$/.test(c) && c !== "XX" && c !== "T1" ? c : null;
}
