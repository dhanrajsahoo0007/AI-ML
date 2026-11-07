// k6 load and concurrency tests (plan §12.6). Run through the runner, not directly:
//   npm run load:local -w web            laptop rates against `npm run preview -w web` (Workers runtime)
// The runner (tests/load/run.ts) builds the URL list from the build manifest, signs the `oa_ent` cookie with the
// edge helper and refuses any host that isn't local. See tests/load/README.md.
//
// Env (set by the runner):
//   BASE_URL       target origin (local only unless LOAD_ALLOW_HOST names it exactly)
//   PROFILE        "local" (laptop rates, default) or "staging" (the §12.6 rates)
//   SCENARIOS      comma list; default: every scenario of the profile
//   URLS_FILE      JSON { free: string[], premium: string[], premiumIsReal: boolean }
//   ENT_COOKIE     signed `oa_ent` value for the entitled-premium scenario (tier=pro)
//   LOAD_SCALE     local profile only: multiply every rate (default 1)
import http from "k6/http";
import { check } from "k6";
import { Rate, Trend } from "k6/metrics";
import exec from "k6/execution";

// ── Target guard: never load anything but localhost (AGENTS.md; plan §12.6 staging runs are opt-in) ─────────────
const BASE_URL = (__ENV.BASE_URL || "http://localhost:8787").replace(/\/+$/, "");
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]", "host.docker.internal"];
const hostname = BASE_URL.replace(/^https?:\/\//, "")
  .split("/")[0]
  .replace(/:\d+$/, "");
if (!LOCAL_HOSTS.includes(hostname) && __ENV.LOAD_ALLOW_HOST !== hostname) {
  throw new Error(
    `Refusing to load ${hostname}: only localhost is allowed (set LOAD_ALLOW_HOST=${hostname} to opt in).`
  );
}

const PROFILE = __ENV.PROFILE === "staging" ? "staging" : "local";
const URLS = JSON.parse(open(__ENV.URLS_FILE || "../../.generated/load/urls.json"));
const ENT_COOKIE = __ENV.ENT_COOKIE || "";

// ── Scenario shapes per profile ───────────────────────────────────────────────────────────────────────────────────
// staging = plan §12.6. local = the same shapes scaled for a laptop running workerd, run back to back (startTime)
// so one scenario's latency isn't another's load.
const SHAPES = {
  staging: {
    free_pages: {
      kind: "ramp",
      stages: [
        { target: 2000, duration: "2m" },
        { target: 2000, duration: "10m" },
      ],
      vus: 2000,
    },
    premium_pages: { kind: "constant", rate: 300, duration: "5m", vus: 400 },
    auth: { kind: "constant", rate: 20, duration: "5m", vus: 60 },
    spike: {
      kind: "ramp",
      stages: [
        { target: 5000, duration: "30s" },
        { target: 5000, duration: "30s" },
        { target: 0, duration: "10s" },
      ],
      vus: 5000,
    },
    soak: { kind: "constant", rate: 200, duration: "2h", vus: 300 },
  },
  local: {
    free_pages: {
      kind: "ramp",
      stages: [
        { target: 40, duration: "20s" },
        { target: 40, duration: "40s" },
      ],
      vus: 80,
    },
    premium_pages: { kind: "constant", rate: 20, duration: "30s", vus: 40 },
    auth: { kind: "constant", rate: 2, duration: "30s", vus: 10 },
    spike: {
      kind: "ramp",
      stages: [
        { target: 100, duration: "10s" },
        { target: 100, duration: "10s" },
        { target: 0, duration: "5s" },
      ],
      vus: 200,
    },
    soak: { kind: "constant", rate: 15, duration: "90s", vus: 40 },
  },
};

// Plan §12.6 pass criteria. Latency/error thresholds are the same for both profiles; the edge-cache hit ratio
// only exists behind Cloudflare, so it's enforced on staging only.
const THRESHOLDS = {
  free_pages: { p95: 150, errors: 0.001 },
  premium_pages: { p95: 200, errors: 0.001 },
  auth: { p95: 800, errors: 0.01 },
  // "No errors" is the pass criterion; the latency bound only makes the spike's p95/p99 show in the summary.
  spike: { p95: 1000, errors: 0 },
  soak: { p95: 150, errors: 0.001 },
};

// TODO(stream L, billing): webhook_storm. Replay signed Dodo fixtures (tests/fixtures/billing/*) at 50 RPS for 2 min
// with 30% duplicates (same webhook-id); pass = every event processed exactly once (count rows in the webhook
// event table after the run), final subscription states match the fixtures, p95 < 500 ms. Billing isn't on this
// base yet (no /api/webhooks/dodo route), so the scenario is not defined.

const ORDER = ["free_pages", "premium_pages", "auth", "spike", "soak"];
const wanted = (__ENV.SCENARIOS || ORDER.join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
for (const name of wanted)
  if (!ORDER.includes(name)) throw new Error(`Unknown scenario ${name} (known: ${ORDER.join(", ")})`);

// LOAD_SCALE multiplies the local profile's rates (capacity probing on a laptop, e.g. LOAD_SCALE=10).
const SCALE = Number(__ENV.LOAD_SCALE || 1);
if (!(SCALE > 0)) throw new Error("LOAD_SCALE must be a positive number");
if (PROFILE === "local" && SCALE !== 1) {
  for (const shape of Object.values(SHAPES.local)) {
    shape.vus = Math.ceil(shape.vus * SCALE);
    if (shape.kind === "ramp")
      shape.stages = shape.stages.map((st) => ({ ...st, target: Math.ceil(st.target * SCALE) }));
    else shape.rate = Math.ceil(shape.rate * SCALE);
  }
}

function seconds(d) {
  const m = /^(\d+)(s|m|h)$/.exec(d);
  return Number(m[1]) * { s: 1, m: 60, h: 3600 }[m[2]];
}
const totalSeconds = (shape) =>
  shape.kind === "ramp" ? shape.stages.reduce((n, s) => n + seconds(s.duration), 0) : seconds(shape.duration);

function scenario(name, startSec) {
  const shape = SHAPES[PROFILE][name];
  const base = {
    exec: name,
    startTime: `${startSec}s`,
    preAllocatedVUs: Math.ceil(shape.vus / 4),
    maxVUs: shape.vus,
    timeUnit: "1s",
    tags: { scenario: name },
  };
  return shape.kind === "ramp"
    ? { ...base, executor: "ramping-arrival-rate", startRate: 0, stages: shape.stages }
    : { ...base, executor: "constant-arrival-rate", rate: shape.rate, duration: shape.duration };
}

const scenarios = {};
const thresholds = {};
let start = 0;
for (const name of ORDER.filter((n) => wanted.includes(n))) {
  scenarios[name] = scenario(name, start);
  start += totalSeconds(SHAPES[PROFILE][name]) + 5; // 5 s gap so the next scenario starts on an idle server
  const t = THRESHOLDS[name];
  thresholds[`http_req_failed{scenario:${name}}`] = [t.errors === 0 ? "rate==0" : `rate<${t.errors}`];
  if (t.p95) thresholds[`http_req_duration{scenario:${name}}`] = [`p(95)<${t.p95}`];
  thresholds[`checks{scenario:${name}}`] = ["rate>0.999"];
  thresholds[`http_reqs{scenario:${name}}`] = ["count>0"]; // also makes the per-scenario count show in the summary
}
if (PROFILE === "staging" && wanted.includes("free_pages"))
  thresholds["edge_cache_hit{scenario:free_pages}"] = ["rate>=0.95"];

export const options = {
  scenarios,
  thresholds,
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
  userAgent: "origins-load-test/1.0 (k6; local)",
};

// ── Metrics ───────────────────────────────────────────────────────────────────────────────────────────────────────
const edgeCacheHit = new Rate("edge_cache_hit");
// Soak drift: the same latency split into the first and last fifth of the run (handleSummary compares them).
const soakEarly = new Trend("soak_early_duration", true);
const soakLate = new Trend("soak_late_duration", true);

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function getPage(path, params = {}) {
  const res = http.get(`${BASE_URL}${path}`, {
    ...params,
    tags: { ...(params.tags || {}), route: routeOf(path) },
    redirects: 0,
  });
  const cache = res.headers["Cf-Cache-Status"];
  if (cache) edgeCacheHit.add(cache === "HIT");
  return res;
}

/** Low-cardinality route tag: section + depth, not the full URL. */
function routeOf(path) {
  const parts = path.split("/").filter(Boolean);
  return parts.length === 0 ? "/" : `/${parts[0]}${parts.length > 1 ? `/*${parts.length > 2 ? "/*" : ""}` : ""}`;
}

const isHtmlPage = (r) =>
  r.status === 200 && /text\/html/.test(r.headers["Content-Type"] || "") && r.body && r.body.includes("<h1");

// ── Scenarios ─────────────────────────────────────────────────────────────────────────────────────────────────────
export function free_pages() {
  const res = getPage(pick(URLS.free));
  check(res, { "free page 200 + html": isHtmlPage, "no session cookie set": (r) => !r.headers["Set-Cookie"] });
}

export function premium_pages() {
  const res = getPage(pick(URLS.premium), { cookies: { oa_ent: ENT_COOKIE } });
  check(res, {
    "entitled page 200 + html": isHtmlPage,
    // Entitled HTML must never be stored by a shared cache (plan §9.2). Only meaningful once real premium pages
    // exist (URLS.premiumIsReal); until then these are free articles fetched with a pro cookie.
    "entitled response not publicly cacheable": (r) =>
      !URLS.premiumIsReal || !/public/.test(r.headers["Cache-Control"] || ""),
  });
}

export function auth() {
  // Sign-in page (server-rendered, dynamic) + the session lookup the profile menu makes. Anonymous: with no
  // session cookie Better Auth answers without a database read.
  const page = getPage("/sign-in");
  const session = http.get(`${BASE_URL}/api/auth/get-session`, { tags: { route: "/api/auth/get-session" } });
  check(page, { "sign-in 200": (r) => r.status === 200 });
  check(session, { "get-session 200": (r) => r.status === 200 });
  // TODO(stream L): POST /api/entitlements/refresh with a signed-in test session (test-login provider, plan §12.3)
  // once the refresh endpoint exists; p95 < 800 ms and the Hyperdrive pool must not saturate.
}

export function spike() {
  const res = getPage(pick(URLS.free));
  check(res, { "spike page 200": (r) => r.status === 200 });
}

export function soak() {
  const res = getPage(pick(URLS.free));
  check(res, { "soak page 200": (r) => r.status === 200 });
  const total = totalSeconds(SHAPES[PROFILE].soak);
  const elapsed = (Date.now() - exec.scenario.startTime) / 1000;
  if (elapsed < total / 5) soakEarly.add(res.timings.duration);
  else if (elapsed > (total * 4) / 5) soakLate.add(res.timings.duration);
}

// ── Summary: per-scenario p95/p99 + error rate, soak drift; the runner prints and stores it ─────────────────────────
export function handleSummary(data) {
  const m = data.metrics;
  const out = { profile: PROFILE, baseUrl: BASE_URL, scenarios: {} };
  for (const name of Object.keys(scenarios)) {
    const d = m[`http_req_duration{scenario:${name}}`];
    const f = m[`http_req_failed{scenario:${name}}`];
    const n = m[`http_reqs{scenario:${name}}`];
    const count = n ? n.values.count : 0;
    out.scenarios[name] = {
      requests: count,
      rps: round(count / totalSeconds(SHAPES[PROFILE][name])),
      p95_ms: d ? round(d.values["p(95)"]) : null,
      p99_ms: d ? round(d.values["p(99)"]) : null,
      max_ms: d ? round(d.values.max) : null,
      error_rate: f ? f.values.rate : null,
    };
  }
  if (m.soak_early_duration && m.soak_late_duration) {
    const early = m.soak_early_duration.values["p(95)"];
    const late = m.soak_late_duration.values["p(95)"];
    // "No error drift or memory growth; stable latency": late p95 within 25% (+10 ms of noise) of early p95.
    out.soak_drift = { early_p95_ms: round(early), late_p95_ms: round(late), stable: late <= early * 1.25 + 10 };
  }
  out.thresholds_ok = Object.values(m).every(
    (metric) => !metric.thresholds || Object.values(metric.thresholds).every((t) => t.ok)
  );
  const json = JSON.stringify(out, null, 2);
  return { stdout: `\n${json}\n`, [__ENV.SUMMARY_FILE || "summary.json"]: json };
}

const round = (n) => (n == null ? null : Math.round(n * 10) / 10);
