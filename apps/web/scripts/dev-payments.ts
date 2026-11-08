import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { signStandardWebhook } from "../src/features/billing/standard-webhooks";

// Local payments sandbox: `npm run dev:payments -w web`. A stand-in for the Dodo Payments API on your machine, so
// the paid site works end to end locally with no account and no real money:
//
//   Go Pro → consent step → "checkout" here → Pay (test) → signed webhooks to the app → you're Pro
//   Account → Billing → Manage subscription → "portal" here → cancel, renew, fail a renewal, end access
//
// It answers the API calls the Dodo adapter makes (src/features/billing/providers/dodo.ts) and sends the app
// webhooks signed with DODO_WEBHOOK_SECRET, exactly as Dodo would. Local only: it listens on 127.0.0.1 and refuses
// to send webhooks anywhere but localhost. `npm run setup:local -w web` writes the matching .env.local values:
//
//   DODO_API_KEY=local-sandbox   DODO_API_BASE_URL=http://127.0.0.1:3178   DODO_WEBHOOK_SECRET=whsec_…
//   DODO_PRODUCT_PRO_MONTHLY=pdt_local_monthly   DODO_PRODUCT_PRO_YEARLY=pdt_local_yearly
//
// Nothing is stored on disk: restarting it forgets its subscriptions (the app's database keeps its own copy).

const webRoot = path.resolve(import.meta.dirname, "..");
loadEnvFile(path.join(webRoot, ".env.local"));

const base = new URL(process.env.DODO_API_BASE_URL || "http://127.0.0.1:3178");
const PORT = Number(base.port || 3178);
const SECRET = process.env.DODO_WEBHOOK_SECRET ?? "";
const MONTHLY = process.env.DODO_PRODUCT_PRO_MONTHLY || "pdt_local_monthly";
const YEARLY = process.env.DODO_PRODUCT_PRO_YEARLY || "pdt_local_yearly";
/** Sample prices in US cents, matching the sample prices the local pricing page shows. */
const AMOUNT: Record<string, number> = { [MONTHLY]: 900, [YEARLY]: 9000 };
const DAY = 86_400_000;

if (process.env.APP_ENV === "production")
  fail("APP_ENV is production: the payments sandbox is for local development only.");
if (!/^whsec_/.test(SECRET)) fail("DODO_WEBHOOK_SECRET is missing. Run `npm run setup:local -w web` first.");
if (!["127.0.0.1", "localhost"].includes(base.hostname))
  fail("DODO_API_BASE_URL must point at 127.0.0.1 or localhost.");

interface Checkout {
  id: string;
  productId: string;
  userId: string;
  plan: string;
  email: string;
  returnUrl: URL;
  country: string;
}
interface Subscription {
  id: string;
  productId: string;
  userId: string;
  plan: string;
  customerId: string;
  appOrigin: string;
  status: "active" | "on_hold" | "cancelled" | "expired";
  periodEnd: Date;
  cancelAtPeriodEnd: boolean;
  country: string;
}

const checkouts = new Map<string, Checkout>();
const subscriptions = new Map<string, Subscription>();
let seq = 0;
const nextId = (prefix: string) => `${prefix}_local_${Date.now().toString(36)}${(seq++).toString(36)}`;

// ── Webhooks to the app ─────────────────────────────────────────────────────────────────────────────────────

function subscriptionData(s: Subscription) {
  return {
    payload_type: "Subscription",
    subscription_id: s.id,
    status: s.status,
    product_id: s.productId,
    quantity: 1,
    customer: { customer_id: s.customerId, email: "local-buyer@localhost.test", name: "Local Buyer" },
    metadata: { user_id: s.userId, plan: s.plan },
    recurring_pre_tax_amount: AMOUNT[s.productId] ?? 900,
    currency: "USD",
    next_billing_date: s.periodEnd.toISOString(),
    cancel_at_next_billing_date: s.cancelAtPeriodEnd,
    billing: { country: s.country },
    created_at: new Date().toISOString(),
  };
}

function paymentData(s: Subscription, status: "succeeded" | "failed") {
  return {
    payload_type: "Payment",
    payment_id: nextId("pay"),
    subscription_id: s.id,
    customer: { customer_id: s.customerId, email: "local-buyer@localhost.test", name: "Local Buyer" },
    metadata: { user_id: s.userId, plan: s.plan },
    total_amount: AMOUNT[s.productId] ?? 900,
    tax: 0,
    currency: "USD",
    status,
    payment_method_type: "card",
    billing: { country: s.country },
    created_at: new Date().toISOString(),
  };
}

async function sendWebhook(appOrigin: string, type: string, data: unknown): Promise<void> {
  const body = JSON.stringify({ business_id: "bus_local", type, timestamp: new Date().toISOString(), data });
  const id = nextId("msg");
  const timestamp = Math.floor(Date.now() / 1000);
  const res = await fetch(new URL("/api/billing/webhook/dodo", appOrigin), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": id,
      "webhook-timestamp": String(timestamp),
      "webhook-signature": await signStandardWebhook(SECRET, id, timestamp, body),
    },
    body,
  });
  console.log(`  webhook ${type} → ${res.status}`);
  if (!res.ok) throw new Error(`the app answered ${res.status} to ${type}; check the dev server log`);
}

// ── Actions from the checkout and portal pages ──────────────────────────────────────────────────────────────

async function pay(c: Checkout): Promise<void> {
  const yearly = c.productId === YEARLY;
  const s: Subscription = {
    id: nextId("sub"),
    productId: c.productId,
    userId: c.userId,
    plan: c.plan,
    customerId: `cus_local_${c.userId.slice(0, 8)}`,
    appOrigin: c.returnUrl.origin,
    status: "active",
    periodEnd: new Date(Date.now() + (yearly ? 365 : 30) * DAY),
    cancelAtPeriodEnd: false,
    country: c.country,
  };
  subscriptions.set(s.id, s);
  checkouts.delete(c.id);
  console.log(`checkout paid: ${s.plan} for user ${s.userId} (${s.id})`);
  await sendWebhook(s.appOrigin, "subscription.active", subscriptionData(s));
  await sendWebhook(s.appOrigin, "payment.succeeded", paymentData(s, "succeeded"));
}

const PORTAL_ACTIONS: Record<string, { label: string; run(s: Subscription): Promise<void> }> = {
  cancel: {
    label: "Cancel at the end of the period (keep Pro until then)",
    async run(s) {
      s.status = "cancelled";
      s.cancelAtPeriodEnd = true;
      await sendWebhook(s.appOrigin, "subscription.cancelled", subscriptionData(s));
    },
  },
  renew: {
    label: "Simulate a successful renewal",
    async run(s) {
      s.status = "active";
      s.cancelAtPeriodEnd = false;
      s.periodEnd = new Date(s.periodEnd.getTime() + (s.productId === YEARLY ? 365 : 30) * DAY);
      await sendWebhook(s.appOrigin, "subscription.renewed", subscriptionData(s));
      await sendWebhook(s.appOrigin, "payment.succeeded", paymentData(s, "succeeded"));
    },
  },
  fail: {
    label: "Simulate a failed renewal (on hold, 7-day grace period)",
    async run(s) {
      s.status = "on_hold";
      await sendWebhook(s.appOrigin, "payment.failed", paymentData(s, "failed"));
      await sendWebhook(s.appOrigin, "subscription.on_hold", subscriptionData(s));
    },
  },
  expire: {
    label: "End access now (period over)",
    async run(s) {
      s.status = "expired";
      s.periodEnd = new Date();
      await sendWebhook(s.appOrigin, "subscription.expired", subscriptionData(s));
    },
  },
};

// ── HTTP ────────────────────────────────────────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  handle(req, res).catch((err: unknown) => {
    console.error(err);
    page(res, 500, "Sandbox error", `<p>${escapeHtml(err instanceof Error ? err.message : String(err))}</p>`);
  });
});

async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", base);
  const method = req.method ?? "GET";
  const p = url.pathname;
  let m: RegExpMatchArray | null;

  // API calls from the app's Dodo adapter.
  if (method === "POST" && p === "/checkouts") {
    const body = JSON.parse(await readBody(req)) as {
      product_cart?: { product_id: string }[];
      metadata?: { user_id?: string; plan?: string };
      customer?: { email?: string };
      return_url?: string;
      billing_address?: { country?: string };
    };
    const returnUrl = new URL(body.return_url ?? "");
    if (!["localhost", "127.0.0.1"].includes(returnUrl.hostname))
      return json(res, 400, { error: "return_url must be local" });
    const c: Checkout = {
      id: nextId("cks"),
      productId: body.product_cart?.[0]?.product_id ?? MONTHLY,
      userId: body.metadata?.user_id ?? "",
      plan: body.metadata?.plan ?? "pro_monthly",
      email: body.customer?.email ?? "",
      returnUrl,
      country: body.billing_address?.country ?? "US",
    };
    checkouts.set(c.id, c);
    return json(res, 200, { session_id: c.id, checkout_url: new URL(`/checkout/${c.id}`, base).href });
  }
  if (method === "POST" && (m = p.match(/^\/customers\/([^/]+)\/customer-portal\/session$/))) {
    return json(res, 200, { link: new URL(`/portal/${m[1]}`, base).href });
  }
  if (method === "PATCH" && (m = p.match(/^\/subscriptions\/([^/]+)$/))) {
    const s = subscriptions.get(decodeURIComponent(m[1]));
    if (!s) return json(res, 404, {});
    s.status = "cancelled";
    s.cancelAtPeriodEnd = true;
    await sendWebhook(s.appOrigin, "subscription.cancelled", subscriptionData(s));
    return json(res, 200, subscriptionData(s));
  }
  if (method === "GET" && (m = p.match(/^\/subscriptions\/([^/]+)$/))) {
    const s = subscriptions.get(decodeURIComponent(m[1]));
    return s ? json(res, 200, subscriptionData(s)) : json(res, 404, {});
  }
  if (method === "GET" && p === "/subscriptions") {
    const items = [...subscriptions.values()].filter((s) => s.status === "active").map(subscriptionData);
    return json(res, 200, { items });
  }

  // Pages the buyer sees.
  if ((m = p.match(/^\/checkout\/([^/]+)$/))) {
    const c = checkouts.get(m[1]);
    if (!c) return page(res, 404, "Checkout not found", `<p>This test checkout has expired or was already paid.</p>`);
    if (method === "POST") {
      await pay(c);
      return redirect(res, c.returnUrl.href);
    }
    const yearly = c.productId === YEARLY;
    const price = yearly ? "$90.00 / year" : "$9.00 / month";
    return page(
      res,
      200,
      "Test checkout",
      `<p class="muted">Origins AI Learn · ${yearly ? "Pro yearly" : "Pro monthly"}</p>
       <p class="price">${price}</p>
       <p class="muted">Sample price · ${escapeHtml(c.email)} · billing country ${escapeHtml(c.country)}</p>
       <form method="post"><button>Pay ${price.split(" ")[0]} (test)</button></form>
       <p><a href="${escapeHtml(new URL("/pricing", c.returnUrl.origin).href)}">Cancel and go back</a></p>`
    );
  }
  if ((m = p.match(/^\/portal\/([^/]+)$/))) {
    const customerId = decodeURIComponent(m[1]);
    const mine = [...subscriptions.values()].filter((s) => s.customerId === customerId);
    if (method === "POST") {
      const form = new URLSearchParams(await readBody(req));
      const s = subscriptions.get(form.get("subscription") ?? "");
      const action = PORTAL_ACTIONS[form.get("action") ?? ""];
      if (s && action && s.customerId === customerId) {
        console.log(`portal: ${form.get("action")} ${s.id}`);
        await action.run(s);
      }
      return redirect(res, url.pathname);
    }
    const back = mine[0]
      ? new URL("/account/billing", mine[0].appOrigin).href
      : "http://localhost:3001/account/billing";
    const rows = mine.length
      ? mine
          .map(
            (
              s
            ) => `<section><h2>${s.plan === "pro_yearly" ? "Pro yearly" : "Pro monthly"} · ${s.status.replace("_", " ")}</h2>
              <p class="muted">${s.status === "expired" ? "Ended" : s.cancelAtPeriodEnd ? "Ends" : "Renews"} ${s.periodEnd.toDateString()} · ${s.id}</p>
              ${Object.entries(PORTAL_ACTIONS)
                .map(
                  ([
                    key,
                    a,
                  ]) => `<form method="post"><input type="hidden" name="subscription" value="${escapeHtml(s.id)}">
                    <input type="hidden" name="action" value="${key}"><button class="secondary">${a.label}</button></form>`
                )
                .join("")}</section>`
          )
          .join("")
      : `<p>No subscriptions from this sandbox run. (Restarting the sandbox forgets them; the app keeps its own record.)</p>`;
    return page(
      res,
      200,
      "Test customer portal",
      `${rows}<p><a href="${escapeHtml(back)}">Back to Account → Billing</a></p>`
    );
  }
  if (p === "/")
    return page(res, 200, "Local payments sandbox", `<p>Running. Start a checkout from the site's pricing page.</p>`);
  return json(res, 404, {});
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c: Buffer) => {
      raw += c;
      if (raw.length > 64 * 1024) reject(new Error("body too large"));
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function redirect(res: http.ServerResponse, to: string) {
  res.writeHead(303, { location: to });
  res.end();
}

function page(res: http.ServerResponse, status: number, title: string, html: string) {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · local sandbox</title>
<style>
  body{font:16px/1.5 system-ui,sans-serif;max-width:34rem;margin:3rem auto;padding:0 1rem;color:#111;background:#faf8f4}
  .banner{background:#fff3c4;border:1px solid #e5c100;border-radius:.75rem;padding:.6rem .9rem;font-size:14px}
  h1{font-size:1.6rem;margin:1.5rem 0 .5rem} h2{font-size:1.1rem;margin:0 0 .25rem}
  section{border:1px solid #ddd;border-radius:.75rem;padding:1rem;margin:1rem 0;background:#fff}
  .price{font-size:2rem;font-weight:600;margin:.5rem 0} .muted{color:#666;font-size:14px}
  button{font:inherit;border:0;border-radius:999px;background:#111;color:#fff;padding:.7rem 1.4rem;margin:.6rem 0;cursor:pointer}
  button.secondary{background:#fff;color:#111;border:1px solid #bbb;padding:.45rem 1rem;font-size:14px;margin:.25rem 0}
</style>
<p class="banner"><strong>Local test payments.</strong> No real money moves and nothing leaves this computer.</p>
<h1>${escapeHtml(title)}</h1>${html}</html>`);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

function loadEnvFile(file: string) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Local payments sandbox on ${base.origin} (test money only). Leave it running next to \`npm run dev\`.`);
});
