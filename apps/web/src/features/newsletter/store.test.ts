import { describe, expect, it } from "vitest";
import { MemoryNewsletterStore } from "./store";

const input = (email: string) => ({ email, source: "archive", consentVersion: "2026-11-07" });

describe("MemoryNewsletterStore transitions", () => {
  it("new address → pending, normalised", async () => {
    const store = new MemoryNewsletterStore();
    const { subscriber, outcome } = await store.upsertPending(input("  Ada@Example.COM "));
    expect(outcome).toBe("send-confirmation");
    expect(subscriber).toMatchObject({ email: "ada@example.com", status: "pending", consentVersion: "2026-11-07" });
  });

  it("pending → active on confirm, once", async () => {
    const store = new MemoryNewsletterStore();
    const { subscriber } = await store.upsertPending(input("a@example.com"));
    const first = await store.confirm(subscriber.id);
    expect(first?.changed).toBe(true);
    expect(first?.subscriber.status).toBe("active");
    expect(first?.subscriber.confirmedAt).toBeInstanceOf(Date);
    expect((await store.confirm(subscriber.id))?.changed).toBe(false);
  });

  it("signing up again while active changes nothing and sends nothing", async () => {
    const store = new MemoryNewsletterStore();
    const { subscriber } = await store.upsertPending(input("a@example.com"));
    await store.confirm(subscriber.id);
    const again = await store.upsertPending(input("A@example.com"));
    expect(again.outcome).toBe("already-active");
    expect(again.subscriber.status).toBe("active");
    expect(again.subscriber.id).toBe(subscriber.id);
  });

  it("active → unsubscribed; an old confirm link can't re-activate", async () => {
    const store = new MemoryNewsletterStore();
    const { subscriber } = await store.upsertPending(input("a@example.com"));
    await store.confirm(subscriber.id);
    const off = await store.unsubscribe(subscriber.id);
    expect(off).toMatchObject({ changed: true, subscriber: { status: "unsubscribed" } });
    expect((await store.unsubscribe(subscriber.id))?.changed).toBe(false);
    const confirm = await store.confirm(subscriber.id);
    expect(confirm).toMatchObject({ changed: false, subscriber: { status: "unsubscribed" } });
  });

  it("unsubscribed → pending on a new sign-up (new consent)", async () => {
    const store = new MemoryNewsletterStore();
    const { subscriber } = await store.upsertPending(input("a@example.com"));
    await store.unsubscribe(subscriber.id);
    const again = await store.upsertPending(input("a@example.com"));
    expect(again.outcome).toBe("send-confirmation");
    expect(again.subscriber).toMatchObject({ status: "pending", unsubscribedAt: undefined });
  });

  it("suppressed addresses are never revived", async () => {
    const store = new MemoryNewsletterStore();
    const { subscriber } = await store.upsertPending(input("a@example.com"));
    await store.confirm(subscriber.id);
    expect((await store.suppress("A@example.com", "complained")).status).toBe("complained");
    expect((await store.upsertPending(input("a@example.com"))).outcome).toBe("suppressed");
    expect((await store.confirm(subscriber.id))?.subscriber.status).toBe("complained");
    expect((await store.unsubscribe(subscriber.id))?.changed).toBe(false);
    // An address that bounces before it ever signs up is suppressed too.
    expect((await store.suppress("new@example.com", "bounced")).status).toBe("bounced");
    expect((await store.upsertPending(input("new@example.com"))).outcome).toBe("suppressed");
  });

  it("unknown IDs return null", async () => {
    const store = new MemoryNewsletterStore();
    expect(await store.confirm("nope")).toBeNull();
    expect(await store.unsubscribe("nope")).toBeNull();
  });
});
