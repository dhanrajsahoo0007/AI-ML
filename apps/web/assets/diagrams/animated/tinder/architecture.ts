import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A dating app, built one requirement at a time (tinder case study, the hero).
// Eight steps: 1 profiles and a naive deck: the profile service scans every profile row by distance · 2 a geo index:
// profile changes flow from the profile DB through the event log into a search index sharded by cell, and the recs
// service queries it (the step-1 scan goes away) · 3 swipes: the swipe service appends every swipe to a wide-column
// swipe log and to the event log · 4 never show twice: a consumer adds each swipe to the swiper's seen filter in the
// cache, and the recs service drops seen ids · 5 the match: a right swipe sets one flag on the pair's row in the likes
// store, atomically, and reads the other flag · 6 real-time push: the match notifier reads match events and nudges
// the app through the socket gateway (offline apps get a mobile push, drawn in tinder/nudge-push) · 7 location
// updates: the location service publishes a new cell; when the cell's shard changes the indexer deletes the profile
// from the old shard and inserts it in the new one · 8 ranking: the ranker scores the 1,000 retrieved candidates and
// keeps 50.
// Working (round numbers chosen to size the system): 50,000,000 daily users × 100 swipes = 5,000,000,000 swipes a day
// ÷ 86,400 s ≈ 58,000/s, peak 2.5 × ≈ 145,000/s. 30 % are likes: 1,500,000,000/day ≈ 17,400/s. 2 % of likes complete
// a match: 30,000,000/day ≈ 350/s. 2 decks of 50 per user a day: 100,000,000 deck builds/day ≈ 1,160/s.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts, core renamed "Swipe and match". Clients: the user
// (y 370). Edge column x 297: socket gateway 140, API gateway 370, CDN 600. Core: the swipe service (accent) at
// 575, 215. Services column x 575 (h 52): recs 385, ranker 465, profile 545, location 625. Async column x 879: match
// notifier 105, event log 300. Storage column x 1098: likes 140, swipe log 255, cache 370, geo index 485, profile DB
// 605. gw → profile and gw → location run down the gap at x 385–395; the profile DB and the location service reach
// the event log from below; the swipe and recs edges pass between the two async nodes.
// Colours: zones from the preset; pastel blocks; the one accent is the swipe service.

const spec: DiagramSpec = {
  title: "Dating app high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "Profiles and a naive deck", covers: "F1, F2" },
    { title: "A geo index sharded by cell", covers: "F2" },
    { title: "Swipes into a write-optimised log", covers: "F3" },
    { title: "Never show a profile twice", covers: "F2" },
    { title: "A match on a mutual like", covers: "F4" },
    { title: "Push the match in real time", covers: "F4" },
    { title: "People move between shards", covers: "F5" },
    { title: "Rank the candidates", covers: "F2" },
  ],
  zones: zoneFrame({ core: "Swipe and match" }),
  nodes: [
    { id: "user", label: "User", sub: "mobile app", icon: "phone", fill: "pastel", x: 105, y: 370, w: 140 },
    {
      id: "sock",
      label: "Socket gateway",
      sub: "WebSocket, nudges",
      icon: "signal",
      tone: "blue",
      fill: "pastel",
      step: 6,
      x: 297,
      y: 140,
      w: 166,
    },
    {
      id: "gw",
      label: "API gateway",
      sub: "auth, limits",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 370,
      w: 150,
    },
    {
      id: "cdn",
      label: "CDN",
      sub: "photos from blob",
      icon: "cdn",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 600,
      w: 150,
    },
    {
      id: "swipe",
      label: "Swipe service",
      sub: "log, match check",
      icon: "users",
      tone: "green",
      accent: true,
      step: 3,
      x: 575,
      y: 215,
      w: 220,
    },
    {
      id: "recs",
      label: "Recs service",
      sub: "nearby, not seen",
      icon: "feed",
      tone: "teal",
      fill: "pastel",
      step: 2,
      x: 575,
      y: 385,
      w: 200,
      h: 52,
    },
    {
      id: "ranker",
      label: "Ranker",
      sub: "score, keep 50",
      icon: "chart",
      tone: "teal",
      fill: "pastel",
      step: 8,
      x: 575,
      y: 465,
      w: 200,
      h: 52,
    },
    {
      id: "profile",
      label: "Profile service",
      sub: "profile, prefs",
      icon: "image",
      tone: "teal",
      fill: "pastel",
      x: 575,
      y: 545,
      w: 200,
      h: 52,
    },
    {
      id: "location",
      label: "Location service",
      sub: "cell, shard moves",
      icon: "map",
      tone: "teal",
      fill: "pastel",
      step: 7,
      x: 575,
      y: 625,
      w: 200,
      h: 52,
    },
    {
      id: "notifier",
      label: "Match notifier",
      sub: "nudge or push",
      icon: "bell",
      tone: "orange",
      fill: "pastel",
      step: 6,
      x: 879,
      y: 105,
      w: 190,
    },
    {
      id: "log",
      label: "Event log",
      sub: "swipes, matches, index",
      icon: "topic",
      tone: "orange",
      fill: "pastel",
      step: 2,
      x: 879,
      y: 300,
      w: 190,
    },
    {
      id: "likes",
      label: "Likes + matches",
      sub: "pair rows, KV",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: 1098,
      y: 140,
    },
    {
      id: "swipes",
      label: "Swipe log",
      sub: "wide-column",
      icon: "log",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: 1098,
      y: 255,
    },
    {
      id: "cache",
      label: "Cache",
      sub: "seen filters",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 4,
      x: 1098,
      y: 370,
    },
    {
      id: "geo",
      label: "Geo index",
      sub: "search, geoshards",
      icon: "search",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 1098,
      y: 485,
    },
    {
      id: "profiledb",
      label: "Profile DB",
      sub: "relational",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 605,
    },
  ],
  edges: [
    { from: "user", to: "gw", label: "calls", flow: true, packet: true },
    { from: "user", to: "cdn", label: "photos", dashed: true },

    // Step 1: the deck is a scan of every profile row by distance; step 2 replaces both edges.
    { from: "gw", to: "profile", label: "profile, deck", via: [[395, 545]], flow: true, packet: true, until: 1 },
    { from: "profile", to: "profiledb", label: "scan all by distance", flow: true, packet: true, until: 1 },
    { from: "gw", to: "profile", label: "edit profile", via: [[395, 545]], step: 2 },
    { from: "profile", to: "profiledb", label: "profile rows", dashed: true, step: 2 },

    // Step 2: the geo index.
    { from: "gw", to: "recs", label: "get deck", flow: true, packet: true, delay: 0.3, step: 2 },
    { from: "recs", to: "geo", label: "geo query", flow: true, packet: true, delay: 0.6, step: 2 },
    { from: "profiledb", to: "log", label: "changes", via: [[960, 560]], labelAt: 0.2, step: 2 },
    { from: "log", to: "geo", label: "index by cell", labelAt: 0.6, step: 2 },

    // Step 3: swipes.
    { from: "gw", to: "swipe", label: "swipe", flow: true, packet: true, delay: 0.2, step: 3 },
    { from: "swipe", to: "swipes", label: "append", step: 3 },
    { from: "swipe", to: "log", label: "swipe event", step: 3 },

    // Step 4: the seen filter.
    { from: "log", to: "cache", label: "add to seen", labelAt: 0.4, step: 4 },
    { from: "recs", to: "cache", label: "drop seen", dashed: true, step: 4 },

    // Step 5: the match check on the pair's row.
    {
      from: "swipe",
      to: "likes",
      label: "pair row, atomic",
      labelAt: 0.8,
      flow: true,
      packet: true,
      delay: 0.5,
      step: 5,
    },

    // Step 6: push the match.
    { from: "log", to: "notifier", label: "match", labelAt: 0.45, step: 6 },
    { from: "notifier", to: "sock", label: "nudge user", flow: true, packet: true, step: 6 },
    { from: "sock", to: "user", label: "nudge", flow: true, packet: true, delay: 0.5, step: 6 },

    // Step 7: location updates.
    { from: "gw", to: "location", label: "location", via: [[385, 625]], step: 7 },
    { from: "location", to: "log", label: "new cell", via: [[800, 625]], step: 7 },

    // Step 8: ranking.
    { from: "recs", to: "ranker", step: 8 },
  ],
};

export default spec;
