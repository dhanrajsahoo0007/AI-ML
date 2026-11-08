import { describe, expect, it } from "vitest";
import { ResendEmailSender } from "./resend-sender";
import { EmailSendError, type EmailMessage } from "./sender";

const message: EmailMessage = {
  to: "ada@example.com",
  from: "Brand <news@news.example.com>",
  subject: "Hi",
  html: "<p>Hi</p>",
  text: "Hi",
  template: "welcome",
  idempotencyKey: "newsletter.welcome:sub_1:1",
};

const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  (async () => Response.json(body, { status, headers })) as unknown as typeof fetch;

async function failure(fetchImpl: typeof fetch): Promise<EmailSendError> {
  const error = await new ResendEmailSender("re_test", fetchImpl).send(message).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(EmailSendError);
  return error as EmailSendError;
}

describe("ResendEmailSender", () => {
  it("posts the message with the Idempotency-Key header and returns Resend's id", async () => {
    let seen: RequestInit | undefined;
    const fetchImpl = (async (_url: string, init: RequestInit) => ((seen = init), Response.json({ id: "re_1" }))) as unknown as typeof fetch;
    expect(await new ResendEmailSender("re_test", fetchImpl).send(message)).toEqual({ id: "re_1" });
    expect(seen?.headers).toMatchObject({ Authorization: "Bearer re_test", "Idempotency-Key": "newsletter.welcome:sub_1:1" });
    expect(JSON.parse(String(seen?.body))).toMatchObject({ to: ["ada@example.com"], tags: [{ name: "template", value: "welcome" }] });
  });

  it("sends no Idempotency-Key when the message has none", async () => {
    let seen: RequestInit | undefined;
    const fetchImpl = (async (_url: string, init: RequestInit) => ((seen = init), Response.json({ id: "re_1" }))) as unknown as typeof fetch;
    await new ResendEmailSender("re_test", fetchImpl).send({ ...message, idempotencyKey: undefined });
    expect(seen?.headers).not.toHaveProperty("Idempotency-Key");
  });

  // Regression: Workers throw "Illegal invocation" when fetch is called as a method of another object.
  it("calls fetch unbound", async () => {
    const fetchImpl = async function (this: unknown) {
      if (this !== undefined && this !== globalThis) throw new TypeError("Illegal invocation");
      return Response.json({ id: "re_1" });
    } as unknown as typeof fetch;
    expect(await new ResendEmailSender("re_test", fetchImpl).send(message)).toEqual({ id: "re_1" });
  });

  it("classifies 429 and 5xx as retryable, with Retry-After", async () => {
    const limited = await failure(respond(429, { name: "rate_limit_exceeded" }, { "retry-after": "2" }));
    expect(limited).toMatchObject({ retryable: true, status: 429, retryAfterSeconds: 2 });
    expect(await failure(respond(500, { name: "internal_server_error" }))).toMatchObject({ retryable: true, status: 500 });
    expect(await failure(respond(503, "not json"))).toMatchObject({ retryable: true, status: 503 });
  });

  it("classifies a network error and a concurrent idempotent request as retryable", async () => {
    const offline = (async () => Promise.reject(new TypeError("fetch failed"))) as unknown as typeof fetch;
    expect(await failure(offline)).toMatchObject({ retryable: true, status: undefined });
    expect(await failure(respond(409, { name: "concurrent_idempotent_requests" }))).toMatchObject({ retryable: true });
  });

  it("classifies other 4xx as permanent and keeps the provider's message (which can hold the address) out", async () => {
    const invalid = await failure(respond(422, { name: "validation_error", message: "Invalid `to` field: ada@example.com" }));
    expect(invalid).toMatchObject({ retryable: false, status: 422, message: "Resend responded 422 (validation_error)" });
    expect(await failure(respond(409, { name: "invalid_idempotent_request" }))).toMatchObject({ retryable: false });
    expect(await failure(respond(403, {}))).toMatchObject({ retryable: false, status: 403 });
  });
});
