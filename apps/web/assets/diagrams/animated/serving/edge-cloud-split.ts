import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import {
  EASY,
  HARD,
  ROUTES,
  routeTimes,
  type RouteId,
  type Request,
} from "@/components/diagrams/presets/production-region";

// A small model near the user against a large model far away (multi-region-edge-deployment, Deep dive). One request
// timed on three illustrative routes: the device, a nearby edge site and the home-region cloud. Every number is
// computed in presets/production-region.ts from the rates below; the rates are ILLUSTRATIVE.
//   device: no network, prefill 1 ms/token, decode 25 ms/token (a 3 B model at 4 bits on a phone).
//   edge:   20 ms round trip, prefill 0.04 ms/token, decode 2 ms/token (a small model on an edge GPU).
//   cloud:  120 ms round trip, prefill 0.04 ms/token, decode 4.4 ms/token (the large model; decode from the 1,500 ms target).
//   Easy request, 300 tokens in, 60 out:
//     device 0 + 300 + 1,500 = 1,800 ms, first token 325 ms.
//     edge   20 + 12 + 120   = 152 ms,   first token 34 ms.
//     cloud  120 + 12 + 264  = 396 ms,   first token 136.4 ms.
//   Hard request, 2,200 tokens in, 250 out:
//     device 0 + 2,200 + 6,250 = 8,450 ms.
//     edge   20 + 88 + 500     = 608 ms (small model: the answer may be wrong, so it does not go here).
//     cloud  120 + 88 + 1,100  = 1,308 ms, first token 212.4 ms, inside the 400 ms and 1,500 ms targets.
// Steps: 1 the easy request on three routes · 2 the hard request, on its own time scale · 3 the routing rule.
// Layout: label column x 20-150; bars start at x 170 and are 360 wide at a scale that fits the slowest route of the
// panel (0.2 px/ms for the easy panel, 0.04 px/ms for the hard one); notes at x 545. Tones: network neutral, prefill
// teal (compute), decode green (the model), the rule lime (a check). Highlight: the device's decode on the hard request.

const W = 840;
const BAR_X = 170;
const BAR_W = 360;
const NOTE_X = 545;
const ROW = 58;
const BAR_H = 26;

const text = (id: string, x: number, y: number, w: number, h: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: PROD_TONE.infra,
  step,
  quiet: true,
});

const fmt = (v: number) => n(Math.round(v * 10) / 10);
const order: RouteId[] = ["device", "edge", "cloud"];

function panel(kind: string, title: string, req: Request, axisMax: number, tickStep: number, y0: number, step: number) {
  const pxPerMs = BAR_W / axisMax;
  const out: LayoutShape[] = [text(`${kind}-head`, 20, y0, W - 40, 18, title, step)];
  order.forEach((route, i) => {
    const t = routeTimes(route, req);
    const y = y0 + 30 + i * ROW;
    let x = BAR_X;
    const seg = (id: string, ms: number, tone: (typeof PROD_TONE)[keyof typeof PROD_TONE], hi?: boolean) => {
      if (ms <= 0) return;
      const w = Math.max(2, Math.round(ms * pxPerMs));
      out.push({
        id: `${kind}-${route}-${id}`,
        type: "cell",
        x,
        y,
        w,
        h: BAR_H,
        label: w - 8 >= `${fmt(ms)} ms`.length * 7.2 ? `${fmt(ms)} ms` : undefined,
        tone,
        fill: "pastel",
        highlight: hi || undefined,
        step,
        quiet: true,
      });
      x += w;
    };
    out.push(text(`${kind}-${route}-name`, 20, y + 4, 140, 18, ROUTES[route].label, step));
    seg("net", t.network, PROD_TONE.infra);
    seg("pre", t.prefill, PROD_TONE.compute);
    seg("dec", t.decode, PROD_TONE.model, kind === "hard" && route === "device");
    out.push(
      text(
        `${kind}-${route}-note`,
        NOTE_X,
        y - 4,
        W - NOTE_X - 10,
        36,
        `${fmt(t.network)} + ${fmt(t.prefill)} + ${fmt(t.decode)} = ${fmt(t.total)} ms\nfirst token ${fmt(t.firstToken)} ms`,
        step
      )
    );
  });
  // Axis under the three rows.
  const axisY = y0 + 30 + 3 * ROW - 8;
  out.push({
    id: `${kind}-axis`,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [BAR_X, axisY],
      [BAR_X + BAR_W, axisY],
    ],
    step,
  });
  for (let v = 0; v <= axisMax + 1e-9; v += tickStep) {
    const tx = Math.round(BAR_X + v * pxPerMs);
    out.push(
      {
        id: `${kind}-tick-${v}`,
        type: "path",
        x: 0,
        y: 0,
        points: [
          [tx, axisY],
          [tx, axisY + 5],
        ],
        step,
      },
      text(`${kind}-tick-${v}-label`, tx - 30, axisY + 7, 60, 18, v === axisMax ? `${n(v)} ms` : n(v), step)
    );
  }
  return out;
}

const easy: Request = EASY;
const hard: Request = HARD;
const easyEdge = routeTimes("edge", easy).total;
const easyCloud = routeTimes("cloud", easy).total;
const netSaved = routeTimes("cloud", easy).network - routeTimes("edge", easy).network;
const hardCloud = routeTimes("cloud", hard);
const hardDevice = routeTimes("device", hard).total;

const legendY = 8;
const keys: [string, (typeof PROD_TONE)[keyof typeof PROD_TONE], string][] = [
  ["key-net", PROD_TONE.infra, "network round trip"],
  ["key-pre", PROD_TONE.compute, "prefill"],
  ["key-dec", PROD_TONE.model, "decode"],
];
const legend: LayoutShape[] = keys.flatMap(([id, tone, label], i) => [
  {
    id,
    type: "cell",
    x: 20 + i * 190,
    y: legendY + 2,
    w: 22,
    h: 14,
    tone,
    fill: "pastel",
    step: 1,
    quiet: true,
  } as LayoutShape,
  text(`${id}-label`, 48 + i * 190, legendY, label.length * 7 + 6, 18, label, 1),
]);
legend.push(text("illustrative", W - 250, legendY, 230, 18, "all rates are illustrative", 1));

const EASY_Y = 40;
const HARD_Y = EASY_Y + 30 + 3 * ROW + 40;
const RULE_Y = HARD_Y + 30 + 3 * ROW + 40;

const shapes: LayoutShape[] = [
  ...legend,
  ...panel("easy", `${EASY.label} (${EASY.tokensIn} tokens in, ${EASY.tokensOut} out)`, easy, 1800, 600, EASY_Y, 1),
  ...panel("hard", `${HARD.label} (${n(HARD.tokensIn)} tokens in, ${HARD.tokensOut} out)`, hard, 9000, 3000, HARD_Y, 2),
  {
    id: "rule",
    type: "box",
    x: 20,
    y: RULE_Y,
    w: W - 40,
    h: 72,
    label: "Send each request to the smallest route that answers it well",
    sub: `easy: edge ${fmt(easyEdge)} ms against cloud ${fmt(easyCloud)} ms, ${fmt(easyCloud - easyEdge)} ms saved (${netSaved} ms network, ${fmt(easyCloud - easyEdge - netSaved)} ms faster decode) · hard: cloud ${n(hardCloud.total)} ms against device ${n(hardDevice)} ms`,
    tone: PROD_TONE.check,
    fill: "pastel",
    step: 3,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "A small model near the user against a large model far away",
  width: W,
  height: RULE_Y + 72 + 12,
  steps: [
    { title: "An easy request on three routes" },
    { title: "A hard request: the device cannot keep up" },
    { title: "Route by difficulty and privacy" },
  ],
  shapes,
};

export default spec;
