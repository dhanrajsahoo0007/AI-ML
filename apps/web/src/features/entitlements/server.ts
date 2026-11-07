import "server-only";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { currentEntitlement, subscription } from "@/server/db/schema";
import {
  ENTITLEMENT_COOKIE,
  keyringFromEnv,
  signEntitlement,
  verifyEntitlement,
} from "@/server/edge/entitlement";
import { HttpError } from "@/server/http";
import { clearEntitlementCookies, entitlementCookies } from "./cookies";
import { decideRefresh, type StoredEntitlement } from "./refresh";

// The database side of `POST /api/entitlements/refresh` (plan §9.2): one read of the `current_entitlement` view
// (plus the live subscription's status for the on-hold banner), then a freshly signed `oa_ent`.

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  const pair = header.split(/;\s*/).find((c) => c.startsWith(`${name}=`));
  return pair?.slice(name.length + 1);
}

export async function loadEntitlement(db: Db, userId: string): Promise<StoredEntitlement & { hold: boolean } | null> {
  const [row] = await db
    .select({ tier: currentEntitlement.tier, validUntil: currentEntitlement.validUntil, version: currentEntitlement.version })
    .from(currentEntitlement)
    .where(eq(currentEntitlement.userId, userId))
    .limit(1);
  const [held] = await db
    .select({ id: subscription.id })
    .from(subscription)
    .where(and(eq(subscription.userId, userId), eq(subscription.status, "on_hold")))
    .limit(1);
  return row ? { ...row, hold: Boolean(held) } : null;
}

export interface RefreshInput {
  request: Request;
  db: Db;
  user: { id: string; role: "user" | "admin" } | null;
  env: { ENTITLEMENT_SECRET?: string; ENTITLEMENT_SECRET_PREVIOUS?: string };
  secure: boolean;
  now?: Date;
}

export type RefreshResult =
  | { ok: true; body: { tier: "free" | "pro"; exp: number; v: number; hold: boolean; stale: boolean }; setCookies: string[] }
  | { ok: false; error: HttpError; setCookies: string[] };

/**
 * The JSON body and Set-Cookie headers of a refresh. Refusals (signed out, another user's cookie, a version
 * rollback) also clear both cookies, so the browser stops presenting them.
 */
export async function refreshEntitlementCookie(input: RefreshInput): Promise<RefreshResult> {
  const { request, db, user, env, secure, now = new Date() } = input;
  const keyring = keyringFromEnv(env.ENTITLEMENT_SECRET, env.ENTITLEMENT_SECRET_PREVIOUS);
  if (!keyring) throw new HttpError(503, "not_configured", "Entitlements are not configured");
  if (!user) {
    return {
      ok: false,
      error: new HttpError(401, "unauthenticated", "Sign in to continue"),
      setCookies: clearEntitlementCookies(secure),
    };
  }
  const presented = await verifyEntitlement(readCookie(request, ENTITLEMENT_COOKIE), keyring, now);
  const stored = await loadEntitlement(db, user.id);
  const decision = decideRefresh({ userId: user.id, role: user.role, entitlement: stored, presented, now });
  if (!decision.ok) {
    return {
      ok: false,
      error: new HttpError(409, decision.reason, "This entitlement can't be renewed; refresh again"),
      setCookies: clearEntitlementCookies(secure),
    };
  }
  const token = await signEntitlement(decision.claims, keyring.current, now);
  const nowSec = Math.floor(now.getTime() / 1000);
  const hint = { exp: decision.claims.exp, tier: decision.claims.tier, hold: Boolean(stored?.hold) };
  return {
    ok: true,
    body: { tier: decision.claims.tier, exp: decision.claims.exp, v: decision.claims.v, hold: hint.hold, stale: decision.stale },
    setCookies: entitlementCookies({ token, hint, nowSec, secure }),
  };
}
