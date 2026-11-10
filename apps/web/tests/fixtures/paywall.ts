import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { parseKey, signEntitlement } from "../../src/server/edge/entitlement";

// Paywall e2e helpers (plan §12.2, §12.4): the build's premium manifest, `tts_ent` cookies signed with the server
// under test's ENTITLEMENT_SECRET (inherited from the shell that starts the Playwright web server), and a local
// stand-in for the Dodo API so checkout can run without any real endpoint.

const webRoot = path.resolve(__dirname, "../..");

export const FIXTURE_ROUTE = "/system-design/leak-canary/premium-article";
export const PREVIEW_OF = (p: string) => `${p}/_preview`;
/** A premium-by-default article from real content. */
export const PREMIUM_ARTICLE = "/system-design/databases/b-trees";

interface PremiumManifest {
  env: string;
  paywall: boolean;
  routes: string[];
}

export function premiumManifest(): PremiumManifest {
  const file = path.join(webRoot, "src", "generated", "premium-routes.json");
  if (!fs.existsSync(file)) return { env: "unknown", paywall: false, routes: [] };
  return JSON.parse(fs.readFileSync(file, "utf8")) as PremiumManifest;
}

export const paywallBuilt = () => premiumManifest().paywall;

/** Whether this run can sign cookies the server accepts. */
export const canSign = () => Boolean(parseKey(process.env.ENTITLEMENT_SECRET));

/** An `tts_ent` cookie signed with the server's key: `Cookie` header value. */
export async function signedEntitlement(
  claims: { tier: "free" | "pro"; role?: "user" | "admin"; sub?: string; v?: number; exp?: number },
  now = new Date()
): Promise<string> {
  const key = parseKey(process.env.ENTITLEMENT_SECRET);
  if (!key) throw new Error("ENTITLEMENT_SECRET is not set for the e2e run");
  const token = await signEntitlement(
    {
      sub: claims.sub ?? "e2e-user",
      tier: claims.tier,
      role: claims.role ?? "user",
      v: claims.v ?? 1,
      exp: claims.exp,
    },
    key,
    now
  );
  return `tts_ent=${token}`;
}

/** A correctly signed cookie that expired 10 minutes ago (beyond the 2-minute skew). */
export async function expiredEntitlement(): Promise<string> {
  const past = new Date(Date.now() - 30 * 60_000);
  return signedEntitlement({ tier: "pro", exp: Math.floor(past.getTime() / 1000) + 15 * 60 }, past);
}

/** Signed with a key the server doesn't have (unknown kid). */
export async function foreignKidEntitlement(): Promise<string> {
  const secret = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
  const token = await signEntitlement({ sub: "x", tier: "pro", role: "user", v: 1 }, parseKey(`zz:${secret}`)!);
  return `tts_ent=${token}`;
}

/** A minimal Dodo API stand-in: records requests, answers checkout and portal sessions. */
export function startDodoStub(port: number) {
  const requests: { method: string; path: string; body: unknown }[] = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : null;
      requests.push({ method: req.method ?? "", path: req.url ?? "", body });
      res.setHeader("content-type", "application/json");
      if (req.method === "POST" && req.url === "/checkouts") {
        res.end(JSON.stringify({ session_id: "cks_e2e", checkout_url: `http://127.0.0.1:${port}/hosted-checkout` }));
      } else if (req.method === "POST" && /\/customer-portal\/session$/.test(req.url ?? "")) {
        res.end(JSON.stringify({ link: `http://127.0.0.1:${port}/portal` }));
      } else if (req.url === "/hosted-checkout" || req.url === "/portal") {
        res.setHeader("content-type", "text/html");
        res.end(
          `<!doctype html><title>Stub</title><h1>${req.url === "/portal" ? "Stub portal" : "Stub checkout"}</h1>`
        );
      } else {
        res.statusCode = 404;
        res.end("{}");
      }
    });
  });
  return {
    requests,
    listen: () => new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve)),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
