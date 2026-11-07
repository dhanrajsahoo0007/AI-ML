import { describe, expect, it } from "vitest";
import { DevEmailSender } from "../email/dev-sender";
import { ResendEmailSender } from "../email/resend-sender";
import { emailSender, NotConfiguredError, tokenSecret } from "./server";

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
});
