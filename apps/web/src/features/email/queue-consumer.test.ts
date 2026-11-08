import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EmailJob } from "./jobs";
import { handleEmailQueue, processEmailBatch, retryDelaySeconds, type EmailConsumerDeps } from "./queue-consumer";
import { EmailSendError, type EmailMessage, type EmailSender } from "./sender";
import { EmailNotConfiguredError } from "./senders";

// A fake batch with the Message API the consumer uses, recording what happened to each message.
class FakeMessage implements Message<unknown> {
  readonly timestamp = new Date();
  outcome: { kind: "ack" } | { kind: "retry"; delaySeconds?: number } | null = null;
  constructor(
    readonly id: string,
    readonly body: unknown,
    readonly attempts = 1
  ) {}
  ack() {
    this.outcome = { kind: "ack" };
  }
  retry(options?: QueueRetryOptions) {
    this.outcome = { kind: "retry", delaySeconds: options?.delaySeconds };
  }
}

function batchOf(...messages: FakeMessage[]): MessageBatch<unknown> {
  return {
    queue: "origins-ai-learn-email-test",
    messages,
    ackAll: () => messages.forEach((m) => m.ack()),
    retryAll: () => messages.forEach((m) => m.retry()),
  };
}

const job = (patch: Partial<EmailJob> = {}): EmailJob =>
  ({
    v: 1,
    kind: "newsletter.confirm",
    to: "ada@example.com",
    idempotencyKey: "newsletter.confirm:k1",
    data: {
      confirmUrl: "https://site.example/n/confirm?token=a.b",
      unsubscribeUrl: "https://site.example/n/unsubscribe?token=c.d",
    },
    ...patch,
  }) as EmailJob;

class FakeSender implements EmailSender {
  sent: EmailMessage[] = [];
  private calls = 0;
  constructor(private readonly fail: (call: number) => unknown = () => null) {}
  async send(message: EmailMessage) {
    const error = this.fail(++this.calls);
    if (error) throw error;
    this.sent.push(message);
    return { id: `re_${this.sent.length}` };
  }
}

function run(sender: EmailSender, ...messages: FakeMessage[]) {
  const lines: { level: string; msg: string; fields: Record<string, unknown> }[] = [];
  let built = 0;
  const deps: EmailConsumerDeps = {
    sender: () => (built++, sender),
    log: (level, msg, fields) => lines.push({ level, msg, fields }),
  };
  return processEmailBatch(batchOf(...messages), deps).then(() => ({ lines, built }));
}

describe("retryDelaySeconds", () => {
  it("backs off exponentially from 30 s, caps at an hour and respects a longer Retry-After", () => {
    expect([1, 2, 3, 4, 5].map((a) => retryDelaySeconds(a))).toEqual([30, 60, 120, 240, 480]);
    expect(retryDelaySeconds(20)).toBe(3600);
    expect(retryDelaySeconds(0)).toBe(30);
    expect(retryDelaySeconds(1, 90)).toBe(90);
    expect(retryDelaySeconds(3, 10)).toBe(120);
    expect(retryDelaySeconds(1, 10 ** 9)).toBe(12 * 60 * 60);
  });
});

describe("processEmailBatch", () => {
  it("renders, sends with the idempotency key and acks each message; builds the sender once", async () => {
    const sender = new FakeSender();
    const a = new FakeMessage("m1", job());
    const b = new FakeMessage("m2", job({ to: "bob@example.com", idempotencyKey: "newsletter.confirm:k2" }));
    const { lines, built } = await run(sender, a, b);
    expect([a.outcome, b.outcome]).toEqual([{ kind: "ack" }, { kind: "ack" }]);
    expect(built).toBe(1);
    expect(sender.sent.map((m) => [m.to, m.template, m.idempotencyKey])).toEqual([
      ["ada@example.com", "confirm-subscription", "newsletter.confirm:k1"],
      ["bob@example.com", "confirm-subscription", "newsletter.confirm:k2"],
    ]);
    expect(lines.map((l) => [l.level, l.msg, l.fields.to])).toEqual([
      ["info", "email_sent", "a***@example.com"],
      ["info", "email_sent", "b***@example.com"],
    ]);
  });

  it.each([
    ["a 5xx", new EmailSendError("Resend responded 503", { retryable: true, status: 503 })],
    ["a network error", new TypeError("fetch failed")],
    ["a missing RESEND_API_KEY", new EmailNotConfiguredError("RESEND_API_KEY is not set in production")],
  ])("retries %s with backoff by attempt", async (_label, error) => {
    const m = new FakeMessage("m1", job(), 3);
    const { lines } = await run(new FakeSender(() => error), m);
    expect(m.outcome).toEqual({ kind: "retry", delaySeconds: 120 });
    expect(lines[0]).toMatchObject({ level: "warn", msg: "email_send_retry", fields: { attempts: 3, delay_s: 120 } });
  });

  it("retries a 429 no sooner than the provider's Retry-After", async () => {
    const m = new FakeMessage("m1", job(), 1);
    await run(
      new FakeSender(
        () => new EmailSendError("Resend responded 429", { retryable: true, status: 429, retryAfterSeconds: 300 })
      ),
      m
    );
    expect(m.outcome).toEqual({ kind: "retry", delaySeconds: 300 });
  });

  it("acks a permanent provider error (4xx) without retrying, logging a masked recipient", async () => {
    const m = new FakeMessage("m1", job());
    const ok = new FakeMessage("m2", job({ to: "bob@example.com" }));
    const error = new EmailSendError("Resend responded 422 (validation_error) for ada@example.com", {
      retryable: false,
      status: 422,
    });
    const { lines } = await run(new FakeSender((n) => (n === 1 ? error : null)), m, ok);
    expect(m.outcome).toEqual({ kind: "ack" });
    expect(ok.outcome).toEqual({ kind: "ack" });
    const failed = lines.find((l) => l.msg === "email_send_failed")!;
    expect(failed).toMatchObject({
      level: "error",
      fields: { to: "a***@example.com", status: 422, kind: "newsletter.confirm" },
    });
    expect(JSON.stringify(lines)).not.toContain("ada@example.com");
  });

  it("acks and logs a message that is not a valid job, without its contents", async () => {
    const bad = new FakeMessage("m1", {
      v: 1,
      kind: "newsletter.confirm",
      to: "ada@example.com",
      data: { confirmUrl: "x" },
    });
    const junk = new FakeMessage("m2", "not a job");
    const sender = new FakeSender();
    const { lines } = await run(sender, bad, junk);
    expect([bad.outcome, junk.outcome]).toEqual([{ kind: "ack" }, { kind: "ack" }]);
    expect(sender.sent).toEqual([]);
    expect(lines.map((l) => [l.msg, l.fields.to])).toEqual([
      ["email_job_invalid", "a***@example.com"],
      ["email_job_invalid", undefined],
    ]);
    expect(lines[0].fields.issues).toEqual(expect.arrayContaining(["idempotencyKey: invalid_type"]));
    expect(JSON.stringify(lines)).not.toContain("ada@example.com");
  });
});

describe("handleEmailQueue (the Worker's queue() handler)", () => {
  afterEach(() => vi.unstubAllGlobals());

  const ctx: ExecutionContext = { waitUntil: () => {}, passThroughOnException: () => {} };

  it("sends through Resend with the Worker's RESEND_API_KEY and an Idempotency-Key, then acks", async () => {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, headers: init.headers as Record<string, string> });
      return Response.json({ id: "re_123" });
    });
    vi.spyOn(console, "info").mockImplementation(() => {});
    const m = new FakeMessage("m1", job());
    await handleEmailQueue(batchOf(m), { APP_ENV: "production", RESEND_API_KEY: "re_test" }, ctx);
    expect(m.outcome).toEqual({ kind: "ack" });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    expect(calls[0].headers).toMatchObject({
      Authorization: "Bearer re_test",
      "Idempotency-Key": "newsletter.confirm:k1",
    });
  });

  it("keeps the mail (retry) in production while RESEND_API_KEY is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const m = new FakeMessage("m1", job());
    await handleEmailQueue(batchOf(m), { APP_ENV: "production" }, ctx);
    expect(m.outcome).toEqual({ kind: "retry", delaySeconds: 30 });
    const line = JSON.parse(String(warn.mock.calls[0][0]));
    expect(line).toMatchObject({ level: "warn", msg: "email_send_retry", to: "a***@example.com" });
  });
});

// The Worker entry is bundled by wrangler outside Next's react-server build, where `server-only` throws on import.
describe("queue-consumer.ts import graph", () => {
  const SRC = path.resolve(__dirname, "../..");

  function resolve(from: string, spec: string): string | null {
    const base = spec.startsWith("@/")
      ? path.join(SRC, spec.slice(2))
      : spec.startsWith(".")
        ? path.resolve(path.dirname(from), spec)
        : null;
    if (!base) return null;
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
    return null;
  }

  it("never reaches a module that imports server-only", () => {
    const seen = new Set<string>();
    const offenders: string[] = [];
    const visit = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      const source = fs.readFileSync(file, "utf8");
      if (/^\s*import\s+["']server-only["']/m.test(source)) offenders.push(path.relative(SRC, file));
      for (const [, type, spec] of source.matchAll(
        /^\s*(?:import|export)\s+(type\s+)?(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/gm
      )) {
        if (type) continue;
        const next = resolve(file, spec);
        if (next) visit(next);
      }
    };
    visit(path.join(__dirname, "queue-consumer.ts"));
    expect(seen.size).toBeGreaterThan(5);
    expect(offenders).toEqual([]);
  });
});
