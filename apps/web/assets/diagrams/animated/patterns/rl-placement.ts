import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// Where a rate limiter sits in Brightpost's API, added one part at a time (rate-limiting, the Architecture figure).
// Four steps: 1 no limit: shoppers and one scraper bot go straight to the 40 app servers; the bot's 1,000 requests a
// minute on one API key take capacity the shoppers need · 2 a limiter at the gateway checks every request against a
// counter in a shared store (one atomic script per request) and answers the bot with 429 and Retry-After · 3 the
// limits come from a rules store: per key, per endpoint, per tier · 4 a second, local limit inside each app server
// caps requests in flight per key, so the service protects itself even if the gateway is bypassed or down.
// Working: the limit is 100 requests a minute per key (the page's worked example); the bot sends 1,000 a minute
// (illustrative), so 100 pass and 900 get 429. Peak shopper traffic 2,300 requests/s (SHOP.peakReadsPerSecond). The
// in-flight cap of 20 per key is illustrative (Stripe's post uses 20 concurrent requests as its example).
// Layout (880 × 480): clients at x 100; the gateway column at x 380 (rules above, counter store below); app servers
// at x 690 with the local limit under them.
// Colours (PATTERN_TONE): clients orange (traffic), the gateway limiter green and the accent (the pattern), the
// local limit green pastel, rules and counter store violet (stores), app servers teal (compute).
// Fact check (2026-11-16, Stripe "Scaling your API with rate limiters"): Stripe runs a request rate limiter and a
// concurrent requests limiter, token bucket, in Redis; RFC 6585 §4: 429 "MAY include a Retry-After header".

const LIMIT = 100;
const BOT_PER_MIN = 1_000;

const spec: DiagramSpec = {
  title: "Where Brightpost's rate limiter sits",
  width: 880,
  height: 480,
  steps: [
    { title: "No limit: one key takes the capacity" },
    { title: "A limiter at the gateway" },
    { title: "Rules per key and tier" },
    { title: "A second limit inside the service" },
  ],
  zones: [],
  nodes: [
    {
      id: "shoppers",
      label: "Shoppers",
      sub: `${n(SHOP.peakReadsPerSecond)} req/s peak`,
      icon: "users",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 100,
      y: 140,
      w: 170,
    },
    {
      id: "bot",
      label: "Scraper bot",
      sub: "one API key",
      icon: "browser",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 100,
      y: 330,
      w: 170,
    },
    {
      id: "rules",
      label: "Limit rules",
      sub: "key, endpoint, tier",
      icon: "file",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 3,
      x: 380,
      y: 60,
      w: 190,
    },
    {
      id: "gateway",
      label: "Gateway limiter",
      sub: `${LIMIT} req/min per key`,
      icon: "gateway",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 2,
      x: 380,
      y: 235,
      w: 200,
    },
    {
      id: "counter",
      label: "Counter store",
      sub: "Redis, 60 s TTL",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 2,
      x: 380,
      y: 420,
      w: 190,
    },
    {
      id: "apps",
      label: `${SHOP.appServers} app servers`,
      sub: "Brightpost API",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 720,
      y: 235,
      w: 190,
    },
    {
      id: "local",
      label: "Local limit",
      sub: "20 in flight per key",
      icon: "meter",
      tone: PATTERN_TONE.pattern,
      fill: "pastel",
      step: 4,
      x: 720,
      y: 420,
      w: 190,
    },
  ],
  edges: [
    { from: "shoppers", to: "apps", label: "every request", packet: true, until: 1, labelAt: 0.35 },
    { from: "bot", to: "apps", label: `${n(BOT_PER_MIN)}/min`, packet: true, delay: 0.3, until: 1, labelAt: 0.35 },

    { from: "shoppers", to: "gateway", packet: true, step: 2 },
    { from: "bot", to: "gateway", label: `${n(BOT_PER_MIN)}/min`, packet: true, delay: 0.3, step: 2 },
    { from: "gateway", to: "counter", label: "INCR script", bidirectional: true, step: 2 },
    { from: "gateway", to: "apps", label: "allowed", packet: true, delay: 0.6, step: 2 },
    {
      from: "gateway",
      to: "bot",
      label: "429 + Retry-After",
      dashed: true,
      via: [[290, 350]],
      step: 2,
    },

    { from: "rules", to: "gateway", label: "limits", dashed: true, step: 3 },

    { from: "apps", to: "local", label: "check", bidirectional: true, step: 4 },
  ],
};

export default spec;
