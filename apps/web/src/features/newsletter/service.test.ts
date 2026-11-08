import { describe, expect, it } from "vitest";
import type { EmailJob } from "../email/jobs";
import type { EmailMessage, EmailSender } from "../email/sender";
import { MemoryRateLimiter } from "./rate-limit";
import {
  accountStatus,
  confirmSubscription,
  subscribe,
  subscribeWithAccount,
  unsubscribeAccount,
  unsubscribeWithToken,
  type NewsletterDeps,
} from "./service";
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

  it("records the consent version from the sign-up in consent history on confirm", async () => {
    const { d, sender, store } = deps();
    await subscribe(d, input("v@example.com"));
    await confirmSubscription(d, tokenIn(sender.sent[0], "confirm"));
    const sub = (await store.findByEmail("v@example.com"))!;
    expect(await store.consentHistory(sub.id)).toMatchObject([{ event: "opt-in", textVersion: "2026-11-07" }]);
  });

  it("a confirm token with an unknown consent version is invalid", async () => {
    const { d, store } = deps();
    const { subscriber } = await store.upsertPending({ email: "x@example.com", source: "archive" });
    const token = await signToken(SECRET, {
      subscriberId: subscriber.id,
      purpose: "confirm",
      consentVersion: "1999-01-01",
    });
    expect(await confirmSubscription(d, token)).toEqual({ kind: "invalid" });
  });
});

describe("with the email queue binding", () => {
  it("queues the confirmation and the welcome as jobs instead of sending inline", async () => {
    const { d, sender } = deps();
    const jobs: EmailJob[] = [];
    d.queue = { send: async (job) => void jobs.push(job) };
    await subscribe(d, input("q@example.com"));
    expect(sender.sent).toEqual([]);
    expect(jobs).toMatchObject([{ v: 1, kind: "newsletter.confirm", to: "q@example.com" }]);
    const confirm = jobs[0] as Extract<EmailJob, { kind: "newsletter.confirm" }>;
    const token = /token=([A-Za-z0-9._-]+)/.exec(confirm.data.confirmUrl)![1];

    expect(await confirmSubscription(d, token)).toEqual({ kind: "active" });
    expect(sender.sent).toEqual([]);
    expect(jobs[1]).toMatchObject({ kind: "newsletter.welcome", to: "q@example.com" });
    // One welcome per activation: the key names the subscriber and the confirmation time.
    expect(jobs[1].idempotencyKey).toMatch(/^newsletter\.welcome:[^:]+:\d+$/);
    expect(jobs[0].idempotencyKey).toMatch(/^newsletter\.confirm:/);
  });
});

describe("Turnstile in the sign-up flow", () => {
  it("checks the token before anything is stored; the honeypot still answers like a success", async () => {
    const { d, sender, store } = deps();
    const seen: (string | undefined)[] = [];
    d.captcha = {
      verify: async (token) => {
        seen.push(token);
        return token === "good" ? { ok: true } : { ok: false, reason: token ? "rejected" : "missing" };
      },
    };
    expect(await subscribe(d, input("a@example.com"))).toEqual({ kind: "captcha-failed", reason: "missing" });
    expect(await subscribe(d, input("a@example.com", { turnstileToken: "bad", ip: "203.0.113.7" }))).toEqual({
      kind: "captcha-failed",
      reason: "rejected",
    });
    expect(await store.findByEmail("a@example.com")).toBeNull();
    expect(await subscribe(d, input("a@example.com", { turnstileToken: "good", ip: "203.0.113.8" }))).toEqual({
      kind: "accepted",
    });
    expect(sender.sent).toHaveLength(1);
    expect(seen).toEqual([undefined, "bad", "good"]);
  });
});

describe("signed-in users", () => {
  const user = { id: "0190f0f0-0000-7000-8000-000000000009", email: "Member@Example.com" };

  it("subscribe with one click: active at once, welcome email only, idempotent", async () => {
    const { d, sender, store } = deps();
    expect(await accountStatus(store, user)).toEqual({ status: "none", email: "member@example.com" });
    expect(await subscribeWithAccount(d, user, { source: "account" })).toEqual({
      status: "active",
      email: "member@example.com",
    });
    expect(sender.sent.map((m) => m.template)).toEqual(["welcome"]);
    expect(sender.sent[0].headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    await subscribeWithAccount(d, user, { source: "account" });
    expect(sender.sent).toHaveLength(1);
    expect(await unsubscribeAccount(store, user)).toEqual({ status: "unsubscribed", email: "member@example.com" });
    expect(await accountStatus(store, user)).toMatchObject({ status: "unsubscribed" });
  });

  it("suppressed addresses stay suppressed and get no email", async () => {
    const { d, sender, store } = deps();
    await store.suppress(user.email, "bounced");
    expect(await subscribeWithAccount(d, user, { source: "account" })).toMatchObject({ status: "suppressed" });
    expect(sender.sent).toEqual([]);
  });

  it("unsubscribing with no subscription is a no-op", async () => {
    const { store } = deps();
    expect(await unsubscribeAccount(store, user)).toEqual({ status: "none", email: "member@example.com" });
  });
});

describe("email-bombing protection (security review H2)", () => {
  it("a burst of sign-ups for one address from many IPs sends one confirmation email", async () => {
    const { d, sender } = deps();
    d.limiter = new MemoryRateLimiter({ requests: 100, windowSeconds: 60 });
    for (let i = 0; i < 20; i++) {
      expect(await subscribe(d, input("victim@example.com", { ip: `198.51.100.${i}` }))).toEqual({ kind: "accepted" });
    }
    expect(sender.sent.filter((m) => m.to === "victim@example.com")).toHaveLength(1);
  });

  it("the per-address limit answers as usual but sends nothing, even before the store is asked", async () => {
    const { d, sender, store } = deps();
    const seen: string[] = [];
    d.limiter = {
      hit: async (scope, key) => (seen.push(`${scope}:${key}`), { allowed: scope === "ip", retryAfterSeconds: 0 }),
    };
    expect(await subscribe(d, input("victim@example.com", { ip: "198.51.100.9" }))).toEqual({ kind: "accepted" });
    expect(sender.sent).toHaveLength(0);
    expect(await store.findByEmail("victim@example.com")).toBeNull();
    // The address is only ever a hash in limiter keys.
    expect(seen[0]).toBe("ip:198.51.100.9");
    expect(seen[1]).toMatch(/^email:[0-9a-f]{24}$/);
  });

  it("suppressed (bounced) addresses get no email", async () => {
    const { d, sender, store } = deps();
    await store.suppress("gone@example.com", "bounced");
    expect(await subscribe(d, input("gone@example.com"))).toEqual({ kind: "accepted" });
    expect(sender.sent).toHaveLength(0);
  });
});
