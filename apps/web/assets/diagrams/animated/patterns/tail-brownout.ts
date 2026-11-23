import type { DiagramEdge, DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// A degradation ladder for the product page (tail-latency-and-degradation, the Architecture figure). The page fans
// out to 50 services behind six panels; a brownout switch reads the page service's load and turns optional panels
// off, the most expensive first, so the core (price, stock and product details) always renders.
// Four steps: 1 normal load, every panel on: 50 calls a page · 2 load passes 70 %: recommendations off (20 calls
// saved) · 3 load passes 80 %: recently viewed and questions off · 4 load passes 90 %: reviews off; only the core is left.
// Working (illustrative split of the 50 services): price and stock 6, product details 4, reviews 5, recommendations 20,
// recently viewed 7, questions 8 (6 + 4 + 5 + 20 + 7 + 8 = 50). Calls a page: 50 → 30 → 15 → 10. At the 2,300 reads/s peak:
// 115,000 → 69,000 → 34,500 → 23,000 calls a second. Chance that a page waits on a call slow 1 % of the time,
// 1 − 0.99^n: 39.5 % → 26.0 % → 14.0 % → 9.6 %. The 70/80/90 % thresholds are illustrative.
// Layout (880 × 580): shopper at x 90 and page service at x 330 on y 440; the brownout switch above the page service at
// y 150; six panel services in a column at x 660, optional ones on top in the order they are switched off, the core at
// the bottom, so the switch's lines (top) never cross the page's remaining calls (bottom).
// Colours (PATTERN_TONE): shopper orange (traffic), page service and panel services teal (compute), the switch green
// (the pattern, the accent). Three tones plus neutral.

const PANELS = [
  { id: "recs", label: "Recommendations", services: 20, off: 2 },
  { id: "recent", label: "Recently viewed", services: 7, off: 3 },
  { id: "qa", label: "Questions", services: 8, off: 3 },
  { id: "reviews", label: "Reviews", services: 5, off: 4 },
  { id: "details", label: "Product details", services: 4 },
  { id: "price", label: "Price and stock", services: 6 },
] as const;

const callsAt = (step: number) =>
  PANELS.filter((p) => !("off" in p) || p.off > step).reduce((sum, p) => sum + p.services, 0);
const ROW = (i: number) => 76 + i * 82;

const spec: DiagramSpec = {
  title: "Switching off optional panels as load rises",
  width: 880,
  height: 580,
  steps: [
    { title: "Every panel on" },
    { title: "Load 70 %: recommendations off" },
    { title: "Load 80 %: recently viewed and questions off" },
    { title: "Load 90 %: reviews off, the core stays" },
  ],
  zones: [
    { id: "optional", title: "Optional panels", tone: PATTERN_TONE.infra, x: 535, y: 14, w: 250, h: 352 },
    { id: "core", title: "Core panels", tone: PATTERN_TONE.infra, x: 535, y: 380, w: 250, h: 184 },
  ],
  nodes: [
    {
      id: "shopper",
      label: "Shopper",
      sub: `${n(SHOP.peakReadsPerSecond)} pages/s`,
      icon: "users",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 90,
      y: 440,
      w: 150,
    },
    {
      id: "page",
      label: "Page service",
      sub: `${callsAt(1)} calls a page`,
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 330,
      y: 440,
      w: 180,
    },
    {
      id: "switch",
      label: "Brownout switch",
      sub: "reads load, sets flags",
      icon: "flag",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 2,
      x: 330,
      y: 150,
      w: 190,
    },
    ...PANELS.map((p, i) => ({
      id: p.id,
      label: p.label,
      sub: `${p.services} services`,
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel" as const,
      x: 660,
      y: ROW(i) + (i >= 4 ? 34 : 0),
      w: 210,
    })),
  ],
  edges: [
    { from: "shopper", to: "page", label: "GET kettle", packet: true },
    { from: "page", to: "switch", label: "load", dashed: true, step: 2 },
    ...PANELS.flatMap((p, i): DiagramEdge[] => {
      const call: DiagramEdge = { from: "page", to: p.id, packet: true, delay: 0.1 * i };
      if (!("off" in p)) return [call];
      return [
        { ...call, until: p.off - 1 },
        {
          from: "switch",
          to: p.id,
          label: p.id === "recs" || p.id === "reviews" ? "off" : undefined,
          dashed: true,
          tone: PATTERN_TONE.pattern,
          step: p.off,
        },
      ];
    }),
  ],
};

export default spec;
