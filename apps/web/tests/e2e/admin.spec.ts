import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { Client } from "pg";
import { dbE2E, loginAs, SKIP_REASON, testUserEmail } from "../fixtures/users";

// @core /admin (plan §10.5, §11.1, §11.2): admins see the read-only dashboards; free users and anonymous
// visitors get a 404; a stale admin sign-in must be renewed; every view is written to audit_log.

const PAGES = [
  { path: "/admin", heading: "Business KPIs" },
  { path: "/admin/webhooks", heading: "Webhook health" },
  { path: "/admin/sections", heading: "Sections" },
  { path: "/admin/assets", heading: "Asset library" },
  { path: "/admin/audit", heading: "Audit log" },
] as const;

test.describe("admin, signed out @core", () => {
  // No session cookie: no database is touched, so this also runs on the production profile.
  for (const { path } of PAGES) {
    test(`${path} is a 404 for anonymous visitors`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(404);
      await expect(page.getByTestId("admin-page")).toHaveCount(0);
      await expect(page.getByRole("navigation", { name: "Admin" })).toHaveCount(0);
    });
  }
});

async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(text, params)).rows as T[];
  } finally {
    await client.end();
  }
}

/** Audit rows for a seeded user since `since`. */
const auditOf = (key: "admin" | "free", since: Date) =>
  query<{ action: string; target: string; meta: Record<string, unknown> | null }>(
    `select a.action, a.target, a.meta from audit_log a
     join "user" u on a.actor = u.id::text
     where u.email = $1 and a.at >= $2 order by a.at`,
    [testUserEmail(key), since]
  );

/** The `session.token` behind this context's session cookie (the cookie is `<token>.<signature>`). */
async function sessionToken(context: BrowserContext): Promise<string> {
  const cookie = (await context.cookies()).find((c) => /^(?:__Secure-)?oa\.session_token$/.test(c.name));
  if (!cookie) throw new Error("no session cookie");
  return decodeURIComponent(cookie.value).split(".")[0]!;
}

/**
 * Opens an admin page as the seeded admin. auth.spec.ts reseeds the admin user once per run, which deletes
 * sessions made just before it; on a 404 this signs in again and retries once (a real access bug 404s twice).
 */
async function gotoAsAdmin(context: BrowserContext, page: Page, path: string) {
  const res = await page.goto(path);
  if (res?.status() !== 404) return res;
  await loginAs(context, "admin");
  return page.goto(path);
}

test.describe("admin with the database @core", () => {
  test.skip(!dbE2E, SKIP_REASON);
  // admin and free are seeded once per run (auth.spec.ts reseeds them in its beforeAll); this file never
  // reseeds or edits other sessions, so it can't disturb auth.spec.ts. A reseed racing a test here drops the
  // session it just made, hence the retries.
  test.describe.configure({ retries: 2 });

  test("an admin sees every page, uncached and noindex", async ({ page, context }) => {
    await loginAs(context, "admin");
    for (const { path, heading } of PAGES) {
      const res = await gotoAsAdmin(context, page, path);
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(page.getByRole("navigation", { name: "Admin" })).toBeVisible();
      const cacheControl = res?.headers()["cache-control"] ?? "";
      expect(cacheControl, path).toContain("no-store");
      expect(cacheControl, path).toContain("private");
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    }
  });

  test("the KPI page shows the seeded subscriptions in USD", async ({ page, context }) => {
    await loginAs(context, "admin");
    await gotoAsAdmin(context, page, "/admin");
    // Seeded: pro_monthly (USD) and pro_yearly (INR) active, on_hold (BRL) at risk.
    await expect(page.getByTestId("kpi-active").locator("[data-value]")).toHaveText(/^\d+$/);
    await expect(page.getByTestId("kpi-mrr").locator("[data-value]")).toHaveText(/^\$[\d,]+\.\d{2}$/);
    await expect(page.getByTestId("mrr-by-country")).toContainText("US");
    await expect(page.getByTestId("kpi-on-hold").locator("[data-value]")).not.toHaveText("0");
  });

  test("the sections and assets pages read the registry and manifest", async ({ page, context }) => {
    await loginAs(context, "admin");
    await gotoAsAdmin(context, page, "/admin/sections");
    await expect(page.getByTestId("sections-env")).toHaveText(process.env.EXPECT_APP_ENV ?? /\w+/);
    const rows = page.getByTestId("sections-table").locator("tbody tr");
    expect(await rows.count()).toBeGreaterThan(3);
    await expect(page.getByTestId("sections-table")).not.toContainText("unavailable");

    await gotoAsAdmin(context, page, "/admin/assets?type=logo");
    await expect(page.getByTestId("assets-total")).toBeVisible();
    const first = page.getByTestId("assets-table").locator("tbody tr").first();
    await expect(first.getByRole("button", { name: "Copy snippet" })).toHaveAttribute(
      "data-snippet",
      /^<Img id="logos\//
    );
  });

  test("each admin page view is written to audit_log", async ({ page, context }) => {
    const since = new Date(Date.now() - 1000);
    await loginAs(context, "admin");
    await gotoAsAdmin(context, page, "/admin/webhooks");
    await gotoAsAdmin(context, page, "/admin/assets?q=cdn");
    const rows = await auditOf("admin", since);
    expect(rows.filter((r) => r.action === "admin.view").map((r) => r.target)).toEqual(
      expect.arrayContaining(["/admin/webhooks", "/admin/assets"])
    );
    // Other tests view /admin/assets as the same admin in parallel: look for this test's query.
    expect(rows.some((r) => r.target === "/admin/assets" && (r.meta?.query as { q?: string })?.q === "cdn")).toBe(true);

    // The audit page records its own view before it reads the log, so it lists it (other tests may add newer rows).
    await gotoAsAdmin(context, page, "/admin/audit");
    const ownView = page
      .getByTestId("audit-table")
      .locator("tbody tr")
      .filter({ hasText: "admin.view" })
      .filter({ hasText: "/admin/audit" });
    await expect(ownView.first()).toBeVisible();
  });

  test("a free user gets a 404 on every page, and the attempt is audited", async ({ page, context }) => {
    const since = new Date(Date.now() - 1000);
    await loginAs(context, "free");
    for (const { path } of PAGES) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(404);
      await expect(page.getByTestId("admin-page")).toHaveCount(0);
    }
    const denied = (await auditOf("free", since)).filter((r) => r.action === "admin.denied").map((r) => r.target);
    expect(denied).toEqual(PAGES.map((p) => p.path));
  });

  test("an admin signed in more than 10 minutes ago must sign in again", async ({ page, context }) => {
    // Age only this context's session, so other tests' admin sessions stay fresh. A reseed racing this test
    // deletes the session (the page then 404s as for anyone signed out): sign in and age it once more.
    for (let attempt = 0; attempt < 2; attempt++) {
      await loginAs(context, "admin");
      await query(`update session set created_at = now() - interval '11 minutes' where token = $1`, [
        await sessionToken(context),
      ]);
      const res = await page.goto("/admin/webhooks");
      if (res?.status() !== 404) break;
    }
    await expect(page).toHaveURL(/\/sign-in\?reauth=1&callbackURL=%2Fadmin%2Fwebhooks$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Confirm it's you");
  });
});
