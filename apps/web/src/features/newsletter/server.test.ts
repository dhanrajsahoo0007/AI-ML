import { describe, expect, it } from "vitest";
import { DevEmailSender } from "../email/dev-sender";
import { ResendEmailSender } from "../email/resend-sender";
import { emailQueue, emailSender, NotConfiguredError, resendWebhookSecret, tokenSecret } from "./server";

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

describe("newsletter wiring", () => {
  it("uses NEWSLETTER_TOKEN_SECRET when set", () => {
    const secret = "s".repeat(40);
    expect(tokenSecret(env({ NEWSLETTER_TOKEN_SECRET: secret }), "production")).toBe(secret);
  });

  it("allows the dev secret only when APP_ENV=local", () => {
    expect(tokenSecret(env({}), "local").length).toBeGreaterThanOrEqual(32);
    for (const appEnv of ["preview", "staging", "production"] as const) {
      expect(() => tokenSecret(env({}), appEnv)).toThrow(NotConfiguredError);
    }
  });

  it("rejects a short secret", () => {
    expect(() => tokenSecret(env({ NEWSLETTER_TOKEN_SECRET: "short" }), "preview")).toThrow(/32 characters/);
  });

  it("picks Resend when the key exists, the dev sender otherwise, and never the dev sender in production", () => {
    expect(emailSender(env({ RESEND_API_KEY: "re_test" }), "production")).toBeInstanceOf(ResendEmailSender);
    expect(emailSender(env({}), "preview")).toBeInstanceOf(DevEmailSender);
    expect(() => emailSender(env({}), "production")).toThrow(NotConfiguredError);
  });

  it("has no email queue outside a Worker with the EMAIL_QUEUE binding, so emails are sent inline", () => {
    expect(emailQueue()).toBeNull();
  });

  it("needs a whsec_ RESEND_WEBHOOK_SECRET for the webhook", () => {
    expect(resendWebhookSecret(env({ RESEND_WEBHOOK_SECRET: "whsec_abc" }))).toBe("whsec_abc");
    expect(() => resendWebhookSecret(env({}))).toThrow(NotConfiguredError);
    expect(() => resendWebhookSecret(env({ RESEND_WEBHOOK_SECRET: "plain" }))).toThrow(/whsec_/);
  });
});

describe("newsletter store (security review H2)", () => {
  it("refuses the per-process memory store outside APP_ENV=local, where the cool-down must survive isolates", async () => {
    const { newsletterStore } = await import("./server");
    for (const appEnv of ["preview", "staging", "production"] as const) {
      expect(() => newsletterStore(undefined, appEnv)).toThrow(NotConfiguredError);
    }
    expect(newsletterStore(undefined, "local")).toBeDefined();
  });
});
