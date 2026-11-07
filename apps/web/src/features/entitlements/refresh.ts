import type { EntitlementClaims } from "@/server/edge/entitlement";
import { ENTITLEMENT_TTL_SEC } from "@/server/edge/entitlement";

// What `POST /api/entitlements/refresh` issues (plan §9.2, §11.3). Pure, so every rule is unit-tested:
//
// - the claims come from the database (`current_entitlement`) and the session, never from the presented cookie
// - a cookie for another user (`sub` ≠ session user) is refused: a copied cookie must not be laundered
// - a cookie whose `v` is newer than the database's is refused (a rollback or a forgery): never re-issue it
// - an older `v` (cancelled, refunded, dispute lost) is simply replaced by the current state: revoked access is
//   gone within one cookie lifetime (15 minutes)
// - a Pro cookie never outlives the entitlement: `exp` is capped at `valid_until`

export interface StoredEntitlement {
  tier: "free" | "pro";
  validUntil: Date | null;
  version: number;
}

export type RefreshDecision =
  | { ok: true; claims: Omit<EntitlementClaims, "iat">; stale: boolean }
  | { ok: false; reason: "user_mismatch" | "version_rollback" };

export function decideRefresh(input: {
  userId: string;
  role: "user" | "admin";
  /** The `current_entitlement` row (tier already downgraded once `valid_until` passed), or null: never had one. */
  entitlement: StoredEntitlement | null;
  /** The verified `oa_ent` the browser sent, if any. */
  presented: EntitlementClaims | null;
  now: Date;
}): RefreshDecision {
  const { userId, role, entitlement, presented, now } = input;
  const version = entitlement?.version ?? 0;
  if (presented && presented.sub !== userId) return { ok: false, reason: "user_mismatch" };
  if (presented && presented.v > version) return { ok: false, reason: "version_rollback" };

  const nowSec = Math.floor(now.getTime() / 1000);
  let exp = nowSec + ENTITLEMENT_TTL_SEC;
  let tier: "free" | "pro" = entitlement?.tier === "pro" ? "pro" : "free";
  if (tier === "pro" && entitlement?.validUntil) {
    const until = Math.floor(entitlement.validUntil.getTime() / 1000);
    if (until <= nowSec) tier = "free";
    else exp = Math.min(exp, until);
  }
  return {
    ok: true,
    claims: { sub: userId, tier, role, v: version, exp },
    stale: presented !== null && presented.v < version,
  };
}
