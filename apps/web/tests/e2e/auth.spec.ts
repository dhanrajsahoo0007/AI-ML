import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { dbE2E, loginAs, origin, reseed, SKIP_REASON, TEST_USERS } from "../fixtures/users";
import { loadBuiltRoutes } from "./support/built-routes";
import { builtAppEnv } from "./support/registry";

// @core sign-in (plan §8.3, §12.2, §12.3). The first two tests run against every build; the rest need the
// database and the test-login provider (E2E_DB=1, see tests/fixtures/users.ts).

const webRoot = path.resolve(__dirname, "../..");

// Security review M1: `next` after sign-in must never leave the site (the URL parser strips tabs and newlines and
// reads `\` as `/`). Runs against every build; signed out, /account then continues to /sign-in.
test.describe("sign-in never redirects off the site @core", () => {
  for (const next of [
    "/%09/example.com/phish",
    "/%0A/example.com",
    "/%5Cexample.com",
    "//example.com",
    "/..//example.com",
  ]) {
    test(`/sign-in/complete?next=${next}`, async ({ page, baseURL }) => {
      await page.route(
        (u) => u.hostname.endsWith("example.com"),
        (r) => r.abort()
      );
      await page.goto(`/sign-in/complete?next=${next}`);
      await page.waitForURL((u) => u.pathname !== "/sign-in/complete" || u.origin !== new URL(baseURL!).origin);
      expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
    });
  }
});

test.describe("test-login provider is absent from production @core", () => {
  test("POST /api/test/login returns 404 in a production-profile build", async ({ request }) => {
    test.skip(builtAppEnv() !== "production", "the build under test is not the production profile");
    const variants: Record<string, string>[] = [
      {},
      { "x-test-login-key": process.env.TEST_LOGIN_KEY ?? "any-key-at-all-0123" },
    ];
    for (const headers of variants) {
      const res = await request.post("/api/test/login", {
        data: { userKey: "admin" },
        headers: { origin: origin(), ...headers },
      });
      expect(res.status()).toBe(404);
      expect(res.headers()["set-cookie"]).toBeUndefined();
    }
  });

  test("POST /api/dev/login (local test accounts) returns 404 outside `next dev`", async ({ request }) => {
    test.skip(builtAppEnv() === "local", "local builds serve the local test accounts on purpose");
    const res = await request.post("/api/dev/login", { data: { userKey: "admin" }, headers: { origin: origin() } });
    expect(res.status()).toBe(404);
    expect(res.headers()["set-cookie"]).toBeUndefined();
  });

  test("no client bundle mentions the test-login route", () => {
    test.skip(!!process.env.E2E_BASE_URL, "needs the local build output");
    const staticDir = path.join(webRoot, ".next", "static");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (
          /\.(js|json|html)$/.test(entry.name) &&
          /test\/login|x-test-login-key|dev\/login|oa_local_view/.test(fs.readFileSync(p, "utf8"))
        ) {
          offenders.push(path.relative(webRoot, p));
        }
      }
    };
    walk(staticDir);
    expect(offenders).toEqual([]);
  });
});

const profileButton = (page: Page) => page.locator('button[aria-label="Open profile menu"]:visible');

async function profileName(page: Page): Promise<string> {
  await profileButton(page).click();
  const name = page.getByTestId("profile-name").filter({ visible: true });
  await expect(name).not.toHaveText("…");
  const text = (await name.textContent()) ?? "";
  await page.keyboard.press("Escape");
  return text.trim();
}

test.describe("sign-in with the database @core", () => {
  test.skip(!dbE2E, SKIP_REASON);
  // One worker runs these in order (so the reseed runs once); each test still uses its own seeded user, and
  // account.spec.ts uses different ones, so no test revokes another's sessions.
  test.describe.configure({ mode: "serial" });
  test.beforeAll(() => reseed("free", "pro_monthly", "pro_yearly", "admin"));

  test("a session persists across navigation, and signing out ends it", async ({ page, context }) => {
    await loginAs(context, "free");
    await page.goto("/");
    expect(await profileName(page)).toBe(TEST_USERS.free.name);

    // A full load of another page and a client-side navigation from it keep the session.
    const hub = loadBuiltRoutes().ok.find((r) => r.split("/").length === 2 && r !== "/")!;
    await page.goto(hub);
    expect(await profileName(page)).toBe(TEST_USERS.free.name);
    const link = page.locator(`main a[href^="${hub}/"]:visible`).first();
    const href = (await link.getAttribute("href"))!;
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    expect(await profileName(page)).toBe(TEST_USERS.free.name);
    await page.goto("/account");
    await expect(page.getByTestId("account-email")).toHaveText("free@users.origins.test");

    await profileButton(page).click();
    await page.getByRole("menuitem", { name: "Sign out" }).filter({ visible: true }).click();
    await page.waitForLoadState("load");
    // Signing out on /account redirects to /sign-in, so check the signed-out menu from a content page.
    await expect(page).not.toHaveURL(/\/account$/);
    await page.goto("/");
    expect(await profileName(page)).toBe("Guest learner");
    await page.goto("/account");
    await expect(page).toHaveURL(/\/sign-in\?callbackURL=%2Faccount/);
  });

  test("sign out everywhere revokes the sessions on other devices", async ({ browser }) => {
    const laptop = await browser.newContext();
    const phone = await browser.newContext();
    await loginAs(laptop, "pro_monthly");
    await loginAs(phone, "pro_monthly");

    const a = await laptop.newPage();
    await a.goto("/account");
    await expect(a.getByTestId("account-sessions").locator("li")).toHaveCount(2);
    await a.getByRole("button", { name: "Sign out everywhere" }).click();
    await expect(a).toHaveURL(new RegExp(`${origin()}/$`));

    const b = await phone.newPage();
    await b.goto("/account");
    await expect(b).toHaveURL(/\/sign-in/);
    await laptop.close();
    await phone.close();
  });

  test("the age confirmation is required before Google", async ({ page, request }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
    const box = page.getByRole("checkbox", { name: /18 or older, or my parent or guardian/ });
    const button = page.getByRole("button", { name: "Continue with Google" });
    await expect(box).not.toBeChecked();
    await expect(button).toBeDisabled();
    await expect(page.getByText(/Under 13\? Ask a parent or guardian/)).toBeVisible();

    if (process.env.GOOGLE_CLIENT_ID) {
      // Never reach Google itself: capture the redirect instead.
      await page.route("https://accounts.google.com/**", (route) => route.fulfill({ body: "google" }));
      await box.check();
      await expect(button).toBeEnabled();
      const [nav] = await Promise.all([page.waitForRequest(/accounts\.google\.com/), button.click()]);
      const url = new URL(nav.url());
      expect(url.searchParams.get("client_id")).toBe(process.env.GOOGLE_CLIENT_ID);
      expect(url.searchParams.get("scope")?.split(" ").sort()).toEqual(["email", "openid", "profile"]);
    } else {
      await expect(page.getByText("Google sign-in isn't set up in this environment yet.")).toBeVisible();
      await box.check();
      await expect(button).toBeDisabled();
    }

    // The server refuses to start the Google flow without the confirmation, whatever the page does.
    const res = await request.post("/api/auth/sign-in/social", {
      data: { provider: "google", callbackURL: "/sign-in/complete" },
      headers: { origin: origin() },
    });
    expect(res.status()).toBe(403);
    expect(await res.json()).toMatchObject({ code: "AGE_CONFIRMATION_REQUIRED" });
  });

  test("progress persists across browser contexts and signed-out progress merges at sign-in", async ({ browser }) => {
    // Real pages of this build: the API refuses keys that aren't (security review M7).
    const pages = JSON.parse(fs.readFileSync(path.join(webRoot, "src/generated/search-index.json"), "utf8")) as {
      h: string;
      t: string;
    }[];
    const [{ h: keyHref, t: keyTitle }, { h: mergedHref, t: mergedTitle }] = pages.slice(-2) as [
      { h: string; t: string },
      { h: string; t: string },
    ];
    const key = keyHref.slice(1);
    const merged = mergedHref.slice(1);
    // A key of a page that doesn't exist is refused (and, from localStorage, dropped by the merge island).
    const junk = `e2e/not-a-page-${Date.now()}`;

    const first = await browser.newContext();
    await loginAs(first, "pro_yearly");
    const marked = await first.request.post("/api/progress", {
      data: { contentKey: key, kind: "complete" },
      headers: { origin: origin() },
    });
    expect(marked.status()).toBe(200);
    const refused = await first.request.post("/api/progress", {
      data: { contentKey: junk, kind: "complete" },
      headers: { origin: origin() },
    });
    expect(refused.status()).toBe(400);

    // Signed out in a second browser: progress goes to localStorage, then merges on sign-in.
    const second = await browser.newContext();
    const page = await second.newPage();
    await page.goto("/");
    await page.evaluate(
      ([k, j]) =>
        localStorage.setItem(
          "oa_progress_v1",
          JSON.stringify({ completed: { [k]: new Date().toISOString(), [j]: new Date().toISOString() } })
        ),
      [merged, junk]
    );
    await loginAs(second, "pro_yearly");
    await page.goto("/sign-in/complete?next=%2Faccount");
    await expect(page).toHaveURL(/\/account$/);
    const completed = page.getByTestId("account-completed");
    await expect(completed.locator(`a[href="${keyHref}"]`)).toHaveText(keyTitle);
    await expect(completed.locator(`a[href="${mergedHref}"]`)).toHaveText(mergedTitle);
    expect(await page.evaluate(() => localStorage.getItem("oa_progress_v1"))).toBeNull();

    // And the first browser sees what the second one merged.
    const list = await (await first.request.get("/api/progress")).json();
    const keys = list.progress.map((p: { contentKey: string }) => p.contentKey);
    expect(keys).toEqual(expect.arrayContaining([key, merged]));
    expect(keys).not.toContain(junk);
    await first.close();
    await second.close();
  });

  test("content pages make zero database queries, signed in or out", async ({ browser }) => {
    const logFile = process.env.DB_QUERY_LOG_FILE;
    test.skip(!logFile, "DB_QUERY_LOG_FILE is not set for the server under test");
    // Each logged query is tagged with who opened the connection: an API route path or `page:account`. Other
    // DB specs run in parallel workers against the same server, so their (tagged) queries are ignored here;
    // anything else, i.e. a page render, counts. API calls made by the crawled pages are caught separately.
    const renderQueries = () =>
      (fs.existsSync(logFile!) ? fs.readFileSync(logFile!, "utf8").split("\n") : []).filter(
        (l) => l && !/^\S+ \[(\/api\/|page:account\])/.test(l)
      );
    const settle = () => new Promise((r) => setTimeout(r, 750));

    const { ok } = loadBuiltRoutes();
    const sample = ok.filter((_, i) => i % Math.max(1, Math.floor(ok.length / 25)) === 0).slice(0, 30);
    const signedIn = await browser.newContext();
    await loginAs(signedIn, "admin");
    const signedOut = await browser.newContext();

    await settle();
    const before = renderQueries().length;
    const apiCalls: string[] = [];
    for (const context of [signedOut, signedIn]) {
      const page = await context.newPage();
      page.on("request", (r) => {
        if (new URL(r.url()).pathname.startsWith("/api/")) apiCalls.push(r.url());
      });
      for (const url of sample) {
        const res = await page.goto(url, { waitUntil: "load" });
        expect(res?.status(), url).toBe(200);
      }
      // Client navigations (RSC payloads) too.
      await page.locator("main a[href^='/']:visible").first().click();
      await page.waitForLoadState("networkidle");
    }
    await settle();
    expect(renderQueries().slice(before), "database queries from page renders").toEqual([]);
    expect(apiCalls, "API requests made by content pages").toEqual([]);

    // The hook itself works: the account page does query (tagged page:account).
    const page = await signedIn.newPage();
    const tagged = () =>
      fs
        .readFileSync(logFile!, "utf8")
        .split("\n")
        .filter((l) => l.includes("[page:account]")).length;
    const accountBefore = tagged();
    await page.goto("/account");
    await settle();
    expect(tagged()).toBeGreaterThan(accountBefore);
    await signedIn.close();
    await signedOut.close();
  });
});
