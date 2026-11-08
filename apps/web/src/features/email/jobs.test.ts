import { describe, expect, it } from "vitest";
import { buildEmail, emailJobSchema, type EmailJob } from "./jobs";

const confirm: EmailJob = {
  v: 1,
  kind: "newsletter.confirm",
  to: "ada@example.com",
  idempotencyKey: "newsletter.confirm:0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b",
  data: { confirmUrl: "https://site.example/n/confirm?token=a.b", unsubscribeUrl: "https://site.example/n/unsubscribe?token=c.d" },
};

const welcome: EmailJob = {
  v: 1,
  kind: "newsletter.welcome",
  to: "ada@example.com",
  idempotencyKey: "newsletter.welcome:sub_1:1762560000000",
  data: {
    archiveUrl: "https://site.example/n",
    unsubscribeUrl: "https://site.example/n/unsubscribe?token=c.d",
    oneClickUrl: "https://site.example/api/n/unsubscribe?token=c.d",
  },
};

const reminder: EmailJob = {
  v: 1,
  kind: "billing.renewal-reminder",
  to: "free@users.origins.test",
  idempotencyKey: "billing.renewal-reminder:sub_9:1763164800000",
  data: { name: "Ada", renewsOn: "November 15, 2026", price: "€90.00", manageUrl: "https://site.example/account/billing" },
};

describe("email job schema", () => {
  it("accepts every kind", () => {
    for (const job of [confirm, welcome, reminder]) expect(emailJobSchema.parse(job)).toEqual(job);
  });

  it("rejects an unknown kind, another version, or data of the wrong kind", () => {
    expect(emailJobSchema.safeParse({ ...confirm, kind: "newsletter.issue" }).success).toBe(false);
    expect(emailJobSchema.safeParse({ ...confirm, v: 2 }).success).toBe(false);
    expect(emailJobSchema.safeParse({ ...confirm, data: welcome.data }).success).toBe(false);
    expect(emailJobSchema.safeParse(null).success).toBe(false);
    expect(emailJobSchema.safeParse("not json").success).toBe(false);
  });

  it("rejects non-http links, a non-address recipient and an idempotency key that could carry an address", () => {
    const bad = (patch: Record<string, unknown>) => emailJobSchema.safeParse({ ...confirm, ...patch }).success;
    expect(bad({ data: { ...confirm.data, confirmUrl: "javascript:alert(1)" } })).toBe(false);
    expect(bad({ to: "not an address" })).toBe(false);
    expect(bad({ idempotencyKey: "" })).toBe(false);
    expect(bad({ idempotencyKey: "a@example.com" })).toBe(false);
    expect(bad({ idempotencyKey: "k".repeat(257) })).toBe(false);
  });
});

describe("buildEmail", () => {
  it("renders each kind with its template, the recipient and the idempotency key", async () => {
    const m = await buildEmail(confirm);
    expect(m).toMatchObject({ to: "ada@example.com", template: "confirm-subscription", idempotencyKey: confirm.idempotencyKey });
    expect(m.text).toContain("https://site.example/n/confirm?token=a.b");

    const w = await buildEmail(welcome);
    expect(w.template).toBe("welcome");
    expect(w.headers?.["List-Unsubscribe"]).toBe("<https://site.example/api/n/unsubscribe?token=c.d>");

    const r = await buildEmail(reminder);
    expect(r).toMatchObject({ template: "renewal-reminder", subject: expect.stringContaining("November 15, 2026") });
    expect(r.text).toMatch(/€90\.00/);
  });
});
