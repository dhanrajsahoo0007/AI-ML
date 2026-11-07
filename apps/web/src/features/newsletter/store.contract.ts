import { describe, expect, it } from "vitest";
import { WITHDRAWN_VERSION, type NewsletterStore } from "./store";

// The NewsletterStore contract, run against every implementation: store.test.ts (memory) and
// store-postgres.test.ts (Docker Postgres). `makeStore` returns a store over empty state.

const input = (email: string) => ({ email, source: "archive" });
const V = { consentVersion: "2026-11-07" };
const USER_ID = "0190f0f0-0000-7000-8000-000000000001";

export function describeStoreContract(name: string, makeStore: () => Promise<NewsletterStore> | NewsletterStore) {
  describe(`${name}: NewsletterStore contract`, () => {
    it("new address → pending, normalised", async () => {
      const store = await makeStore();
      const { subscriber, outcome } = await store.upsertPending(input("  Ada@Example.COM "));
      expect(outcome).toBe("send-confirmation");
      expect(subscriber).toMatchObject({ email: "ada@example.com", status: "pending", source: "archive", userId: null });
      expect(await store.findByEmail("ADA@example.com")).toMatchObject({ id: subscriber.id });
    });

    it("pending → active on confirm, once, recording the opt-in version", async () => {
      const store = await makeStore();
      const { subscriber } = await store.upsertPending(input("a@example.com"));
      const first = await store.confirm(subscriber.id, V);
      expect(first?.changed).toBe(true);
      expect(first?.subscriber.status).toBe("active");
      expect(first?.subscriber.confirmedAt).toBeInstanceOf(Date);
      expect((await store.confirm(subscriber.id, V))?.changed).toBe(false);
      expect(await store.consentHistory(subscriber.id)).toMatchObject([{ event: "opt-in", textVersion: "2026-11-07" }]);
    });

    it("signing up again while active changes nothing and sends nothing", async () => {
      const store = await makeStore();
      const { subscriber } = await store.upsertPending(input("a@example.com"));
      await store.confirm(subscriber.id, V);
      const again = await store.upsertPending(input("A@example.com"));
      expect(again.outcome).toBe("already-active");
      expect(again.subscriber.status).toBe("active");
      expect(again.subscriber.id).toBe(subscriber.id);
    });

    it("active → unsubscribed (withdrawal recorded); an old confirm link can't re-activate", async () => {
      const store = await makeStore();
      const { subscriber } = await store.upsertPending(input("a@example.com"));
      await store.confirm(subscriber.id, V);
      const off = await store.unsubscribe(subscriber.id);
      expect(off).toMatchObject({ changed: true, subscriber: { status: "unsubscribed" } });
      expect(off?.subscriber.unsubscribedAt).toBeInstanceOf(Date);
      expect((await store.unsubscribe(subscriber.id))?.changed).toBe(false);
      const confirm = await store.confirm(subscriber.id, V);
      expect(confirm).toMatchObject({ changed: false, subscriber: { status: "unsubscribed" } });
      expect((await store.consentHistory(subscriber.id)).map((c) => [c.event, c.textVersion])).toEqual([
        ["opt-in", "2026-11-07"],
        ["withdrawn", WITHDRAWN_VERSION],
      ]);
    });

    it("unsubscribed → pending on a new sign-up (new consent)", async () => {
      const store = await makeStore();
      const { subscriber } = await store.upsertPending(input("a@example.com"));
      await store.unsubscribe(subscriber.id);
      const again = await store.upsertPending({ email: "a@example.com", source: "issue" });
      expect(again.outcome).toBe("send-confirmation");
      expect(again.subscriber).toMatchObject({ id: subscriber.id, status: "pending", source: "issue" });
      expect(again.subscriber.unsubscribedAt).toBeUndefined();
    });

    it("suppressed addresses are never revived", async () => {
      const store = await makeStore();
      const { subscriber } = await store.upsertPending(input("a@example.com"));
      await store.confirm(subscriber.id, V);
      expect((await store.suppress("A@example.com", "complained")).status).toBe("complained");
      expect((await store.upsertPending(input("a@example.com"))).outcome).toBe("suppressed");
      expect((await store.confirm(subscriber.id, V))?.subscriber.status).toBe("complained");
      expect((await store.unsubscribe(subscriber.id))?.changed).toBe(false);
      const verified = await store.subscribeVerified({ email: "a@example.com", userId: USER_ID, source: "account", ...V });
      expect(verified).toMatchObject({ changed: false, subscriber: { status: "complained" } });
      // An address that bounces before it ever signs up is suppressed too.
      expect((await store.suppress("new@example.com", "bounced")).status).toBe("bounced");
      expect((await store.upsertPending(input("new@example.com"))).outcome).toBe("suppressed");
      // bounced → complained is still suppressed; the latest reason wins.
      expect((await store.suppress("new@example.com", "complained")).status).toBe("complained");
    });

    it("signed-in one click: new address → active and linked, with the opt-in recorded", async () => {
      const store = await makeStore();
      const result = await store.subscribeVerified({
        email: "Member@Example.com",
        userId: USER_ID,
        source: "account",
        ...V,
      });
      expect(result).toMatchObject({
        changed: true,
        subscriber: { email: "member@example.com", status: "active", userId: USER_ID, source: "account" },
      });
      expect(result.subscriber.confirmedAt).toBeInstanceOf(Date);
      expect(await store.consentHistory(result.subscriber.id)).toMatchObject([{ event: "opt-in" }]);
      expect((await store.findForUser(USER_ID, "other@example.com"))?.id).toBe(result.subscriber.id);
      const again = await store.subscribeVerified({ email: "member@example.com", userId: USER_ID, source: "account", ...V });
      expect(again.changed).toBe(false);
      expect(await store.consentHistory(result.subscriber.id)).toHaveLength(1);
    });

    it("signed-in one click: pending or unsubscribed → active; an active anonymous row is only linked", async () => {
      const store = await makeStore();
      const pending = (await store.upsertPending(input("p@example.com"))).subscriber;
      const fromPending = await store.subscribeVerified({ email: "p@example.com", userId: USER_ID, source: "account", ...V });
      expect(fromPending).toMatchObject({ changed: true, subscriber: { id: pending.id, status: "active", userId: USER_ID } });

      const other = "0190f0f0-0000-7000-8000-000000000002";
      const anon = (await store.upsertPending(input("q@example.com"))).subscriber;
      await store.confirm(anon.id, V);
      const linked = await store.subscribeVerified({ email: "q@example.com", userId: other, source: "account", ...V });
      expect(linked).toMatchObject({ changed: false, subscriber: { status: "active", userId: other, source: "archive" } });
      expect(await store.consentHistory(anon.id)).toHaveLength(1);

      await store.unsubscribe(anon.id);
      const back = await store.subscribeVerified({ email: "q@example.com", userId: other, source: "account", ...V });
      expect(back).toMatchObject({ changed: true, subscriber: { status: "active" } });
      expect(back.subscriber.unsubscribedAt).toBeUndefined();
    });

    it("findForUser falls back to the account email when no row is linked", async () => {
      const store = await makeStore();
      const { subscriber } = await store.upsertPending(input("me@example.com"));
      expect((await store.findForUser(USER_ID, "Me@Example.com"))?.id).toBe(subscriber.id);
      expect(await store.findForUser(USER_ID, "nobody@example.com")).toBeNull();
    });

    it("unknown IDs return null", async () => {
      const store = await makeStore();
      expect(await store.confirm("nope", V)).toBeNull();
      expect(await store.unsubscribe("nope")).toBeNull();
      expect(await store.confirm("0190f0f0-0000-7000-8000-00000000dead", V)).toBeNull();
      expect(await store.consentHistory("nope")).toEqual([]);
      expect(await store.findByEmail("nobody@example.com")).toBeNull();
    });

    it("concurrent sign-ups for one address make one row", async () => {
      const store = await makeStore();
      const results = await Promise.all(
        Array.from({ length: 5 }, () => store.upsertPending(input("race@example.com")))
      );
      expect(new Set(results.map((r) => r.subscriber.id)).size).toBe(1);
    });
  });
}
