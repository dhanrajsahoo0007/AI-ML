import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A home search site, built one requirement at a time (zillow case study, the hero).
// Seven steps: 1 a listing store and page: the listing service reads one listing from the primary DB, and a first
// search is a lat/lng BETWEEN query on the same DB (replaced in step 2) · 2 search in a search engine: the search
// service sends the viewport and filters to a search index, filled by a nightly copy (replaced in step 3) · 3 the
// ingest pipeline: listing feeds reach the ingest service (dedup, normalise), which upserts the primary DB; change
// data capture puts every change on the change log; the indexer upserts the search index by version · 4 the
// zoomed-out map: the same query returns counts per cell instead of pins (the step-2/3 edge label changes) · 5 photos:
// ingest resizes photos into the photo store; buyers load them from the CDN, which pulls from the store · 6 saved-search
// alerts: the saved-search service writes saved searches to the primary DB; through the change log the indexer
// registers them in the query index and percolates every new or changed listing against them; matches go back on
// the log and the saved-search service sends the push or email · 7 caching popular viewports: the search service
// reads per-tile results from the viewport cache first.
// Working (round numbers chosen to size the system): 20,000,000 daily buyers × 10 map queries = 200,000,000/day
// ÷ 86,400 s ≈ 2,300/s, peak 3 × ≈ 7,000/s. Listing changes: 50,000 new + 250,000 updates = 300,000/day ≈ 3.5/s,
// so reads outnumber writes about 660 to 1 on average. Index: 2,000,000 active + 3,000,000 sold = 5,000,000 docs
// × 5 KB = 25 GB. Photos: 30 a listing × 2 MB in all sizes = 60 MB; × 5,000,000 listings = 300 TB.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts, core renamed "Search core". Clients: buyer 180, feeds
// 480. Edge column x 297: API gateway 180, CDN 620. Core x 575: search service (accent) 175. Services x 575: listing
// 400, saved-search 510, ingest 620. Async x 879: indexer 255, change log 365. Storage x 1098 (glyphs): viewport cache
// 115, search index 220, query index 330, primary DB 450, photo store 600. gw → listing and gw → saved-search run down
// the gap at x 392 to 440; the nightly copy runs up the right margin (x 1165); the services reach the primary DB below
// the change log; the CDN's origin pull runs along the bottom margin (y 712). Every long edge was checked against the
// boxes it passes.
// Colours: zones from the preset; pastel blocks; the one accent is the search service.

const spec: DiagramSpec = {
  title: "Home search high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "A listing store and page", covers: "F2" },
    { title: "Search in a search engine", covers: "F1" },
    { title: "Ingest from listing feeds", covers: "F3, N2" },
    { title: "Counts per cell when zoomed out", covers: "F1, N1" },
    { title: "Photos behind a CDN", covers: "F2" },
    { title: "Saved-search alerts", covers: "F4, N3" },
    { title: "Cache popular viewports", covers: "N1, N4" },
  ],
  zones: zoneFrame({ core: "Search core" }),
  nodes: [
    { id: "buyer", label: "Buyer", sub: "web / app", icon: "phone", fill: "pastel", x: 105, y: 180, w: 140 },
    {
      id: "feeds",
      label: "Listing feeds",
      sub: "MLS, brokers",
      icon: "feed",
      fill: "pastel",
      step: 3,
      x: 105,
      y: 480,
      w: 150,
    },
    {
      id: "gw",
      label: "API gateway",
      sub: "L7 LB, auth",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 180,
      w: 150,
    },
    {
      id: "cdn",
      label: "CDN",
      sub: "photos, scripts",
      icon: "cdn",
      tone: "blue",
      fill: "pastel",
      step: 5,
      x: 297,
      y: 620,
      w: 150,
    },
    {
      id: "search",
      label: "Search service",
      sub: "viewport + filters",
      icon: "search",
      tone: "green",
      accent: true,
      step: 2,
      x: 575,
      y: 175,
      w: 220,
    },
    {
      id: "listing",
      label: "Listing service",
      sub: "listing page",
      icon: "building",
      tone: "teal",
      fill: "pastel",
      x: 575,
      y: 400,
      w: 200,
    },
    {
      id: "ingest",
      label: "Ingest service",
      sub: "dedup, normalise",
      icon: "pipeline",
      tone: "teal",
      fill: "pastel",
      step: 3,
      x: 575,
      y: 620,
      w: 200,
    },
    {
      id: "saved",
      label: "Saved-search service",
      sub: "save, notify",
      icon: "bell",
      tone: "teal",
      fill: "pastel",
      step: 6,
      x: 575,
      y: 510,
      w: 220,
    },
    {
      id: "indexer",
      label: "Indexer",
      sub: "upsert, percolate",
      icon: "workers",
      tone: "orange",
      fill: "pastel",
      step: 3,
      x: 879,
      y: 255,
      w: 180,
    },
    {
      id: "log",
      label: "Change log",
      sub: "CDC, by listing",
      icon: "topic",
      tone: "orange",
      fill: "pastel",
      step: 3,
      x: 879,
      y: 365,
      w: 180,
    },
    {
      id: "cache",
      label: "Viewport cache",
      sub: "per tile, 60 s",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 7,
      x: 1098,
      y: 115,
    },
    {
      id: "index",
      label: "Search index",
      sub: "geo + filters",
      icon: "search",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 1098,
      y: 220,
    },
    {
      id: "db",
      label: "Primary DB",
      sub: "listings, searches",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 450,
    },
    {
      id: "queries",
      label: "Query index",
      sub: "saved searches",
      icon: "search",
      tone: "violet",
      variant: "glyph",
      step: 6,
      x: 1098,
      y: 330,
    },
    {
      id: "photos",
      label: "Photo store",
      sub: "blob, 300 TB",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: 1098,
      y: 600,
    },
  ],
  edges: [
    { from: "buyer", to: "gw", label: "calls", flow: true, packet: true },
    {
      from: "gw",
      to: "listing",
      label: "listing page",
      via: [[440, 400]],
      labelAt: 0.35,
      flow: true,
      packet: true,
      delay: 0.3,
    },
    { from: "listing", to: "db", label: "lat/lng BETWEEN", tone: "red", until: 1 },
    { from: "listing", to: "db", label: "listing by id", dashed: true, labelAt: 0.6, step: 2 },

    { from: "gw", to: "search", label: "viewport", flow: true, packet: true, delay: 0.2, step: 2 },
    { from: "search", to: "index", label: "geo + filters", flow: true, packet: true, delay: 0.5, step: 2, until: 3 },
    {
      from: "db",
      to: "index",
      label: "nightly copy",
      via: [
        [1165, 450],
        [1165, 220],
      ],
      dashed: true,
      step: 2,
      until: 2,
    },

    { from: "feeds", to: "ingest", label: "feed files", flow: true, packet: true, step: 3 },
    {
      from: "ingest",
      to: "db",
      label: "upsert",
      labelAt: 0.35,
      flow: true,
      packet: true,
      delay: 0.3,
      step: 3,
    },
    { from: "db", to: "log", label: "CDC", step: 3 },
    { from: "log", to: "indexer", step: 3 },
    { from: "indexer", to: "index", label: "by version", step: 3 },

    { from: "search", to: "index", label: "pins or counts", flow: true, packet: true, delay: 0.5, step: 4 },

    { from: "buyer", to: "cdn", label: "photos", dashed: true, labelAt: 0.75, step: 5 },
    { from: "ingest", to: "photos", label: "resize", dashed: true, labelAt: 0.6, step: 5 },
    {
      from: "cdn",
      to: "photos",
      label: "origin pull",
      via: [
        [297, 712],
        [1165, 712],
        [1165, 600],
      ],
      labelAt: 0.45,
      dashed: true,
      step: 5,
    },

    { from: "gw", to: "saved", label: "save search", via: [[392, 510]], labelAt: 0.75, step: 6 },
    { from: "saved", to: "db", label: "search row", labelAt: 0.3, step: 6 },
    { from: "indexer", to: "queries", label: "percolate", labelAt: 0.6, step: 6 },
    { from: "log", to: "saved", label: "matches", step: 6 },
    { from: "saved", to: "buyer", label: "push, email", via: [[105, 300]], labelAt: 0.4, dashed: true, step: 6 },

    { from: "search", to: "cache", label: "tiles first", step: 7 },
  ],
};

export default spec;
