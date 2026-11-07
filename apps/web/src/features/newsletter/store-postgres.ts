import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { consentLog, newsletterSubscriber } from "@/server/db/schema";
import {
  isSuppressed,
  nextConfirmation,
  normalizeEmail,
  WITHDRAWN_VERSION,
  type ConsentEvent,
  type NewsletterStore,
  type PendingInput,
  type Subscriber,
  type SuppressReason,
  type Transition,
  type VerifiedInput,
} from "./store";

// NewsletterStore over Postgres (plan §15.2 "Data"): `newsletter_subscriber` (unique lower-cased email) and
// `consent_log` (kind `newsletter_opt_in`). Every transition is one transaction with a row lock, so two
// concurrent requests for the same address can't both win, and a status change and its consent row are
// written together. Same contract as MemoryNewsletterStore (store.contract.ts runs against both).

/** A drizzle database or an open transaction (the webhook processor runs the store inside its own). */
type Queryable = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

type Row = typeof newsletterSubscriber.$inferSelect;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CONSENT_KIND = "newsletter_opt_in" as const;

/** The country columns are char(2): keep only clean ISO codes (Cloudflare sends XX and T1 for unknown/Tor). */
const cleanCountry = (c: string | null | undefined) =>
  c && /^[A-Z]{2}$/.test(c) && c !== "XX" && c !== "T1" ? c : null;

function toSubscriber(row: Row): Subscriber {
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    source: row.source,
    userId: row.userId,
    createdAt: row.createdAt,
    ...(row.confirmedAt ? { confirmedAt: row.confirmedAt } : {}),
    ...(row.unsubscribedAt ? { unsubscribedAt: row.unsubscribedAt } : {}),
  };
}

export class PostgresNewsletterStore implements NewsletterStore {
  constructor(
    private readonly db: Queryable,
    private readonly now: () => Date = () => new Date()
  ) {}

  private async lockByEmail(tx: Queryable, email: string): Promise<Row | undefined> {
    const [row] = await tx
      .select()
      .from(newsletterSubscriber)
      .where(eq(newsletterSubscriber.email, email))
      .for("update");
    return row;
  }

  private async lockById(tx: Queryable, id: string): Promise<Row | undefined> {
    const [row] = await tx.select().from(newsletterSubscriber).where(eq(newsletterSubscriber.id, id)).for("update");
    return row;
  }

  /** Inserts a row for a new address; returns null when the address already exists (then lock and update it). */
  private async insertIfNew(tx: Queryable, values: typeof newsletterSubscriber.$inferInsert): Promise<Row | null> {
    const [row] = await tx
      .insert(newsletterSubscriber)
      .values(values)
      .onConflictDoNothing({ target: newsletterSubscriber.email })
      .returning();
    return row ?? null;
  }

  private async logConsent(
    tx: Queryable,
    input: { subscriberId: string; userId: string | null; textVersion: string; country?: string | null }
  ) {
    await tx.insert(consentLog).values({
      subscriberId: input.subscriberId,
      userId: input.userId,
      kind: CONSENT_KIND,
      textVersion: input.textVersion,
      country: cleanCountry(input.country),
      at: this.now(),
    });
  }

  async upsertPending(input: PendingInput) {
    const email = normalizeEmail(input.email);
    return this.db.transaction(async (tx) => {
      const created = await this.insertIfNew(tx, {
        email,
        status: "pending",
        source: input.source,
        country: cleanCountry(input.country),
        createdAt: this.now(),
        confirmationSentAt: this.now(),
        confirmationCount: 1,
      });
      if (created) return { subscriber: toSubscriber(created), outcome: "send-confirmation" as const };

      const existing = (await this.lockByEmail(tx, email))!;
      if (isSuppressed(existing)) return { subscriber: toSubscriber(existing), outcome: "suppressed" as const };
      if (existing.status === "active")
        return { subscriber: toSubscriber(existing), outcome: "already-active" as const };
      const next = nextConfirmation(
        { sentAt: existing.confirmationSentAt, count: existing.confirmationCount },
        this.now()
      );
      if (!next) return { subscriber: toSubscriber(existing), outcome: "cooldown" as const };
      const [updated] = await tx
        .update(newsletterSubscriber)
        .set({
          status: "pending",
          source: input.source,
          unsubscribedAt: null,
          confirmationSentAt: next.sentAt,
          confirmationCount: next.count,
        })
        .where(eq(newsletterSubscriber.id, existing.id))
        .returning();
      return { subscriber: toSubscriber(updated!), outcome: "send-confirmation" as const };
    });
  }

  async confirm(id: string, consent: { consentVersion: string }): Promise<Transition | null> {
    if (!UUID.test(id)) return null;
    return this.db.transaction(async (tx) => {
      const row = await this.lockById(tx, id);
      if (!row) return null;
      if (row.status !== "pending") return { subscriber: toSubscriber(row), changed: false };
      const [updated] = await tx
        .update(newsletterSubscriber)
        .set({ status: "active", confirmedAt: this.now() })
        .where(eq(newsletterSubscriber.id, id))
        .returning();
      await this.logConsent(tx, {
        subscriberId: id,
        userId: row.userId,
        textVersion: consent.consentVersion,
        country: row.country,
      });
      return { subscriber: toSubscriber(updated!), changed: true };
    });
  }

  async subscribeVerified(input: VerifiedInput): Promise<Transition> {
    const email = normalizeEmail(input.email);
    return this.db.transaction(async (tx) => {
      const created = await this.insertIfNew(tx, {
        email,
        status: "active",
        source: input.source,
        userId: input.userId,
        country: cleanCountry(input.country),
        createdAt: this.now(),
        confirmedAt: this.now(),
      });
      if (created) {
        await this.logConsent(tx, {
          subscriberId: created.id,
          userId: input.userId,
          textVersion: input.consentVersion,
          country: input.country,
        });
        return { subscriber: toSubscriber(created), changed: true };
      }

      const existing = (await this.lockByEmail(tx, email))!;
      if (isSuppressed(existing)) return { subscriber: toSubscriber(existing), changed: false };
      if (existing.status === "active") {
        if (existing.userId === input.userId) return { subscriber: toSubscriber(existing), changed: false };
        const [linked] = await tx
          .update(newsletterSubscriber)
          .set({ userId: input.userId })
          .where(eq(newsletterSubscriber.id, existing.id))
          .returning();
        return { subscriber: toSubscriber(linked!), changed: false };
      }
      const [updated] = await tx
        .update(newsletterSubscriber)
        .set({
          status: "active",
          source: input.source,
          userId: input.userId,
          confirmedAt: this.now(),
          unsubscribedAt: null,
        })
        .where(eq(newsletterSubscriber.id, existing.id))
        .returning();
      await this.logConsent(tx, {
        subscriberId: existing.id,
        userId: input.userId,
        textVersion: input.consentVersion,
        country: input.country,
      });
      return { subscriber: toSubscriber(updated!), changed: true };
    });
  }

  async unsubscribe(id: string): Promise<Transition | null> {
    if (!UUID.test(id)) return null;
    return this.db.transaction(async (tx) => {
      const row = await this.lockById(tx, id);
      if (!row) return null;
      if (row.status !== "pending" && row.status !== "active") return { subscriber: toSubscriber(row), changed: false };
      const [updated] = await tx
        .update(newsletterSubscriber)
        .set({ status: "unsubscribed", unsubscribedAt: this.now() })
        .where(eq(newsletterSubscriber.id, id))
        .returning();
      await this.logConsent(tx, { subscriberId: id, userId: row.userId, textVersion: WITHDRAWN_VERSION });
      return { subscriber: toSubscriber(updated!), changed: true };
    });
  }

  async suppress(email: string, reason: SuppressReason): Promise<Subscriber> {
    const normalized = normalizeEmail(email);
    const [row] = await this.db
      .insert(newsletterSubscriber)
      .values({ email: normalized, status: reason, source: "suppression", createdAt: this.now() })
      .onConflictDoUpdate({ target: newsletterSubscriber.email, set: { status: reason } })
      .returning();
    return toSubscriber(row!);
  }

  async findByEmail(email: string): Promise<Subscriber | null> {
    const [row] = await this.db
      .select()
      .from(newsletterSubscriber)
      .where(eq(newsletterSubscriber.email, normalizeEmail(email)));
    return row ? toSubscriber(row) : null;
  }

  async findForUser(userId: string, email: string): Promise<Subscriber | null> {
    if (!UUID.test(userId)) return this.findByEmail(email);
    const [linked] = await this.db
      .select()
      .from(newsletterSubscriber)
      .where(eq(newsletterSubscriber.userId, userId))
      .orderBy(asc(newsletterSubscriber.createdAt))
      .limit(1);
    return linked ? toSubscriber(linked) : this.findByEmail(email);
  }

  async consentHistory(subscriberId: string): Promise<ConsentEvent[]> {
    if (!UUID.test(subscriberId)) return [];
    const rows = await this.db
      .select({ textVersion: consentLog.textVersion, at: consentLog.at })
      .from(consentLog)
      .where(and(eq(consentLog.subscriberId, subscriberId), eq(consentLog.kind, CONSENT_KIND)))
      .orderBy(asc(consentLog.at), asc(consentLog.id));
    return rows.map((r) => ({
      event: r.textVersion === WITHDRAWN_VERSION ? ("withdrawn" as const) : ("opt-in" as const),
      textVersion: r.textVersion,
      at: r.at,
    }));
  }
}

/** Subscribers by address, for the webhook processor (only the columns it needs). */
export async function subscribersByEmail(db: Queryable, emails: string[]) {
  if (emails.length === 0) return [];
  return db
    .select({ id: newsletterSubscriber.id, email: newsletterSubscriber.email, status: newsletterSubscriber.status })
    .from(newsletterSubscriber)
    .where(inArray(newsletterSubscriber.email, emails.map(normalizeEmail)));
}
