// Runner for the k6 load tests (plan §12.6). `npm run load:local -w web` runs every scenario at laptop rates
// against the Workers runtime (`opennextjs-cloudflare preview`) on localhost. See tests/load/README.md.
//
//   node --import ./scripts/ts-hooks.mjs tests/load/run.ts [--profile local|staging] [--scenarios a,b]
//                                                         [--base http://localhost:8787] [--no-start]
//
// What it does:
// 1. Refuses any target that isn't localhost (staging needs LOAD_ALLOW_HOST=<exact host>, set by the owner).
// 2. Builds the URL list from the build manifest (.next/prerender-manifest.json): every prerendered 200 page.
// 3. Signs a pro `oa_ent` cookie with the edge helper (src/server/edge/entitlement.ts) and a throwaway key.
// 4. If nothing is listening on the base URL, starts `opennextjs-cloudflare preview` with that key as
//    ENTITLEMENT_SECRET (needs `npm run cf:build` first) and stops it afterwards.
// 5. Runs k6: the local binary if installed, else the official grafana/k6 Docker image.
// 6. Writes the summary (p95/p99, error rate per scenario, soak drift) to test-results/load/.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { parseKey, signEntitlement } from "../../src/server/edge/entitlement";

const WEB_ROOT = path.resolve(import.meta.dirname, "../..");
const LOAD_DIR = path.join(WEB_ROOT, "tests/load");
// test-results/ is git- and Prettier-ignored already. The URL list goes in its own folder (mounted read-only).
const RESULTS = path.join(WEB_ROOT, "test-results/load");
const GENERATED = path.join(RESULTS, "input");
const K6_IMAGE = "grafana/k6:1.4.0";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const SCENARIOS = ["free_pages", "premium_pages", "auth", "spike", "soak"];

interface Args {
  profile: "local" | "staging";
  scenarios: string[];
  base: string;
  start: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { profile: "local", scenarios: SCENARIOS, base: "http://localhost:8787", start: true };
  let explicitScenarios = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i] ?? fail(`${a} needs a value`);
    if (a === "--profile") {
      const p = next();
      if (p !== "local" && p !== "staging") fail(`--profile must be local or staging, got ${p}`);
      args.profile = p;
    } else if (a === "--scenarios") {
      args.scenarios = next()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      explicitScenarios = true;
    } else if (a === "--base") args.base = next().replace(/\/+$/, "");
    else if (a === "--no-start") args.start = false;
    else fail(`Unknown argument ${a}`);
  }
  for (const s of args.scenarios)
    if (!SCENARIOS.includes(s)) fail(`Unknown scenario ${s} (known: ${SCENARIOS.join(", ")})`);
  // Sign-in and the session lookup need Postgres (`npm run db:up -w web`). Without DATABASE_URL a local run skips
  // them unless asked for by name.
  if (!explicitScenarios && args.profile === "local" && !process.env.DATABASE_URL) {
    args.scenarios = args.scenarios.filter((s) => s !== "auth");
    console.log(
      "load: skipping the auth scenario (no DATABASE_URL); run `--scenarios auth` with DATABASE_URL set to include it"
    );
  }
  return args;
}

function fail(message: string): never {
  console.error(`load: ${message}`);
  process.exit(2);
}

/** Only localhost, unless the owner names the exact staging host (never a production host). */
export function assertAllowedTarget(base: string, allowHost = process.env.LOAD_ALLOW_HOST): URL {
  const url = new URL(base);
  if (LOCAL_HOSTS.has(url.hostname)) return url;
  if (allowHost && allowHost === url.hostname && /(^|[.-])(staging|preview|dev|test)[.-]/.test(url.hostname))
    return url;
  throw new Error(`Refusing to load ${url.hostname}: only localhost (or LOAD_ALLOW_HOST=<staging host>) is allowed.`);
}

interface PrerenderManifest {
  routes: Record<string, { dataRoute: string | null; initialStatus?: number }>;
}

/** Section prefixes the middleware 404s for anonymous readers in this build (`hidden` and `off`, plan §5.1.1). */
function gatedPrefixes(): string[] {
  const file = path.join(WEB_ROOT, "src/generated/hidden-routes.json");
  if (!fs.existsSync(file)) return [];
  const gate = JSON.parse(fs.readFileSync(file, "utf8")) as { hidden?: string[]; off?: string[] };
  return [...(gate.hidden ?? []), ...(gate.off ?? [])];
}

/** Prerendered 200 pages from the build manifest (same source as the e2e route crawl), minus gated sections. */
function builtPages(): string[] {
  const gated = gatedPrefixes();
  const file = path.join(WEB_ROOT, ".next/prerender-manifest.json");
  if (!fs.existsSync(file))
    fail("No build found (.next/prerender-manifest.json). Run `npm run cf:build -w web` first.");
  const manifest = JSON.parse(fs.readFileSync(file, "utf8")) as PrerenderManifest;
  return Object.entries(manifest.routes)
    .filter(([route, info]) => info.dataRoute && route !== "/_not-found")
    .filter(([route, info]) => {
      const meta = path.join(WEB_ROOT, ".next/server/app", `${route === "/" ? "index" : route.slice(1)}.meta`);
      const status =
        info.initialStatus ??
        (fs.existsSync(meta) ? (JSON.parse(fs.readFileSync(meta, "utf8")) as { status?: number }).status : 200);
      return (status ?? 200) === 200;
    })
    .map(([route]) => route)
    .filter((route) => !gated.some((p) => route === p || route.startsWith(`${p}/`)))
    .sort();
}

/** A fresh 256-bit test key in the ENTITLEMENT_SECRET format (`<kid>:<base64url>`); never a real secret. */
function testKey(): string {
  return `load:${crypto.randomBytes(32).toString("base64url")}`;
}

async function portOpen(url: URL): Promise<boolean> {
  const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
  return new Promise((resolve) => {
    const socket = net.connect({ host: url.hostname === "localhost" ? "127.0.0.1" : url.hostname, port });
    socket.once("connect", () => (socket.destroy(), resolve(true)));
    socket.once("error", () => resolve(false));
  });
}

async function waitForHttp(url: URL, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  fail(`The preview server at ${url.origin} didn't come up within ${timeoutMs / 1000}s.`);
}

function startPreview(url: URL, secret: string): ChildProcess {
  if (!fs.existsSync(path.join(WEB_ROOT, ".open-next/worker.js"))) {
    fail(
      "No Workers build (.open-next/worker.js). Run `npm run cf:build -w web` first, or start `npm run preview -w web`."
    );
  }
  console.log(
    `load: starting opennextjs-cloudflare preview on port ${url.port} (ENTITLEMENT_SECRET = throwaway test key)`
  );
  // Wrangler's own output (startup, per-request lines, errors) goes to a file next to the results.
  fs.mkdirSync(RESULTS, { recursive: true });
  const log = fs.openSync(path.join(RESULTS, "preview.log"), "w");
  return spawn(
    "npx",
    [
      "opennextjs-cloudflare",
      "preview",
      "--port",
      url.port || "8787",
      "--ip",
      "127.0.0.1",
      "--var",
      `ENTITLEMENT_SECRET:${secret}`,
      // Local Postgres only (the DB boot guard refuses remote hosts outside known APP_ENVs).
      ...(process.env.DATABASE_URL ? ["--var", `DATABASE_URL:${process.env.DATABASE_URL}`] : []),
    ],
    { cwd: WEB_ROOT, stdio: ["ignore", log, log], detached: true }
  );
}

function k6Command(base: URL, env: Record<string, string>): { cmd: string; args: string[] } {
  const script = "tests/load/k6/main.js";
  if (spawnSync("k6", ["version"], { stdio: "ignore" }).status === 0) {
    const flags = Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
    return { cmd: "k6", args: ["run", "--quiet", ...flags, path.join(WEB_ROOT, script)] };
  }
  if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0) {
    fail("k6 isn't installed and Docker isn't running. Install k6 (`brew install k6`) or start Docker.");
  }
  if (spawnSync("docker", ["image", "inspect", K6_IMAGE], { stdio: "ignore" }).status !== 0) {
    // Anonymous pull of a public image; an empty DOCKER_CONFIG sidesteps a missing desktop credential helper.
    const cfg = fs.mkdtempSync(path.join(os.tmpdir(), "k6-docker-"));
    fs.writeFileSync(path.join(cfg, "config.json"), "{}");
    const pull = spawnSync("docker", ["pull", K6_IMAGE], {
      stdio: "inherit",
      env: { ...process.env, DOCKER_CONFIG: cfg },
    });
    if (pull.status !== 0) fail(`docker pull ${K6_IMAGE} failed`);
  }
  // Inside the container localhost is the container itself: reach the host through host.docker.internal.
  const inContainer = {
    ...env,
    BASE_URL: env.BASE_URL.replace(base.hostname, "host.docker.internal"),
    URLS_FILE: "/generated/urls.json",
    SUMMARY_FILE: `/results/${path.basename(env.SUMMARY_FILE)}`,
  };
  const flags = Object.entries(inContainer).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
  return {
    cmd: "docker",
    args: [
      "run",
      "--rm",
      "--add-host=host.docker.internal:host-gateway",
      "-v",
      `${LOAD_DIR}:/load:ro`,
      "-v",
      `${GENERATED}:/generated:ro`,
      "-v",
      `${RESULTS}:/results`,
      K6_IMAGE,
      "run",
      "--quiet",
      ...flags,
      "/load/k6/main.js",
    ],
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let base: URL;
  try {
    base = assertAllowedTarget(args.base);
  } catch (e) {
    fail((e as Error).message);
  }
  if (args.profile === "staging" && LOCAL_HOSTS.has(base.hostname)) {
    console.warn(
      "load: the staging profile (thousands of RPS) is meant for staging; on a laptop it measures the laptop."
    );
  }

  // URL lists. Premium: real premium pages once the paywall manifest exists (stream L); until then a sample of
  // articles (3+ path segments) fetched with a pro cookie, which exercises cookie verification at the edge.
  const free = builtPages();
  const premiumEnv = process.env.PREMIUM_URLS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const premium = premiumEnv?.length ? premiumEnv : free.filter((u) => u.split("/").length >= 4);
  fs.mkdirSync(GENERATED, { recursive: true });
  fs.mkdirSync(RESULTS, { recursive: true });
  fs.writeFileSync(
    path.join(GENERATED, "urls.json"),
    JSON.stringify({ free, premium, premiumIsReal: !!premiumEnv?.length })
  );
  console.log(
    `load: ${free.length} free pages, ${premium.length} premium-scenario pages${premiumEnv?.length ? "" : " (free articles: no premium pages on this base yet)"}`
  );

  // Entitlement cookie, signed by the edge helper. The premium scenario is short (≤ 5 min), well inside the
  // 15-minute token lifetime.
  const secret = process.env.ENTITLEMENT_SECRET || testKey();
  const key = parseKey(secret) ?? fail("ENTITLEMENT_SECRET is malformed (expected <kid>:<base64url 256-bit key>)");
  const cookie = await signEntitlement({ sub: "load-test-user", tier: "pro", role: "user", v: 1 }, key);

  let server: ChildProcess | undefined;
  if (!(await portOpen(base))) {
    if (!args.start || !LOCAL_HOSTS.has(base.hostname))
      fail(`Nothing is listening on ${base.origin}. Start \`npm run preview -w web\` first.`);
    server = startPreview(base, secret);
    await waitForHttp(base, 120_000);
  } else if (!process.env.ENTITLEMENT_SECRET) {
    console.warn(
      "load: using an already-running server; set ENTITLEMENT_SECRET to the Worker's key or the pro cookie won't verify."
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const summaryFile = path.join(RESULTS, `${args.profile}-${stamp}.json`);
  const env = {
    BASE_URL: base.origin,
    PROFILE: args.profile,
    SCENARIOS: args.scenarios.join(","),
    URLS_FILE: path.join(GENERATED, "urls.json"),
    ENT_COOKIE: cookie,
    SUMMARY_FILE: summaryFile,
    ...(process.env.LOAD_ALLOW_HOST ? { LOAD_ALLOW_HOST: process.env.LOAD_ALLOW_HOST } : {}),
    ...(process.env.LOAD_SCALE ? { LOAD_SCALE: process.env.LOAD_SCALE } : {}),
  };
  const { cmd, args: k6Args } = k6Command(base, env);
  console.log(
    `load: ${cmd === "k6" ? "k6" : `k6 (${K6_IMAGE} in Docker)`} → ${base.origin}, profile ${args.profile}, scenarios ${args.scenarios.join(", ")}`
  );

  const code = await new Promise<number>((resolve) => {
    const child = spawn(cmd, k6Args, { cwd: WEB_ROOT, stdio: "inherit" });
    child.on("exit", (c) => resolve(c ?? 1));
  });

  if (server?.pid) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      // already gone
    }
  }

  let driftOk = true;
  if (fs.existsSync(summaryFile)) {
    const summary = JSON.parse(fs.readFileSync(summaryFile, "utf8")) as { soak_drift?: { stable: boolean } };
    driftOk = summary.soak_drift?.stable ?? true;
    console.log(`load: summary written to ${path.relative(WEB_ROOT, summaryFile)}`);
  }
  if (!driftOk) console.error("load: soak latency drifted (late p95 > 1.25 × early p95 + 10 ms)");
  process.exit(code !== 0 ? code : driftOk ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  void main();
}
