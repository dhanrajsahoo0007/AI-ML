import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { auditLog, consentLog, customer, subscription } from "@/server/db/schema";
import { HttpError } from "@/server/http";
import { CHECKOUT_CONSENTS, CHECKOUT_CONSENT_KEYS } from "./consent";
import type { Plan, ProviderId } from "./events";
import type { PaymentProvider } from "./port";

// Starting a checkout (plan §9.3): the consents are logged first, then the provider's hosted checkout is created
// with our user ID in its metadata (set here from the session, never from the request). Returns its URL.

export interface StartCheckoutInput {
  user: { id: string; email: string; name: string };
  plan: Plan;
  /** The text versions the buyer saw and ticked. */
  consents: Record<string, string>;
  country: string | null;
  locale?: string;
  returnUrl: string;
}

export async function startCheckout(db: Db, provider: PaymentProvider, input: StartCheckoutInput) {
  for (const key of CHECKOUT_CONSENT_KEYS) {
    if (input.consents[key] !== CHECKOUT_CONSENTS[key].version) {
      throw new HttpError(409, "consent_outdated", "The checkout terms changed; reload the page and agree again");
    }
  }
  const [live] = await db
    .select({ id: subscription.id })
    .from(subscription)
    .where(and(eq(subscription.userId, input.user.id), inArray(subscription.status, ["active", "on_hold"])))
    .limit(1);
  if (live) throw new HttpError(409, "already_subscribed", "You already have Pro; manage it from Account → Billing");

  await db.insert(consentLog).values(
    CHECKOUT_CONSENT_KEYS.map((key) => ({
      userId: input.user.id,
      kind: CHECKOUT_CONSENTS[key].kind,
      textVersion: CHECKOUT_CONSENTS[key].version,
      country: input.country,
    }))
  );

  const [existing] = await db
    .select({ id: customer.providerCustomerId })
    .from(customer)
    .where(and(eq(customer.userId, input.user.id), eq(customer.provider, provider.id)))
    .limit(1);

  const session = await provider.createCheckout({
    userId: input.user.id,
    email: input.user.email,
    name: input.user.name,
    plan: input.plan,
    country: input.country,
    locale: input.locale,
    customerId: existing?.id,
    returnUrl: input.returnUrl,
  });
  await db.insert(auditLog).values({
    actor: input.user.id,
    action: "billing.checkout_started",
    target: `user:${input.user.id}`,
    meta: { provider: provider.id, plan: input.plan, country: input.country, session: session.sessionId },
  });
  return { url: session.url };
}

/** The provider customer to open the portal for: the provider of the user's latest subscription. */
export async function portalCustomer(
  db: Db,
  userId: string
): Promise<{ provider: ProviderId; customerId: string } | null> {
  const rows = await db
    .select({ provider: customer.provider, customerId: customer.providerCustomerId })
    .from(customer)
    .leftJoin(subscription, and(eq(subscription.userId, customer.userId), eq(subscription.provider, customer.provider)))
    .where(eq(customer.userId, userId))
    .orderBy(desc(subscription.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}

/** A two-letter country from Cloudflare's header, or null (`XX` unknown, `T1` Tor). */
export function requestCountry(headers: Headers): string | null {
  const c = headers.get("cf-ipcountry")?.toUpperCase();
  return c && /^[A-Z]{2}$/.test(c) && c !== "XX" && c !== "T1" ? c : null;
}
