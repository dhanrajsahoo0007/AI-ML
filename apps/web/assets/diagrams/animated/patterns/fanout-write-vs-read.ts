import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// Fan-out on write, the read path, and fan-out on read for one very large account (fan-out, the Architecture figure).
// Brightpost shoppers follow sellers and see their posts (deals, restocks) in a feed.
// Four steps: 1 a seller with 300 followers posts; the post service stores the full post once · 2 fan-out on write:
// the post id goes on a queue and workers append it to each follower's feed list, 300 writes · 3 a shopper opens the
// feed: one read of their id list, then the posts are fetched by id · 4 the Brightpost Deals account has 2,000,000
// followers, so its posts skip the workers and go to a per-author recent-posts store that the feed service merges at
// read time (the hybrid).
// Working: 2,000,000 followers = every daily shopper (presets/patterns.ts SHOP.shoppersPerDay); 300 followers for an
// ordinary seller is illustrative.
// Layout (880 × 440): write path along the top row, stores in the middle row, read path along the bottom row.
// Colours (PATTERN_TONE): seller, Deals account and shopper orange (traffic), services teal (compute), stores violet,
// the fan-out workers green (the pattern), the queue neutral (plumbing).

const SELLER_FOLLOWERS = 300;

const spec: DiagramSpec = {
  title: "Fan-out on write, and on read for a large account",
  width: 880,
  height: 440,
  steps: [
    { title: "A seller posts" },
    { title: "Fan-out on write" },
    { title: "Reading the feed" },
    { title: "A huge account: fan-out on read" },
  ],
  zones: [],
  nodes: [
    {
      id: "seller",
      label: "Seller",
      sub: `${SELLER_FOLLOWERS} followers`,
      icon: "users",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 90,
      y: 70,
      w: 150,
    },
    {
      id: "post",
      label: "Post service",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 290,
      y: 70,
      w: 150,
    },
    {
      id: "posts",
      label: "Posts DB",
      sub: "full posts, once",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 290,
      y: 220,
      w: 150,
    },
    {
      id: "queue",
      label: "Fan-out queue",
      icon: "queue",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      step: 2,
      x: 530,
      y: 70,
      w: 150,
    },
    {
      id: "workers",
      label: "Fan-out workers",
      icon: "workers",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 2,
      x: 755,
      y: 70,
      w: 170,
    },
    {
      id: "feeds",
      label: "Feed cache",
      sub: "id list per shopper",
      icon: "cache",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 2,
      x: 755,
      y: 220,
      w: 170,
    },
    {
      id: "shopper",
      label: "Shopper",
      sub: "opens the feed",
      icon: "phone",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      step: 3,
      x: 90,
      y: 370,
      w: 150,
    },
    {
      id: "feed",
      label: "Feed service",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 3,
      x: 500,
      y: 370,
      w: 150,
    },
    {
      id: "deals",
      label: "Deals account",
      sub: `${n(SHOP.shoppersPerDay)} followers`,
      icon: "users",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      step: 4,
      x: 100,
      y: 220,
      w: 180,
    },
    {
      id: "recent",
      label: "Recent posts",
      sub: "per large author",
      icon: "cache",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 4,
      x: 500,
      y: 220,
      w: 150,
    },
  ],
  edges: [
    { from: "seller", to: "post", packet: true },
    { from: "post", to: "posts", label: "store" },
    { from: "post", to: "queue", label: "post id", packet: true, step: 2 },
    { from: "queue", to: "workers", packet: true, step: 2 },
    { from: "workers", to: "feeds", label: `${SELLER_FOLLOWERS} appends`, packet: true, step: 2 },
    { from: "shopper", to: "feed", label: "open feed", packet: true, step: 3 },
    { from: "feed", to: "feeds", label: "1 read: ids", step: 3 },
    { from: "feed", to: "posts", label: "posts by id", step: 3 },
    { from: "deals", to: "post", label: "no fan-out", packet: true, step: 4 },
    { from: "post", to: "recent", step: 4 },
    { from: "feed", to: "recent", label: "merge at read", step: 4 },
  ],
};

export default spec;
