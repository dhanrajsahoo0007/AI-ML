import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A URL shortener, built one requirement at a time (url-shortener case study, the hero).
// Seven steps: 1 create and redirect on one database: the link service picks a random 7-character code and inserts it
// only if it is absent; the redirect service reads the code and answers 302 · 2 codes from one counter in a counter
// database, encoded in base 62 (every create calls it; replaced in step 3) · 3 an ID allocator hands each link-service
// instance a block of 1,000 ids; custom aliases use the same insert-if-absent · 4 a shared link cache on the read path
// (the step-1 read of the store becomes "on miss"); each redirect server also keeps the hottest codes in memory ·
// 5 click analytics: each redirect writes a click event to the click log; a counter job rolls clicks up per code per
// minute into the click store; a stats API reads it · 6 expiry and disabling: the link service deletes the cached
// entry when a link expires or is disabled · 7 abuse checks: every new destination is checked against a blocklist.
// Working (round numbers chosen to size the system): 100 M new links a month ÷ 2,592,000 s ≈ 39 creates/s (≈ 40);
// 10 B redirects a month ÷ 2,592,000 s ≈ 3,858 redirects/s (≈ 3,900): 100 reads per write. 62^7 ≈ 3.5 trillion codes.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts, core renamed "Redirect path". Clients column x 105:
// clicker 175, creator 520. Edge column x 297: load balancer 175 (so a click runs in one straight line to the
// redirect service), CDN 340, API gateway 520. Core: the redirect service
// (accent) at 575, 175. Services: link service 575, 380; ID allocator 490, 510 and abuse check 660, 510 side by side;
// stats API 575, 630. Async column x 879: click log 360, click counter 455. Storage column x 1098: link store 120, link
// cache 280, click store 440, counter DB 600.
// Routing: the step-2 counter call drops through x 575 (the gap the allocator and abuse check fill later; it is gone by
// then) and runs under them; allocator → counter DB drops below the abuse check first. Every long edge was checked
// against the boxes it passes (gateway → link service clears the allocator's top-left corner by 20 px).

const spec: DiagramSpec = {
  title: "URL shortener high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "Create and redirect on one database", covers: "F1, F2" },
    { title: "Codes from one counter", covers: "F1, N1" },
    { title: "A block of ids per server", covers: "F1, F3" },
    { title: "A cache on the read path", covers: "F2, N2" },
    { title: "Clicks as events", covers: "F5, N5" },
    { title: "Expiry and disabling", covers: "F4" },
    { title: "Abuse checks", covers: "N7" },
  ],
  zones: zoneFrame({ core: "Redirect path" }),
  nodes: [
    { id: "creator", label: "Creator", sub: "app / API key", icon: "browser", fill: "pastel", x: 105, y: 520, w: 140 },
    { id: "clicker", label: "Clicker", sub: "any browser", icon: "phone", fill: "pastel", x: 105, y: 175, w: 140 },
    {
      id: "cdn",
      label: "CDN",
      sub: "web app, scripts",
      icon: "cdn",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 340,
      w: 150,
    },
    {
      id: "gw",
      label: "API gateway",
      sub: "keys, limits",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 520,
      w: 150,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "layer 7, by path",
      icon: "load-balancer",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 175,
      w: 150,
    },
    {
      id: "redirect",
      label: "Redirect service",
      sub: "hot codes in memory, 302",
      icon: "link",
      tone: "green",
      accent: true,
      x: 575,
      y: 175,
      w: 230,
    },
    {
      id: "link",
      label: "Link service",
      sub: "create, alias, expiry",
      icon: "server",
      tone: "teal",
      fill: "pastel",
      x: 575,
      y: 380,
      w: 220,
    },
    {
      id: "alloc",
      label: "ID allocator",
      sub: "blocks of 1,000",
      icon: "hash",
      tone: "teal",
      fill: "pastel",
      step: 3,
      x: 490,
      y: 510,
      w: 150,
    },
    {
      id: "abuse",
      label: "Abuse check",
      sub: "blocklist, Bloom",
      icon: "shield",
      tone: "teal",
      fill: "pastel",
      step: 7,
      x: 660,
      y: 510,
      w: 150,
    },
    {
      id: "stats",
      label: "Stats API",
      sub: "clicks per link",
      icon: "chart",
      tone: "teal",
      fill: "pastel",
      step: 5,
      x: 575,
      y: 630,
      w: 200,
    },
    {
      id: "clicklog",
      label: "Click log",
      sub: "one event per click",
      icon: "topic",
      tone: "orange",
      fill: "pastel",
      step: 5,
      x: 879,
      y: 360,
      w: 190,
    },
    {
      id: "counter",
      label: "Click counter",
      sub: "per code, per minute",
      icon: "workers",
      tone: "orange",
      fill: "pastel",
      step: 5,
      x: 879,
      y: 455,
      w: 190,
    },
    {
      id: "store",
      label: "Link store",
      sub: "code → URL, by code",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 120,
    },
    {
      id: "cache",
      label: "Link cache",
      sub: "hot codes",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 4,
      x: 1098,
      y: 280,
    },
    {
      id: "clickdb",
      label: "Click store",
      sub: "counts by minute",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: 1098,
      y: 440,
    },
    {
      id: "counterdb",
      label: "Counter DB",
      sub: "next id",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 1098,
      y: 600,
    },
  ],
  edges: [
    // Step 1: create and redirect.
    { from: "creator", to: "gw", label: "create", flow: true, packet: true },
    { from: "creator", to: "cdn", label: "web app", dashed: true },
    { from: "gw", to: "link", label: "new link", flow: true, packet: true, delay: 0.4 },
    { from: "link", to: "store", label: "insert if absent", flow: true, packet: true, delay: 0.8, labelAt: 0.75 },
    { from: "clicker", to: "lb", label: "click", flow: true, packet: true },
    { from: "lb", to: "redirect", label: "redirect", flow: true, packet: true, delay: 0.4 },
    { from: "redirect", to: "store", label: "read by code", flow: true, packet: true, delay: 0.8, until: 3 },

    // Step 2: one counter for every create.
    { from: "link", to: "counterdb", label: "next id", step: 2, until: 2, via: [[575, 575]] },

    // Step 3: a block of ids per server.
    { from: "link", to: "alloc", label: "block", step: 3 },
    { from: "alloc", to: "counterdb", label: "+1,000", step: 3, via: [[490, 575]] },

    // Step 4: the cache on the read path.
    { from: "redirect", to: "cache", label: "GET code", flow: true, packet: true, delay: 0.8, step: 4, labelAt: 0.3 },
    { from: "redirect", to: "store", label: "on miss", dashed: true, step: 4 },

    // Step 5: clicks as events.
    { from: "redirect", to: "clicklog", label: "click event", dashed: true, step: 5 },
    { from: "clicklog", to: "counter", label: "read", step: 5 },
    { from: "counter", to: "clickdb", label: "rollups", step: 5 },
    { from: "gw", to: "stats", label: "stats", dashed: true, step: 5 },
    { from: "stats", to: "clickdb", label: "read counts", dashed: true, step: 5 },

    // Step 6: expiry and disabling.
    { from: "link", to: "cache", label: "delete key", dashed: true, step: 6, via: [[757, 318]] },

    // Step 7: abuse checks.
    { from: "link", to: "abuse", label: "check URL", step: 7 },
  ],
};

export default spec;
