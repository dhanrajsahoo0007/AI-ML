import fs from "node:fs";
import path from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { Client } from "pg";
import { signWebhook } from "../../src/features/email/webhook-signature";
import { dbE2E, loginAs, origin, SKIP_REASON, testUserEmail } from "../fixtures/users";
import { builtAppEnv, buildSections } from "./support/registry";

// @core Newsletter (plan §15.2). Against a build where the section is `on`: subscribe on the archive page → the
// double opt-in email lands in the dev outbox (.eml) → confirm → active (welcome email with RFC 8058 headers) →
// one-click unsubscribe. Against a build where it is `off` (production today): every newsletter URL is a 404.
//
// The sign-up needs a token secret on the server: APP_ENV=local has a dev default; for a preview build start the
// tests with NEWSLETTER_TOKEN_SECRET set (the `next start` web server inherits it), otherwise the flow is skipped.
//
// With E2E_DB=1 (Postgres, see tests/fixtures/users.ts) the same flow is also checked in the database
// (newsletter_subscriber + consent_log), and the signed-in one click and the Resend bounce webhook run; the
// webhook test also needs RESEND_WEBHOOK_SECRET (any `whsec_<base64>`) in the environment of both.

const env = builtAppEnv();
const section = buildSections(env).find((s) => s.kind === "newsletter");
const webRoot = path.resolve(__dirname, "../..");
const outbox = path.resolve(webRoot, process.env.DEV_MAIL_DIR ?? ".build/mail");
const SAMPLE_ISSUE = "system-design-digest-0";

interface Eml {
  headers: Record<string, string>;
  text: string;
}

function parseEml(raw: string): Eml {
  const [head, ...rest] = raw.split("\r\n\r\n");
  const headers: Record<string, string> = {};
  for (const line of head.split("\r\n")) {
    const i = line.indexOf(":");
    headers[line.slice(0, i).toLowerCase()] = line.slice(i + 1).trim();
  }
  // The first part is text/plain (8bit); it ends at the next boundary line.
  const boundary = /boundary="([^"]+)"/.exec(headers["content-type"] ?? "")?.[1] ?? "";
  const body = rest.join("\r\n\r\n");
  const textStart = body.indexOf("Content-Type: text/plain");
  const text = body.slice(body.indexOf("\r\n\r\n", textStart) + 4, body.indexOf(`\r\n--${boundary}`, textStart));
  return { headers, text };
}

async function waitForEmail(template: string, to: string): Promise<Eml> {
  const needle = `-${template}-${to.toLowerCase().replace(/[^a-z0-9]+/g, "_")}-`;
  let found: string | undefined;
  await expect
    .poll(
      () => {
        found = fs.existsSync(outbox) ? fs.readdirSync(outbox).find((f) => f.includes(needle)) : undefined;
        return found;
      },
      { message: `${template} email for ${to} in ${outbox}`, timeout: 10_000 }
    )
    .toBeTruthy();
  return parseEml(fs.readFileSync(path.join(outbox, found!), "utf8"));
}

/** Site path (with query) of the first link in `text` that contains `marker`. */
function linkPath(text: string, marker: string): string {
  const url = text.match(new RegExp(`https?://\\S*${marker}\\?token=[A-Za-z0-9._%-]+`))?.[0];
  expect(url, `link containing ${marker}`).toBeTruthy();
  const u = new URL(url!);
  return u.pathname + u.search;
}

const randomIp = () => `198.18.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;

async function post(request: APIRequestContext, url: string, data: unknown) {
  return request.post(url, { data, headers: { "x-forwarded-for": randomIp(), origin: origin() } });
}

/** Reads from the e2e database (E2E_DB only). */
async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(text, params)).rows as T[];
  } finally {
    await client.end();
  }
}

const subscriberStatus = async (email: string) =>
  (await query<{ status: string }>("select status from newsletter_subscriber where email = $1", [email]))[0]?.status;

test.describe(`newsletter, APP_ENV=${env} @core`, () => {
  test.skip(!section, "no newsletter section in the registry");

  test.describe("section off", () => {
    test.skip(section?.state !== "off", `newsletter is ${section?.state} in ${env}`);

    test("every newsletter URL is a 404", async ({ request }) => {
      const href = section!.href;
      for (const url of [
        href,
        `${href}/${SAMPLE_ISSUE}`,
        `${href}/rss.xml`,
        `${href}/confirm`,
        `${href}/unsubscribe`,
        "/account/email-preferences",
        "/api/newsletter/account",
        "/api/newsletter/unsubscribe?token=x",
      ]) {
        expect((await request.get(url, { maxRedirects: 0 })).status(), url).toBe(404);
      }
      for (const api of [
        "/api/newsletter/subscribe",
        "/api/newsletter/confirm",
        "/api/newsletter/unsubscribe",
        "/api/newsletter/account",
        "/api/webhooks/resend",
      ]) {
        const res = await post(request, api, { email: "a@example.com", token: "x", action: "subscribe" });
        expect(res.status(), `POST ${api}`).toBe(404);
      }
    });
  });

  test.describe("section on", () => {
    test.skip(section?.state !== "on", `newsletter is ${section?.state} in ${env}`);

    test("archive, issue page and RSS (titles and summaries only)", async ({ page, request }) => {
      const href = section!.href;
      await page.goto(href);
      await expect(page.locator("h1")).toHaveText("Newsletter");
      await expect(page.getByRole("button", { name: "Subscribe", exact: true })).toBeVisible();

      const issue = await page.goto(`${href}/${SAMPLE_ISSUE}`);
      expect(issue?.status()).toBe(200);
      // The sample is a draft: built for review outside production, never indexed.
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

      const rss = await request.get(`${href}/rss.xml`);
      expect(rss.status()).toBe(200);
      expect(rss.headers()["content-type"]).toContain("application/rss+xml");
      const xml = await rss.text();
      expect(xml).toContain("<rss");
      // Drafts are not in the feed, and no issue body ever is.
      expect(xml).not.toContain(SAMPLE_ISSUE);
      expect(xml).not.toContain("Welcome to issue zero");
    });

    test("the subscribe API validates its body and ignores the honeypot", async ({ request }) => {
      test.skip(env !== "local" && !process.env.NEWSLETTER_TOKEN_SECRET, "server needs NEWSLETTER_TOKEN_SECRET");
      expect((await post(request, "/api/newsletter/subscribe", { email: "not-an-email" })).status()).toBe(400);
      expect((await post(request, "/api/newsletter/subscribe", { email: "a@example.com", extra: 1 })).status()).toBe(
        400
      );
      const bot = `bot-${Date.now()}@example.com`;
      const res = await post(request, "/api/newsletter/subscribe", { email: bot, website: "https://spam.example" });
      expect(res.status()).toBe(202);
      await new Promise((r) => setTimeout(r, 500));
      const files = fs.existsSync(outbox) ? fs.readdirSync(outbox) : [];
      expect(files.filter((f) => f.includes(bot.replace(/[^a-z0-9]+/g, "_")))).toEqual([]);
    });

    test("subscribe → .eml written → confirm → active → one-click unsubscribe", async ({ page, request }) => {
      test.skip(!!process.env.E2E_BASE_URL, "reads the local dev outbox");
      test.skip(env !== "local" && !process.env.NEWSLETTER_TOKEN_SECRET, "server needs NEWSLETTER_TOKEN_SECRET");
      const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
      await page.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });

      // 1. Sign up on the archive page.
      await page.goto(section!.href);
      await page.getByLabel("Email address").first().fill(email);
      await page.getByRole("button", { name: "Subscribe", exact: true }).first().click();
      await expect(page.getByRole("status")).toContainText("Check your inbox");

      // 2. The double opt-in email is in the outbox, with a confirm link and no one-click headers yet.
      const confirmMail = await waitForEmail("confirm-subscription", email);
      expect(confirmMail.headers.to).toBe(email);
      expect(confirmMail.text).toContain("48 hours");
      const confirmPath = linkPath(confirmMail.text, `${section!.href}/confirm`);

      // 3. Confirm: the link opens a page; nothing changes until the click.
      await page.goto(confirmPath);
      await expect(page.locator("h1")).toHaveText("Confirm your subscription");
      await page.getByRole("button", { name: "Confirm subscription" }).click();
      await expect(page.getByRole("status")).toContainText("You're subscribed");
      if (dbE2E) {
        // Postgres: active, with the opt-in (and its consent text version) in consent_log.
        expect(await subscriberStatus(email)).toBe("active");
        const consent = await query<{ kind: string; text_version: string }>(
          `select c.kind, c.text_version from consent_log c join newsletter_subscriber s on s.id = c.subscriber_id
           where s.email = $1`,
          [email]
        );
        expect(consent).toEqual([{ kind: "newsletter_opt_in", text_version: "2026-11-07" }]);
      }

      // 4. Active: the welcome email carries the RFC 8058 headers.
      const welcome = await waitForEmail("welcome", email);
      expect(welcome.headers["list-unsubscribe-post"]).toBe("List-Unsubscribe=One-Click");
      const oneClick = new URL(welcome.headers["list-unsubscribe"].replace(/^<|>$/g, ""));
      expect(oneClick.protocol).toBe("https:");

      // A GET on the one-click URL changes nothing; it redirects to the page.
      const get = await request.get(oneClick.pathname + oneClick.search, { maxRedirects: 0 });
      expect(get.status()).toBe(303);
      expect(get.headers().location).toContain(`${section!.href}/unsubscribe?token=`);

      // 5. One-click unsubscribe, as Gmail does it: POST with List-Unsubscribe=One-Click, no cookies.
      const res = await request.post(oneClick.pathname + oneClick.search, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        data: "List-Unsubscribe=One-Click",
      });
      expect(res.status()).toBe(200);
      expect(await res.json()).toEqual({ status: "unsubscribed" });
      if (dbE2E) expect(await subscriberStatus(email)).toBe("unsubscribed");

      // The old confirm link can't re-activate the address.
      const token = new URL(confirmPath, "http://x").searchParams.get("token");
      const again = await post(request, "/api/newsletter/confirm", { token });
      expect(again.status()).toBe(409);

      // The footer link's page works too (idempotent).
      await page.goto(linkPath(welcome.text, `${section!.href}/unsubscribe`));
      await page.getByRole("button", { name: "Unsubscribe" }).click();
      await expect(page.getByRole("status")).toContainText("You're unsubscribed");
    });

    test.describe("with the database", () => {
      test.skip(!dbE2E, SKIP_REASON);

      test("signed in: one-click subscribe from the sign-up form, then email preferences", async ({
        context,
        page,
      }) => {
        // The admin seed user: auth.spec reseeds it only once at the start, and nothing else uses its newsletter row.
        const email = testUserEmail("admin");
        await query("delete from newsletter_subscriber where email = $1", [email]);
        await loginAs(context, "admin");

        await page.goto(section!.href);
        await page.getByRole("button", { name: "Subscribe with your account" }).first().click();
        await expect(page.getByTestId("newsletter-account-status").first()).toContainText(`subscribed as ${email}`);
        expect(await subscriberStatus(email)).toBe("active");
        // No double opt-in for a verified address: no confirmation email, a welcome email instead.
        await waitForEmail("welcome", email);
        const confirmations = fs.existsSync(outbox)
          ? fs
              .readdirSync(outbox)
              .filter((f) => f.includes(`-confirm-subscription-${email.replace(/[^a-z0-9]+/g, "_")}-`))
          : [];
        expect(confirmations).toEqual([]);

        await page.goto("/account/email-preferences");
        await expect(page.getByTestId("newsletter-status")).toHaveText("Subscribed");
        await page.getByRole("button", { name: "Unsubscribe" }).click();
        await expect(page.getByTestId("newsletter-status")).toHaveText("Unsubscribed");
        expect(await subscriberStatus(email)).toBe("unsubscribed");
        await page.getByRole("button", { name: "Subscribe with one click" }).click();
        await expect(page.getByTestId("newsletter-status")).toHaveText("Subscribed");
      });

      test("signed out: email preferences asks to sign in", async ({ page }) => {
        await page.goto("/account/email-preferences");
        await expect(page).toHaveURL(/\/sign-in\?callbackURL=%2Faccount%2Femail-preferences/);
      });

      test("a Resend bounce webhook suppresses the address", async ({ request }) => {
        const secret = process.env.RESEND_WEBHOOK_SECRET;
        test.skip(!secret, "needs RESEND_WEBHOOK_SECRET for the server and the tests");
        test.skip(env !== "local" && !process.env.NEWSLETTER_TOKEN_SECRET, "server needs NEWSLETTER_TOKEN_SECRET");
        const email = `bounce-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
        expect((await post(request, "/api/newsletter/subscribe", { email })).status()).toBe(202);
        expect(await subscriberStatus(email)).toBe("pending");

        const body = JSON.stringify({
          type: "email.bounced",
          created_at: new Date().toISOString(),
          data: {
            email_id: "e2e",
            to: [email],
            bounce: { type: "Permanent" },
            tags: { template: "confirm-subscription" },
          },
        });
        const id = `msg_e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
        const now = Math.floor(Date.now() / 1000);
        const send = (signature: string) =>
          request.post("/api/webhooks/resend", {
            data: body,
            headers: {
              "content-type": "application/json",
              "svix-id": id,
              "svix-timestamp": String(now),
              "svix-signature": signature,
            },
          });
        // No Origin header (server to server); a wrong signature is refused before anything is stored.
        expect((await send("v1,AAAA")).status()).toBe(401);
        expect(await subscriberStatus(email)).toBe("pending");

        const res = await send(await signWebhook(secret!, id, now, body));
        expect(res.status()).toBe(200);
        expect(await res.json()).toEqual({ received: true, status: "processed" });
        expect(await subscriberStatus(email)).toBe("bounced");
        // Retried delivery: idempotent.
        expect(await (await send(await signWebhook(secret!, id, now, body))).json()).toEqual({
          received: true,
          status: "duplicate",
        });

        // Signing up again sends nothing (the answer stays the same): still only the first confirmation email.
        const confirmations = () =>
          fs
            .readdirSync(outbox)
            .filter((f) => f.includes(`-confirm-subscription-${email.replace(/[^a-z0-9]+/g, "_")}-`));
        await waitForEmail("confirm-subscription", email);
        expect((await post(request, "/api/newsletter/subscribe", { email })).status()).toBe(202);
        await new Promise((r) => setTimeout(r, 500));
        expect(confirmations()).toHaveLength(1);
      });
    });
  });
});
