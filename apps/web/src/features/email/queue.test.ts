import { describe, expect, it } from "vitest";
import type { EmailJob, EmailJobInput } from "./jobs";
import { enqueueEmail, type EmailQueueProducer } from "./queue";
import type { EmailMessage, EmailSender } from "./sender";

class FakeQueue implements EmailQueueProducer {
  sent: { body: EmailJob; options?: { contentType?: "json" } }[] = [];
  async send(body: EmailJob, options?: { contentType?: "json" }) {
    this.sent.push({ body, options });
  }
}

class CapturingSender implements EmailSender {
  sent: EmailMessage[] = [];
  async send(message: EmailMessage) {
    this.sent.push(message);
    return { id: `m${this.sent.length}` };
  }
}

const input: EmailJobInput = {
  kind: "newsletter.confirm",
  to: "ada@example.com",
  data: {
    confirmUrl: "https://site.example/n/confirm?token=a.b",
    unsubscribeUrl: "https://site.example/n/unsubscribe?token=c.d",
  },
};

describe("enqueueEmail", () => {
  it("puts a validated, versioned job on the queue and never builds the inline sender", async () => {
    const queue = new FakeQueue();
    const result = await enqueueEmail(
      { ...input, idempotencyKey: "newsletter.confirm:k1" },
      {
        queue,
        sender: () => {
          throw new Error("the inline sender must not be built when a queue exists");
        },
      }
    );
    expect(result).toEqual({ via: "queue", idempotencyKey: "newsletter.confirm:k1" });
    expect(queue.sent).toEqual([
      { body: { v: 1, ...input, idempotencyKey: "newsletter.confirm:k1" }, options: { contentType: "json" } },
    ]);
  });

  it("without a queue binding, renders and sends inline with the job's idempotency key", async () => {
    const sender = new CapturingSender();
    for (const queue of [undefined, null]) {
      const result = await enqueueEmail({ ...input, idempotencyKey: "newsletter.confirm:k2" }, { queue, sender });
      expect(result.via).toBe("inline");
    }
    expect(sender.sent).toHaveLength(2);
    expect(sender.sent[0]).toMatchObject({
      to: "ada@example.com",
      template: "confirm-subscription",
      idempotencyKey: "newsletter.confirm:k2",
    });
    expect(sender.sent[0].text).toContain("https://site.example/n/confirm?token=a.b");
  });

  it("accepts the sender as a lazy factory for the inline path", async () => {
    const sender = new CapturingSender();
    let built = 0;
    await enqueueEmail(input, { sender: () => (built++, sender) });
    expect(built).toBe(1);
    expect(sender.sent).toHaveLength(1);
  });

  it("fixes a random idempotency key per job when the caller gives none", async () => {
    const queue = new FakeQueue();
    const a = await enqueueEmail(input, { queue, sender: new CapturingSender() });
    const b = await enqueueEmail(input, { queue, sender: new CapturingSender() });
    expect(a.idempotencyKey).toMatch(/^newsletter\.confirm:[0-9a-f-]{36}$/);
    expect(a.idempotencyKey).not.toBe(b.idempotencyKey);
    expect(queue.sent.map((s) => s.body.idempotencyKey)).toEqual([a.idempotencyKey, b.idempotencyKey]);
  });

  it("refuses an invalid job at the call site, on both paths", async () => {
    const queue = new FakeQueue();
    const sender = new CapturingSender();
    const bad = { ...input, to: "nobody" } as EmailJobInput;
    await expect(enqueueEmail(bad, { queue, sender })).rejects.toThrow();
    await expect(enqueueEmail(bad, { sender })).rejects.toThrow();
    expect(queue.sent).toEqual([]);
    expect(sender.sent).toEqual([]);
  });

  it("lets a failed queue send or inline send reach the caller", async () => {
    const failingQueue: EmailQueueProducer = { send: async () => Promise.reject(new Error("queue down")) };
    await expect(enqueueEmail(input, { queue: failingQueue, sender: new CapturingSender() })).rejects.toThrow(
      "queue down"
    );
    const failingSender: EmailSender = { send: async () => Promise.reject(new Error("provider down")) };
    await expect(enqueueEmail(input, { sender: failingSender })).rejects.toThrow("provider down");
  });
});
