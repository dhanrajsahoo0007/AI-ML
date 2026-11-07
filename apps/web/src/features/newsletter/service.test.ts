import { describe, expect, it } from "vitest";
import type { EmailMessage, EmailSender } from "../email/sender";
import { MemoryRateLimiter } from "./rate-limit";
import { confirmSubscription, subscribe, unsubscribeWithToken, type NewsletterDeps } from "./service";
import { MemoryNewsletterStore } from "./store";
import { signToken } from "./token";

class CapturingSender implements EmailSender {
  sent: EmailMessage[] = [];
  async send(message: EmailMessage) {
    this.sent.push(message);
    return { id: String(this.sent.length) };
  }
}

const SECRET = "service-test-secret-service-test-secret";

function deps() {
  const sender = new CapturingSender();
  const store = new MemoryNewsletterStore();
  const d: NewsletterDeps = {
    store,
    sender,
    limiter: new MemoryRateLimiter({ requests: 2, windowSeconds: 3600 }),
    secret: SECRET,
    links: ({ confirm, unsubscribe }) => ({
      confirmUrl: `https://site.example/n/confirm?token=${confirm}`,
      unsubscribeUrl: `https://site.example/n/unsubscribe?token=${unsubscribe}`,
      oneClickUrl: `https://site.example/api/n/unsubscribe?token=${unsubscribe}`,
      archiveUrl: "https://site.example/n",
    }),
  };
  return { d, sender, store };
}

const input = (email: string, extra: Partial<Parameters<typeof subscribe>[1]> = {}) => ({
  email,
  source: "archive",
  consentVersion: "2026-11-07",
  website: "",
  ip: "203.0.113.1",
  ...extra,
});

const tokenIn = (m: EmailMessage, page: string) => new RegExp(`/n/${page}\\?token=([A-Za-z0-9._-]+)`).exec(m.text)![1];

describe("newsletter sign-up flow", () => {
  it("subscribe → double opt-in email → confirm → welcome with one-click headers → unsubscribe", async () => {
    const { d, sender } = deps();
    expect(await subscribe(d, input("Ada@Example.com"))).toEqual({ kind: "accepted" });
    expect(sender.sent).toHaveLength(1);
    const confirmMail = sender.sent[0];
    expect(confirmMail).toMatchObject({ to: "ada@example.com", template: "confirm-subscription" });
    expect(confirmMail.headers).toBeUndefined();

    expect(await confirmSubscription(d, tokenIn(confirmMail, "confirm"))).toEqual({ kind: "active" });
    expect(sender.sent).toHaveLength(2);
    const welcome = sender.sent[1];
    expect(welcome.template).toBe("welcome");
    expect(welcome.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    const oneClick = /<https:\/\/site\.example\/api\/n\/unsubscribe\?token=([^>]+)>/.exec(
      welcome.headers!["List-Unsubscribe"]
    )![1];

    // Confirming twice sends no second welcome.
    expect(await confirmSubscription(d, tokenIn(confirmMail, "confirm"))).toEqual({ kind: "active" });
    expect(sender.sent).toHaveLength(2);

    expect(await unsubscribeWithToken(d, oneClick)).toEqual({ kind: "unsubscribed" });
    expect(await unsubscribeWithToken(d, oneClick)).toEqual({ kind: "unsubscribed" });
    // An unsubscribed address can't be re-activated with the old confirm link.
    expect(await confirmSubscription(d, tokenIn(confirmMail, "confirm"))).toEqual({ kind: "not-pending" });
  });

  it("the honeypot answers like a success and sends nothing", async () => {
    const { d, sender } = deps();
    expect(await subscribe(d, input("bot@example.com", { website: "http://spam.example" }))).toEqual({
      kind: "accepted",
    });
    expect(sender.sent).toEqual([]);
  });

  it("already-active and suppressed addresses get the same answer and no email", async () => {
    const { d, sender, store } = deps();
    await subscribe(d, input("a@example.com"));
    await confirmSubscription(d, tokenIn(sender.sent[0], "confirm"));
    await store.suppress("s@example.com", "bounced");
    const before = sender.sent.length;
    expect(await subscribe(d, input("a@example.com", { ip: "203.0.113.2" }))).toEqual({ kind: "accepted" });
    expect(await subscribe(d, input("s@example.com", { ip: "203.0.113.2" }))).toEqual({ kind: "accepted" });
    expect(sender.sent.length).toBe(before);
  });

  it("rate-limits per IP", async () => {
    const { d } = deps();
    await subscribe(d, input("1@example.com"));
    await subscribe(d, input("2@example.com"));
    const third = await subscribe(d, input("3@example.com"));
    expect(third.kind).toBe("rate-limited");
    expect(await subscribe(d, input("4@example.com", { ip: "198.51.100.9" }))).toEqual({ kind: "accepted" });
  });

  it("rejects expired, forged and wrong-purpose tokens", async () => {
    const { d, sender } = deps();
    await subscribe(d, input("a@example.com"));
    const id = /"sid":"([^"]+)"/.exec(
      Buffer.from(tokenIn(sender.sent[0], "confirm").split(".")[0], "base64url").toString()
    )![1];
    const expired = await signToken(SECRET, { subscriberId: id, purpose: "confirm", now: 1_000_000 });
    expect(await confirmSubscription(d, expired)).toEqual({ kind: "expired" });
    const forged = await signToken("another-secret-another-secret-another", { subscriberId: id, purpose: "confirm" });
    expect(await confirmSubscription(d, forged)).toEqual({ kind: "invalid" });
    const unsub = tokenIn(sender.sent[0], "unsubscribe");
    expect(await confirmSubscription(d, unsub)).toEqual({ kind: "invalid" });
    expect(await unsubscribeWithToken(d, "garbage")).toEqual({ kind: "invalid" });
  });
});
