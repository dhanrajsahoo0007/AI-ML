// The subscriber store port (plan §15.2 "Data"). Two implementations with one contract (store.contract.ts):
//   PostgresNewsletterStore  (store-postgres.ts) over `newsletter_subscriber` + `consent_log`, used whenever a
//                            database is configured
//   MemoryNewsletterStore    (below) for local runs without a database, and unit tests
//
// Status transitions (anything not listed leaves the subscriber unchanged):
//
//   (new)          ─upsertPending────►  pending
//   unsubscribed   ─upsertPending────►  pending            (a new sign-up is new consent)
//   pending        ─confirm──────────►  active             consent: opt-in, with the consent text version
//   (new)|pending|unsubscribed
//                  ─subscribeVerified►  active             signed-in one click (email verified by Google)
//   pending|active ─unsubscribe──────►  unsubscribed       consent: withdrawn
//   any            ─suppress─────────►  bounced | complained   (Resend webhooks; never mailed again)
//
// bounced and complained are final: nothing moves a subscriber out of them.

export type SubscriberStatus = "pending" | "active" | "unsubscribed" | "bounced" | "complained";
export type SuppressReason = "bounced" | "complained";

export interface Subscriber {
  id: string;
  /** Trimmed and lower-cased; unique. */
  email: string;
  status: SubscriberStatus;
  /** Where the sign-up came from, e.g. "archive", "issue", "account" or "suppression". */
  source: string | null;
  /** Set when a signed-in user subscribed (or linked the address) from their account. */
  userId: string | null;
  createdAt: Date;
  confirmedAt?: Date;
  unsubscribedAt?: Date;
}

export interface PendingInput {
  email: string;
  source: string;
  /** ISO 3166-1 alpha-2 from the edge (`cf-ipcountry`), when known. */
  country?: string | null;
}

export interface VerifiedInput {
  email: string;
  userId: string;
  source: string;
  /** Version of the consent text shown next to the button (consent.ts). */
  consentVersion: string;
  country?: string | null;
}

/** The subscriber after a transition, and whether its status changed. */
export interface Transition {
  subscriber: Subscriber;
  changed: boolean;
}

/** What the caller should do after upsertPending. */
export type UpsertOutcome = "send-confirmation" | "already-active" | "suppressed";

/** One consent_log entry for a subscriber: an opt-in with the text version, or a withdrawal. */
export interface ConsentEvent {
  event: "opt-in" | "withdrawn";
  /** The consent text version for an opt-in; WITHDRAWN_VERSION for a withdrawal. */
  textVersion: string;
  at: Date;
}

/**
 * consent_log has one newsletter kind (`newsletter_opt_in`); a withdrawal is stored under that kind with this
 * text version, so the latest row per subscriber tells the current consent state.
 */
export const WITHDRAWN_VERSION = "withdrawn";

export interface NewsletterStore {
  /** Creates or re-arms a pending subscriber. Never downgrades an active one or revives a suppressed one. */
  upsertPending(input: PendingInput): Promise<{ subscriber: Subscriber; outcome: UpsertOutcome }>;
  /**
   * pending → active, recording the opt-in with `consentVersion`. `changed` is false when it was not pending;
   * null for an unknown ID.
   */
  confirm(id: string, consent: { consentVersion: string }): Promise<Transition | null>;
  /**
   * Signed-in one-click subscribe: the address is verified, so it goes straight to active (recording the
   * opt-in) and is linked to the user. Suppressed addresses stay suppressed; an active one is only linked.
   */
  subscribeVerified(input: VerifiedInput): Promise<Transition>;
  /** pending | active → unsubscribed, recording the withdrawal. `changed` is false when it already was not
   * subscribed; null for an unknown ID. */
  unsubscribe(id: string): Promise<Transition | null>;
  /** Marks an address as never to be mailed again (bounce or complaint), creating it if needed. */
  suppress(email: string, reason: SuppressReason): Promise<Subscriber>;
  findByEmail(email: string): Promise<Subscriber | null>;
  /** The user's subscriber row: the one linked to `userId`, else the one with their account email. */
  findForUser(userId: string, email: string): Promise<Subscriber | null>;
  /** Consent history, oldest first. */
  consentHistory(subscriberId: string): Promise<ConsentEvent[]>;
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isSuppressed = (s: Pick<Subscriber, "status">) => s.status === "bounced" || s.status === "complained";

/** In-memory store for local runs, previews without a database, and tests. State lives as long as the process. */
export class MemoryNewsletterStore implements NewsletterStore {
  private readonly byId = new Map<string, Subscriber>();
  private readonly idByEmail = new Map<string, string>();
  private readonly consents = new Map<string, ConsentEvent[]>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  private byEmail(email: string) {
    const id = this.idByEmail.get(email);
    return id ? this.byId.get(id) : undefined;
  }

  private create(email: string, fields: Omit<Subscriber, "id" | "email" | "createdAt">): Subscriber {
    const subscriber: Subscriber = { id: crypto.randomUUID(), email, createdAt: this.now(), ...fields };
    this.byId.set(subscriber.id, subscriber);
    this.idByEmail.set(email, subscriber.id);
    return subscriber;
  }

  private log(subscriberId: string, event: ConsentEvent["event"], textVersion: string) {
    const list = this.consents.get(subscriberId) ?? [];
    list.push({ event, textVersion, at: this.now() });
    this.consents.set(subscriberId, list);
  }

  async upsertPending(input: PendingInput) {
    const email = normalizeEmail(input.email);
    const existing = this.byEmail(email);
    if (!existing) {
      const subscriber = this.create(email, { status: "pending", source: input.source, userId: null });
      return { subscriber: { ...subscriber }, outcome: "send-confirmation" as const };
    }
    if (isSuppressed(existing)) return { subscriber: { ...existing }, outcome: "suppressed" as const };
    if (existing.status === "active") return { subscriber: { ...existing }, outcome: "already-active" as const };
    existing.status = "pending";
    existing.source = input.source;
    existing.unsubscribedAt = undefined;
    return { subscriber: { ...existing }, outcome: "send-confirmation" as const };
  }

  async confirm(id: string, consent: { consentVersion: string }) {
    const s = this.byId.get(id);
    if (!s) return null;
    const changed = s.status === "pending";
    if (changed) {
      s.status = "active";
      s.confirmedAt = this.now();
      this.log(s.id, "opt-in", consent.consentVersion);
    }
    return { subscriber: { ...s }, changed };
  }

  async subscribeVerified(input: VerifiedInput) {
    const email = normalizeEmail(input.email);
    const existing = this.byEmail(email);
    if (!existing) {
      const s = this.create(email, {
        status: "active",
        source: input.source,
        userId: input.userId,
        confirmedAt: this.now(),
      });
      this.log(s.id, "opt-in", input.consentVersion);
      return { subscriber: { ...s }, changed: true };
    }
    if (isSuppressed(existing)) return { subscriber: { ...existing }, changed: false };
    existing.userId = input.userId;
    if (existing.status === "active") return { subscriber: { ...existing }, changed: false };
    existing.status = "active";
    existing.source = input.source;
    existing.confirmedAt = this.now();
    existing.unsubscribedAt = undefined;
    this.log(existing.id, "opt-in", input.consentVersion);
    return { subscriber: { ...existing }, changed: true };
  }

  async unsubscribe(id: string) {
    const s = this.byId.get(id);
    if (!s) return null;
    const changed = s.status === "pending" || s.status === "active";
    if (changed) {
      s.status = "unsubscribed";
      s.unsubscribedAt = this.now();
      this.log(s.id, "withdrawn", WITHDRAWN_VERSION);
    }
    return { subscriber: { ...s }, changed };
  }

  async suppress(email: string, reason: SuppressReason) {
    const normalized = normalizeEmail(email);
    const existing = this.byEmail(normalized);
    if (!existing) return { ...this.create(normalized, { status: reason, source: "suppression", userId: null }) };
    existing.status = reason;
    return { ...existing };
  }

  async findByEmail(email: string) {
    const s = this.byEmail(normalizeEmail(email));
    return s ? { ...s } : null;
  }

  async findForUser(userId: string, email: string) {
    for (const s of this.byId.values()) if (s.userId === userId) return { ...s };
    return this.findByEmail(email);
  }

  async consentHistory(subscriberId: string) {
    return (this.consents.get(subscriberId) ?? []).map((c) => ({ ...c }));
  }
}
