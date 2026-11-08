import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// One-time local setup: `npm run setup:local -w web`. Writes apps/web/.env.local (gitignored) so `npm run dev`
// runs the site as the paid product it will be in production:
// - the paywall is on (content/features.yaml, `local: on`): premium articles show the preview and "Go Pro" to
//   anyone without Pro, so you always see what a non-paying visitor sees
// - "Go Pro" opens a real checkout flow against the local payments sandbox (`npm run dev:payments -w web`)
// - the sign-in page offers local test accounts (a free, non-paying user; Pro users; an admin), since Google
//   sign-in needs a real OAuth client
//
// Every value is a fresh random local secret or a localhost URL: nothing here is a real key, and nothing is sent
// anywhere. An existing .env.local is never overwritten (pass --force to replace it). With Docker running, it also
// starts the local Postgres, applies the migrations and creates the test users (`--no-db` skips that).

const webRoot = path.resolve(import.meta.dirname, "..");
const envFile = path.join(webRoot, ".env.local");
const force = process.argv.includes("--force");
const skipDb = process.argv.includes("--no-db");

const b64url = (bytes: number) => crypto.randomBytes(bytes).toString("base64url");
const PORT = 3001;
const origin = `http://localhost:${PORT}`;

const values: [string, string, string?][] = [
  ["APP_ENV", "local", "Sections and switches use their `local` state (content/sections.yaml, content/features.yaml)"],
  ["DATABASE_URL", "postgres://origins:origins@127.0.0.1:54329/origins_dev", "Local Docker Postgres (npm run db:up)"],
  ["BETTER_AUTH_URL", origin],
  ["TRUSTED_ORIGINS", origin],
  ["BETTER_AUTH_SECRET", b64url(32)],
  ["ENTITLEMENT_SECRET", `k1:${b64url(32)}`, "Signs the oa_ent paywall cookie: <kid>:<base64url 256-bit key>"],
  ["NEWSLETTER_TOKEN_SECRET", b64url(32)],
  ["ENABLE_TEST_LOGIN", "1", "Local test accounts on /sign-in (never in production builds)"],
  ["TEST_LOGIN_KEY", b64url(24)],
  ["GOOGLE_CLIENT_ID", "", "Leave empty locally, or paste a Google OAuth client for http://localhost:3001"],
  ["GOOGLE_CLIENT_SECRET", ""],
  [
    "LOCAL_VIEW_AS",
    "",
    "View switch for premium pages: paid = see everything as a paying user, unpaid = always the paywall, empty = follow who's signed in. Read when npm run dev starts; the Local view switch on every page changes it instantly",
  ],
  ["DODO_API_KEY", "local-sandbox", "Local payments sandbox (npm run dev:payments), not a real Dodo key"],
  ["DODO_API_BASE_URL", "http://127.0.0.1:3178"],
  ["DODO_WEBHOOK_SECRET", `whsec_${crypto.randomBytes(32).toString("base64")}`],
  ["DODO_PRODUCT_PRO_MONTHLY", "pdt_local_monthly"],
  ["DODO_PRODUCT_PRO_YEARLY", "pdt_local_yearly"],
];

if (fs.existsSync(envFile) && !force) {
  console.log(`${path.relative(process.cwd(), envFile)} already exists; left unchanged (use --force to replace it).`);
} else {
  const lines = [
    "# Written by `npm run setup:local -w web`: local development only. Random throwaway values; never reuse them",
    "# for staging or production, and never commit this file (it is gitignored).",
    "",
  ];
  for (const [key, value, comment] of values) {
    if (comment) lines.push(`# ${comment}`);
    lines.push(`${key}=${value}`);
  }
  fs.writeFileSync(envFile, `${lines.join("\n")}\n`, { mode: 0o600 });
  console.log(`Wrote ${path.relative(process.cwd(), envFile)}.`);
}

if (!skipDb) {
  const run = (script: string) =>
    execFileSync("npm", ["run", script], {
      cwd: webRoot,
      stdio: "inherit",
      env: { ...process.env, ...readEnv(envFile) },
    });
  try {
    run("db:up");
    run("db:migrate");
    run("db:seed:test");
  } catch {
    console.error("\nDatabase setup didn't finish. Start Docker Desktop, then run `npm run setup:local -w web` again.");
    process.exit(1);
  }
}

console.log(`
Next, in two terminals (from the repo root):
  npm run dev -w web            # the site on ${origin}
  npm run dev:payments -w web   # the local payments sandbox (test money only)

Then open ${origin}/sign-in and choose "Free user" to see the site as a non-paying visitor, or go to /pricing → Go Pro.`);

function readEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
