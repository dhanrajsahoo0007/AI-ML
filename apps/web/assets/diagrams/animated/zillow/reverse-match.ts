import type { LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// One new listing against every saved search (zillow, Step 6 and Deep dive 3).
// Three steps: 1 candidates by cell: the listing's zoom-12 tile is a term, and only saved searches tagged with that
// tile are candidates: 10,000,000 → 2,000 · 2 the filters: price, beds and type run on the 2,000 candidates; 100 match
// · 3 delivery: a (search, listing) pair already sent is skipped; 30 % of searches want instant alerts (30 pushes now),
// the rest go into the daily digest (70).
// Working (round numbers chosen to size the system): 10,000,000 saved searches; an average zoom-12 tile (about 10 km
// across) is covered by 2,000 of them; 5 % pass the filters: 100 matches per new listing; 30 % instant: 30, 70 % digest:
// 70. With 100,000 new listings and price drops a day: 100,000 × 100 = 10,000,000 matches a day ≈ 116/s.
// Layout: the listing on the left (x 30); a funnel of three centred boxes (widths 380, 300, 220) on the right, centre x
// 520; the two delivery boxes side by side under it; the dedup note left of the matches box. Colours (PATTERN_TONE): the listing blue
// (data), the stored searches neutral then violet (store), the filter teal (compute), the deliveries green (what the
// figure adds).

const CX = 520;
const box = (w: number) => CX - w / 2;

const spec: LayoutSpec = {
  kind: "layout",
  title: "One new listing against ten million saved searches",
  width: 780,
  height: 430,
  shapes: [
    {
      id: "listing",
      type: "box",
      x: 30,
      y: 40,
      w: 170,
      h: 70,
      label: "New listing 912",
      sub: "$480k, 3 beds, tile 12/1205/1539",
      tone: PATTERN_TONE.data,
      fill: "pastel",
    },
    {
      id: "all",
      type: "box",
      x: box(380),
      y: 40,
      w: 380,
      h: 56,
      label: "10,000,000 saved searches",
      sub: "stored as queries in the query index",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
    },
    {
      id: "cand",
      type: "box",
      x: box(300),
      y: 140,
      w: 300,
      h: 56,
      label: "2,000 candidates",
      sub: "tagged with tile 12/1205/1539",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 1,
      highlight: true,
    },
    {
      id: "match",
      type: "box",
      x: box(220),
      y: 240,
      w: 220,
      h: 56,
      label: "100 matches",
      sub: "price, beds, type pass",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 2,
    },
    {
      id: "dedup",
      type: "text",
      x: 140,
      y: 244,
      w: 250,
      h: 48,
      label: "Then skip any (search, listing)\npair already sent",
      tone: PATTERN_TONE.infra,
      step: 3,
    },
    {
      id: "instant",
      type: "box",
      x: CX - 230,
      y: 340,
      w: 210,
      h: 56,
      label: "30 instant pushes",
      sub: "within minutes",
      tone: PATTERN_TONE.pattern,
      fill: "pastel",
      step: 3,
    },
    {
      id: "digest",
      type: "box",
      x: CX + 20,
      y: 340,
      w: 210,
      h: 56,
      label: "70 to the digest",
      sub: "one email a day",
      tone: PATTERN_TONE.pattern,
      fill: "pastel",
      step: 3,
    },
    { id: "a-in", type: "arrow", x: 0, y: 0, from: "listing", to: "all", label: "percolate" },
    { id: "a-cand", type: "arrow", x: 0, y: 0, from: "all", to: "cand", label: "by tile term", step: 1 },
    { id: "a-match", type: "arrow", x: 0, y: 0, from: "cand", to: "match", label: "run filters", step: 2 },
    { id: "a-i", type: "arrow", x: 0, y: 0, from: "match", to: "instant", step: 3 },
    { id: "a-d", type: "arrow", x: 0, y: 0, from: "match", to: "digest", step: 3 },
  ],
  steps: [
    { title: "Candidates by tile" },
    { title: "Filters on the candidates" },
    { title: "Skip repeats, then deliver" },
  ],
};

export default spec;
