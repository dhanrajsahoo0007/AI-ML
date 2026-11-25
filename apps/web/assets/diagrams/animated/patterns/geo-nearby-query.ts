import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Finding the nearest of Brightpost's 200 pick-up points to a shopper, built one part at a time (geospatial-indexing,
// the Architecture figure).
// Five steps: 1 no index: the app server reads all 200 rows and checks 200 distances (the "before") · 2 each point's
// geohash goes into a geo index (a sorted set) whenever a point is added or moved · 3 the cell cover turns the
// shopper's position into gcpvm plus its 8 neighbours: 9 key ranges · 4 the 17 candidates in those cells get an exact
// distance check; the nearest is 1.2 km away · 5 if nothing is within 3.0 km, widen the search and ask again.
// Working: 200 points over about 1,600 km² of London (illustrative) = 0.125 a km²; nine precision-5 cells of
// 3.0 km × 4.9 km = 133 km², so an even spread puts 0.125 × 133 = 16.6 points in them; the figure uses 17
// candidates and a nearest at 1.2 km (illustrative). 17 distance checks instead of 200 = 91.5 % fewer.
// The 3 × 3 block covers every point within min(3.0, 4.9) = 3.0 km, so 1.2 km is the true nearest.
// Layout (880 × 470): shopper, app server and cell cover on the top row (y 80); distance check and geo index on the
// middle row (y 250); the database under the geo index (y 400).
// Colours (PATTERN_TONE): shopper orange (traffic), app server and distance check teal (compute), database violet
// (store), the cell cover and the geo index green (the pattern; the index is the accent).
// Fact check (2026-11-16, redis.io GEOADD and GEOSEARCH docs): a Redis geo index is a sorted set whose score is a
// 52-bit interleaved geohash; a query checks the 1 + 8 areas that cover the shape and discards points outside it.

const POINTS = 200;
const CANDIDATES = 17; // illustrative, close to the 16.6 an even spread gives
const NEAREST_KM = 1.2; // illustrative
const COVER_KM = 3.0; // the smaller side of a precision-5 cell at 51.5° N

const spec: DiagramSpec = {
  title: "Nearest pick-up point: index by cell, read nine cells, check distance",
  width: 880,
  height: 470,
  steps: [
    { title: "Scan all 200 points" },
    { title: "Index each point by cell" },
    { title: "Look up nine cells" },
    { title: "Check distance, keep the nearest" },
    { title: "Widen when nothing is close" },
  ],
  zones: [],
  nodes: [
    {
      id: "shopper",
      label: "Shopper",
      sub: "north London",
      icon: "phone",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 95,
      y: 80,
      w: 150,
    },
    {
      id: "app",
      label: "App server",
      sub: "nearest pick-up?",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 370,
      y: 80,
      w: 180,
    },
    {
      id: "db",
      label: "Pick-up points",
      sub: `${POINTS} rows`,
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 680,
      y: 400,
      w: 190,
    },
    {
      id: "index",
      label: "Geo index",
      sub: "sorted by geohash",
      icon: "map",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 2,
      x: 680,
      y: 250,
      w: 190,
    },
    {
      id: "cover",
      label: "Cell cover",
      sub: "gcpvm + 8 more",
      icon: "hash",
      tone: PATTERN_TONE.pattern,
      fill: "pastel",
      step: 3,
      x: 680,
      y: 80,
      w: 190,
    },
    {
      id: "dist",
      label: "Distance check",
      sub: `${CANDIDATES} candidates`,
      icon: "search",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 4,
      x: 370,
      y: 250,
      w: 180,
    },
  ],
  edges: [
    { from: "shopper", to: "app", label: "near me?", packet: true },
    { from: "app", to: "db", label: `read all ${POINTS}`, packet: true, until: 1 },

    { from: "db", to: "index", label: "GEOADD", step: 2 },

    { from: "app", to: "cover", label: "lat, lng", packet: true, step: 3 },
    { from: "cover", to: "index", label: "9 ranges", packet: true, delay: 0.3, step: 3 },

    { from: "index", to: "dist", label: `${CANDIDATES} points`, packet: true, delay: 0.6, step: 4 },
    { from: "dist", to: "app", label: `${NEAREST_KM} km`, packet: true, delay: 0.9, step: 4 },

    { from: "dist", to: "cover", label: `none ≤ ${COVER_KM.toFixed(1)} km: widen`, dashed: true, step: 5 },
  ],
};

export default spec;
