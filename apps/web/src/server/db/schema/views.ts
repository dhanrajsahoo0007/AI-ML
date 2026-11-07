import { sql } from "drizzle-orm";
import { pgView } from "drizzle-orm/pg-core";
import { entitlement } from "./billing";

// What the entitlement refresh endpoint (plan §9.2) reads: the stored tier, downgraded to `free` once
// `valid_until` has passed, so a missed `expired` webhook can't keep someone on Pro. The `readonly` role
// (sql/roles.sql) reads views like this one for the admin dashboard.
export const currentEntitlement = pgView("current_entitlement").as((qb) =>
  qb
    .select({
      userId: entitlement.userId,
      tier: sql<
        "free" | "pro"
      >`case when ${entitlement.tier} = 'pro' and (${entitlement.validUntil} is null or ${entitlement.validUntil} > now()) then 'pro'::tier else 'free'::tier end`.as(
        "tier"
      ),
      validUntil: entitlement.validUntil,
      version: entitlement.version,
    })
    .from(entitlement)
);
