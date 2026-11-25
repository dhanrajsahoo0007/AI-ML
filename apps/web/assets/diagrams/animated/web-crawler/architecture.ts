import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A polite web crawler, built one requirement at a time (web-crawler case study, the hero).
// Eight steps: 1 one loop: the frontier hands a URL to a fetcher, the fetcher downloads the page, the parser sends
// every link back to the frontier · 2 many fetchers on a shared queue: nothing stops 40 fetchers hitting one host at
// once (red, replaced in step 3) · 3 the URL frontier: priority queues in front, one queue per host behind, a heap of
// "next allowed time"; fetchers lease a URL only when its host is ready · 4 the URL-seen test (a Bloom filter) sits
// between the parser and the frontier; the direct parser-to-frontier edge goes away · 5 DNS and robots.txt caches
// beside the fetchers; the robots cache refreshes each host's rules at most once a day · 6 the content-seen test
// (exact hash + 64-bit simhash) runs before parsing; the direct fetcher-to-parser edge goes away · 7 raw pages go to
// the page store in 1 GB files; a page feed carries each fetch record to the indexer and the URL metadata store ·
// 8 the recrawl scheduler scans URL metadata for pages that are due and feeds them back into the frontier.
// Working (round numbers chosen to size the system): 2,000,000,000 pages in 30 days = 2,000,000,000 ÷ 2,592,000 s
// ≈ 772, about 770 pages/s; × 100 kB = 77 MB/s and 200 TB a crawl; × 40 links a page ≈ 31,000 URL checks/s;
// 10,000,000,000 known URLs × 10 bits = 12.5 GB of Bloom filter.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts, core renamed "Crawl core", edge "Fetch edge".
// Clients column x 105: seed URLs 110, websites (external) 450. Edge column x 297: DNS cache 230, fetchers 370,
// robots.txt cache 600. Core: the URL frontier (accent) at 575, 175. Services column x 575: content-seen 400,
// parser 520, URL-seen 630. Async column x 879: recrawl scheduler 120, page feed 300, indexer (downstream) 430.
// Storage column x 1098: page store 150, URL metadata 375, fingerprints 590.
// The URL-seen-to-frontier edge runs up x = 720, right of the services boxes (they end at x 680). Every long edge
// was checked against the boxes it passes: seeds → frontier passes above the DNS cache (y ≈ 135 at x 297);
// frontier → fetchers passes right of the DNS cache (x ≈ 447 at y 265); fetchers → page store passes between the
// core and services zones at x 575 (y ≈ 294) and between recrawl and the feed at x 879 (y ≈ 210); content-seen →
// fingerprints passes under the async zone at x 879 (y ≈ 516).
// Colours: zone tones; the frontier is the accent; the step-2 stampede on one host is the only red.

const spec: DiagramSpec = {
  title: "Web crawler high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "One loop: fetch, parse, enqueue", covers: "F1" },
    { title: "Many fetchers, no politeness", covers: "F1, N1" },
    { title: "The frontier: polite and prioritised", covers: "F2, F6" },
    { title: "The URL-seen test", covers: "F3" },
    { title: "DNS and robots.txt caches", covers: "F2" },
    { title: "The content-seen test", covers: "F3" },
    { title: "Store pages, feed the indexer", covers: "F4" },
    { title: "Recrawl by freshness", covers: "F5" },
  ],
  zones: zoneFrame({ core: "Crawl core", edge: "Fetch edge" }),
  nodes: [
    { id: "seeds", label: "Seed URLs", sub: "crawl start list", icon: "file", fill: "pastel", x: 105, y: 110, w: 140 },
    { id: "web", label: "Websites", sub: "external", icon: "globe", fill: "pastel", x: 105, y: 450, w: 140 },
    {
      id: "dns",
      label: "DNS cache",
      sub: "host to IP",
      icon: "dns",
      tone: "blue",
      fill: "pastel",
      step: 5,
      x: 297,
      y: 230,
      w: 150,
    },
    {
      id: "fetchers",
      label: "Fetchers",
      sub: "async HTTP",
      icon: "workers",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 370,
      w: 150,
    },
    {
      id: "robots",
      label: "robots.txt cache",
      sub: "rules, 24 h max",
      icon: "shield",
      tone: "blue",
      fill: "pastel",
      step: 5,
      x: 297,
      y: 600,
      w: 166,
    },
    {
      id: "frontier",
      label: "URL frontier",
      sub: "priority + per-host queues",
      icon: "queue",
      tone: "green",
      accent: true,
      x: 575,
      y: 175,
      w: 240,
    },
    {
      id: "content",
      label: "Content-seen test",
      sub: "hash + simhash",
      icon: "hash",
      tone: "teal",
      fill: "pastel",
      step: 6,
      x: 575,
      y: 400,
      w: 210,
    },
    {
      id: "parser",
      label: "Parser",
      sub: "extract links",
      icon: "file",
      tone: "teal",
      fill: "pastel",
      x: 575,
      y: 520,
      w: 210,
    },
    {
      id: "urlseen",
      label: "URL-seen test",
      sub: "Bloom filter",
      icon: "search",
      tone: "teal",
      fill: "pastel",
      step: 4,
      x: 575,
      y: 630,
      w: 210,
    },
    {
      id: "recrawl",
      label: "Recrawl scheduler",
      sub: "due by freshness",
      icon: "clock",
      tone: "orange",
      fill: "pastel",
      step: 8,
      x: 879,
      y: 120,
      w: 190,
    },
    {
      id: "feed",
      label: "Page feed",
      sub: "fetch records, log",
      icon: "topic",
      tone: "orange",
      fill: "pastel",
      step: 7,
      x: 879,
      y: 300,
      w: 190,
    },
    {
      id: "indexer",
      label: "Indexer",
      sub: "downstream",
      icon: "search",
      fill: "pastel",
      step: 7,
      x: 879,
      y: 430,
      w: 190,
    },
    {
      id: "pages",
      label: "Page store",
      sub: "1 GB files of pages",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 7,
      x: 1098,
      y: 150,
    },
    {
      id: "urldb",
      label: "URL metadata",
      sub: "status, next fetch",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 7,
      x: 1098,
      y: 375,
    },
    {
      id: "fps",
      label: "Fingerprints",
      sub: "64-bit simhash",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 6,
      x: 1098,
      y: 590,
    },
  ],
  edges: [
    { from: "seeds", to: "frontier", label: "seed URLs", flow: true, packet: true },
    { from: "frontier", to: "fetchers", label: "next URL", flow: true, packet: true, delay: 0.3, until: 2 },
    { from: "fetchers", to: "web", label: "GET page", flow: true, packet: true, delay: 0.6, until: 1 },
    { from: "fetchers", to: "parser", label: "HTML", flow: true, packet: true, delay: 0.9, until: 5 },
    { from: "parser", to: "frontier", label: "all links", dashed: true, labelAt: 0.3, until: 3 },

    { from: "fetchers", to: "web", label: "40 at once, one host", tone: "red", step: 2, until: 2 },

    {
      from: "frontier",
      to: "fetchers",
      label: "lease when host ready",
      flow: true,
      packet: true,
      delay: 0.3,
      step: 3,
    },
    { from: "fetchers", to: "web", label: "GET, one per host", flow: true, packet: true, delay: 0.6, step: 3 },

    { from: "parser", to: "urlseen", label: "links", step: 4 },
    {
      from: "urlseen",
      to: "frontier",
      label: "new URLs only",
      via: [
        [720, 630],
        [720, 175],
      ],
      labelAt: 0.7,
      step: 4,
    },

    { from: "fetchers", to: "dns", label: "resolve", dashed: true, step: 5 },
    { from: "fetchers", to: "robots", label: "allowed?", dashed: true, step: 5 },
    { from: "robots", to: "web", label: "robots.txt, daily", dashed: true, step: 5 },

    { from: "fetchers", to: "content", label: "page", flow: true, packet: true, delay: 0.9, step: 6 },
    { from: "content", to: "parser", label: "new only", step: 6 },
    { from: "content", to: "fps", label: "look up, add", dashed: true, step: 6 },

    { from: "fetchers", to: "pages", label: "raw page, gzip", labelAt: 0.72, step: 7 },
    { from: "content", to: "feed", label: "page record", step: 7 },
    { from: "feed", to: "indexer", label: "new pages", step: 7 },
    { from: "feed", to: "urldb", label: "fetch status", step: 7 },

    { from: "recrawl", to: "urldb", label: "scan due URLs", dashed: true, step: 8 },
    { from: "recrawl", to: "frontier", label: "recrawl", step: 8 },
  ],
};

export default spec;
