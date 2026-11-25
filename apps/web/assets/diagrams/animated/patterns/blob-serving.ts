import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP } from "@/components/diagrams/presets/patterns";

// Brightpost's media path, built one part at a time (blob-storage-and-chunking, the Architecture figure).
// Five steps: 1 the before: the seller's video goes through the app servers into the database · 2 metadata in a
// database, bytes in an object store: the API hands back presigned URLs and the app uploads direct · 3 the store
// emits an "object created" event; a media worker makes thumbnails and renditions and marks the row ready ·
// 4 shoppers read images through a CDN; only misses reach the store · 5 a lifecycle rule moves old originals to an
// archive class.
// Working: 2,300 product page views/s at peak (SHOP) × 5 images a page (illustrative) = 11,500 image requests/s;
// with a 95 % CDN hit ratio (illustrative), 0.05 × 11,500 = 575 requests/s reach the store.
// Layout (880 × 470): three rows (y 80, 240, 400) and three columns (x 120, 440, 760): uploads on top, the object
// store in the middle, reads and archive at the bottom.
// Colours (PATTERN_TONE): the seller and shoppers orange (traffic), the API and the media worker teal (compute), the
// metadata database violet (store), the object store green (the pattern's own part, the accent) with the archive
// class green pastel, the CDN neutral (plumbing).
// Fact check (2026-11-16, CloudFront developer guide): origin access control lets an S3 bucket accept reads only from
// one CloudFront distribution, so viewers cannot bypass the CDN.

const IMAGES_PER_PAGE = 5;
const imageRps = SHOP.peakReadsPerSecond * IMAGES_PER_PAGE; // 11,500
const HIT = 0.95;
const originRps = Math.round(imageRps * (1 - HIT)); // 575

const spec: DiagramSpec = {
  title: "Brightpost's media path: upload direct, read through the CDN",
  width: 880,
  height: 470,
  steps: [
    { title: "Bytes through the app servers" },
    { title: "Metadata in a database, bytes direct" },
    { title: "An event marks the upload ready" },
    { title: "Shoppers read through the CDN" },
    { title: "Old originals move to archive" },
  ],
  zones: [],
  nodes: [
    {
      id: "seller",
      label: "Seller app",
      sub: "800 MB video",
      icon: "phone",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 120,
      y: 80,
      w: 170,
    },
    {
      id: "api",
      label: "Upload API",
      sub: "on app servers",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 440,
      y: 80,
      w: 180,
    },
    {
      id: "meta",
      label: "Metadata DB",
      sub: "key, size, status",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 760,
      y: 80,
      w: 190,
    },
    {
      id: "store",
      label: "Object store",
      sub: "bytes by key",
      icon: "blob",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 2,
      x: 440,
      y: 240,
      w: 180,
    },
    {
      id: "worker",
      label: "Media worker",
      sub: "thumbnails",
      icon: "workers",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 3,
      x: 760,
      y: 240,
      w: 190,
    },
    {
      id: "shopper",
      label: "Shoppers",
      sub: `${SHOP.peakReadsPerSecond.toLocaleString("en-GB")} pages/s`,
      icon: "users",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      step: 4,
      x: 120,
      y: 400,
      w: 170,
    },
    {
      id: "cdn",
      label: "CDN",
      sub: `${HIT * 100} % hits`,
      icon: "cdn",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      step: 4,
      x: 440,
      y: 400,
      w: 180,
    },
    {
      id: "archive",
      label: "Archive class",
      sub: "old originals",
      icon: "snapshot",
      tone: PATTERN_TONE.pattern,
      fill: "pastel",
      step: 5,
      x: 760,
      y: 400,
      w: 190,
    },
  ],
  edges: [
    // Step 1: the before.
    { from: "seller", to: "api", label: "800 MB upload", packet: true, until: 1 },
    { from: "api", to: "meta", label: "bytes in rows", packet: true, until: 1 },

    // Step 2: metadata in the database, bytes direct to the store.
    { from: "seller", to: "api", label: "ask: URLs", bidirectional: true, step: 2 },
    { from: "api", to: "meta", label: "row: pending", step: 2 },
    { from: "seller", to: "store", label: "PUT parts", packet: true, step: 2 },

    // Step 3: the event and the worker.
    { from: "store", to: "worker", label: "object created", dashed: true, flow: true, step: 3 },
    { from: "worker", to: "meta", label: "ready", step: 3 },

    // Step 4: reads through the CDN.
    { from: "shopper", to: "cdn", label: `${imageRps.toLocaleString("en-GB")} img/s`, packet: true, step: 4 },
    { from: "cdn", to: "store", label: `${originRps} misses/s`, packet: true, step: 4 },

    // Step 5: lifecycle.
    { from: "store", to: "archive", label: "after 180 days", dashed: true, step: 5 },
  ],
};

export default spec;
