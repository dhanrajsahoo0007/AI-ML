import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Filling appliances while nobody watches (netflix case study, Step 4 and Deep dive 1: push-fill).
// Three steps: 1 one ISP site's demand over a day: an evening peak at 21:00 and a trough near 04:00 (the curve is a
// shape only, drawn from round assumptions, not a measurement) · 2 the fill window, 02:00 to 06:00: the night's new
// and re-placed files arrive while the links are emptiest · 3 tiered fill: the origin fills 50 exchange-point hubs and
// each ISP site fills from its hub, so the origin sends one copy per hub instead of one per site.
// Working (round numbers chosen to size the system):
//   site: 400,000 streams at peak × 5 Mb/s = 2 Tb/s; trough = one fifth of the peak = 400 Gb/s.
//   nightly fill per site: 2 TB of new titles + 3 TB of re-placed popular files = 5 TB.
//   5 TB = 40,000 Gb; ÷ (4 h = 14,400 s) ≈ 2.8 Gb/s, which is 0.7% of the 400 Gb/s trough.
//   1,000 ISP sites each pulling from the origin: 1,000 × 5 TB = 5 PB a night.
//   tiered: 50 hubs × 5 TB = 250 TB from the origin = 2,000,000 Gb ÷ 14,400 s ≈ 139 Gb/s for 4 h.
// Layout (860 × 470): the day's curve in a 720 × 180 plot from x 80 (30 px an hour), axis at y 250; the fill window as
//   a 32 px strip on the axis from 02:00 to 06:00, under the curve's lowest point (y 214); the fill tree in a row of three boxes under the plot; notes under each part.
// Colours (PATTERN_TONE): demand blue (data), the fill window and fill notes green (the pattern), the origin violet
//   (store), axis and labels neutral.

const X0 = 80;
const PX_PER_H = 30;
const BASE = 250;
const PLOT_H = 180;
// Demand relative to the peak, hour 0 to 24 (shape only).
const SHAPE = [
  0.55, 0.4, 0.3, 0.22, 0.2, 0.22, 0.3, 0.4, 0.45, 0.48, 0.5, 0.52, 0.55, 0.56, 0.57, 0.6, 0.65, 0.72, 0.82, 0.92, 0.98,
  1.0, 0.9, 0.72, 0.55,
];
const hx = (h: number) => X0 + h * PX_PER_H;
const vy = (v: number) => BASE - v * PLOT_H;

const PEAK_GBPS = (400_000 * 5) / 1000; // 2,000 Gb/s
const TROUGH_GBPS = PEAK_GBPS / 5; // 400
const FILL_TB = 2 + 3;
const WINDOW_S = 4 * 3600;
const fillGbps = (FILL_TB * 8000) / WINDOW_S; // ≈ 2.8
const fillShare = (fillGbps / TROUGH_GBPS) * 100; // ≈ 0.7%
const SITES = 1000;
const HUBS = 50;
const tieredGbps = (HUBS * FILL_TB * 8000) / WINDOW_S; // ≈ 139

const shapes: LayoutShape[] = [
  {
    id: "axis",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [hx(0), BASE],
      [hx(24), BASE],
    ],
    tone: PATTERN_TONE.infra,
  },
  ...[0, 6, 12, 18, 24].map((h): LayoutShape => ({
    id: `t${h}`,
    type: "text",
    x: hx(h) - 25,
    y: BASE + 6,
    w: 50,
    h: 16,
    label: `${String(h).padStart(2, "0")}:00`,
    tone: PATTERN_TONE.infra,
  })),
  {
    id: "curve",
    type: "path",
    x: 0,
    y: 0,
    points: SHAPE.map((v, h): [number, number] => [hx(h), vy(v)]),
    smooth: true,
    tone: PATTERN_TONE.data,
    highlight: true,
  },
  {
    id: "peak",
    type: "text",
    x: hx(21) - 110,
    y: vy(1) - 26,
    w: 220,
    h: 18,
    label: `evening peak, 21:00: ${(PEAK_GBPS / 1000).toFixed(0)} Tb/s`,
    tone: PATTERN_TONE.data,
  },
  {
    id: "trough",
    type: "text",
    x: hx(4) - 115,
    y: vy(0.3) - 50,
    w: 230,
    h: 18,
    label: `trough, 04:00: ${TROUGH_GBPS} Gb/s`,
    tone: PATTERN_TONE.data,
  },
  {
    id: "shape",
    type: "text",
    x: 20,
    y: 20,
    w: 820,
    h: 18,
    label: "one ISP site's demand over a day (shape only)",
    tone: PATTERN_TONE.infra,
  },
  {
    id: "window",
    type: "box",
    x: hx(2),
    y: BASE - 32,
    w: 4 * PX_PER_H,
    h: 32,
    label: "fill window",
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 2,
    highlight: true,
  },
  {
    id: "n2",
    type: "text",
    x: 20,
    y: BASE + 32,
    w: 820,
    h: 18,
    label: `nightly fill: ${FILL_TB} TB in 4 h = ${fillGbps.toFixed(1)} Gb/s, ${fillShare.toFixed(1)}% of the trough; nothing competes with the evening`,
    tone: PATTERN_TONE.pattern,
    step: 2,
  },
  {
    id: "origin",
    type: "box",
    x: 60,
    y: 330,
    w: 180,
    h: 50,
    label: "Origin store",
    sub: "one copy of each file",
    tone: PATTERN_TONE.store,
    fill: "pastel",
    step: 3,
  },
  {
    id: "hubs",
    type: "box",
    x: 340,
    y: 330,
    w: 180,
    h: 50,
    label: `${HUBS} hubs`,
    sub: "exchange-point appliances",
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 3,
  },
  {
    id: "sites",
    type: "box",
    x: 620,
    y: 330,
    w: 180,
    h: 50,
    label: `${SITES.toLocaleString("en-GB")} ISP sites`,
    sub: "fill from their hub",
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 3,
  },
  { id: "a1", type: "arrow", x: 0, y: 0, from: "origin", to: "hubs", packet: true, step: 3 },
  { id: "a2", type: "arrow", x: 0, y: 0, from: "hubs", to: "sites", packet: true, step: 3 },
  {
    id: "n3",
    type: "text",
    x: 20,
    y: 398,
    w: 820,
    h: 18,
    label: `tiered: the origin sends ${HUBS} × ${FILL_TB} TB = ${HUBS * FILL_TB} TB a night, ${tieredGbps.toFixed(0)} Gb/s for 4 h`,
    tone: PATTERN_TONE.pattern,
    step: 3,
    highlight: true,
  },
  {
    id: "n4",
    type: "text",
    x: 20,
    y: 424,
    w: 820,
    h: 18,
    label: `every site pulling from the origin instead: ${SITES.toLocaleString("en-GB")} × ${FILL_TB} TB = ${(SITES * FILL_TB) / 1000} PB a night`,
    tone: PATTERN_TONE.infra,
    step: 3,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Filling appliances while nobody watches",
  width: 860,
  height: 470,
  shapes,
  steps: [{ title: "A day's demand" }, { title: "The fill window" }, { title: "Tiered fill" }],
};

export default spec;
