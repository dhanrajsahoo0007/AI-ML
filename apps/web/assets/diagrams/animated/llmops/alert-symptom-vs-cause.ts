import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { LATENCY, PROD_TONE } from "@/components/diagrams/presets/production";
import { QUALITY, box, link, note } from "@/components/diagrams/presets/production-ops";

// Page on symptoms, ticket on causes (alerting-dashboards, Deep dive). A symptom is something a customer feels; a cause
// is something inside the system that may or may not reach them. Symptoms page a person now; causes open a ticket for
// the working day and sit on the dashboard to explain a page.
//
// Steps: 1 symptoms (pass rate under the 85 % floor, TTFT p95 over 400 ms, fast budget burn) · 2 causes (cache hit
// rate down, index two weeks old, provider 429s up) · 3 each cause can become a symptom: the dashed arrows.
// All readings (62 % to 31 % cache hit, two weeks, 429s) are ILLUSTRATIVE; the 85 % floor and 400 ms come from
// production-release.ts and production.ts.
//
// Layout (880 x 372): row header boxes x 15 (w 150, h 76) at y 40 (symptoms) and y 230 (causes); three boxes per row
// at x 185 / 405 / 625 (w 200, h 76); dashed arrows run straight up from each cause to the symptom above it, with a
// label pill; a note at y 330. Colour (three tones plus neutral): symptoms lime (a check), causes teal (the system),
// headers neutral; red only on the dashed arrows, where a cause reaches customers.

const COLS = [185, 405, 625] as const;

const shapes: LayoutShape[] = [
  box("h-sym", 15, 40, 150, 76, "Symptoms", "page a person now", PROD_TONE.infra, 1),
  box(
    "s-pass",
    COLS[0],
    40,
    200,
    76,
    `Pass rate under ${Math.round(QUALITY.floor * 100)} %`,
    "graded sample, last hour",
    PROD_TONE.check,
    1
  ),
  box("s-ttft", COLS[1], 40, 200, 76, `TTFT p95 over ${LATENCY.firstTokenMs} ms`, "for 10 minutes", PROD_TONE.check, 1),
  box("s-burn", COLS[2], 40, 200, 76, "Fast budget burn", "answer SLO, 1 h and 5 min", PROD_TONE.check, 1),

  box("h-cause", 15, 230, 150, 76, "Causes", "ticket for the day", PROD_TONE.infra, 2),
  box("c-index", COLS[0], 230, 200, 76, "Index two weeks old", "refresh job failed", PROD_TONE.compute, 2),
  box("c-cache", COLS[1], 230, 200, 76, "Cache hit 62 % to 31 %", "readings illustrative", PROD_TONE.compute, 2),
  box("c-429", COLS[2], 230, 200, 76, "Provider 429s rising", "rate-limit replies", PROD_TONE.compute, 2),

  link("x-index", "c-index", "s-pass", 3, { tone: PROD_TONE.failure, dashed: true, packet: true }),
  link("x-cache", "c-cache", "s-ttft", 3, { tone: PROD_TONE.failure, dashed: true, packet: true }),
  link("x-429", "c-429", "s-burn", 3, { tone: PROD_TONE.failure, dashed: true, packet: true }),
  note("lab-index", COLS[0] + 100, 160, 96, 30, "stale answers", 3),
  note("lab-cache", COLS[1] + 100, 160, 96, 30, "slow first token", 3),
  note("lab-429", COLS[2] + 100, 160, 96, 30, "failed requests", 3),
  note(
    "foot",
    185,
    330,
    640,
    30,
    "A cause that stays inside the system is a ticket. The same cause reaching customers is a page.",
    3
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Page on symptoms customers feel, ticket on causes inside the system",
  width: 880,
  height: 372,
  steps: [
    { title: "Symptoms: what a customer feels" },
    { title: "Causes: what is wrong inside" },
    { title: "A cause that reaches customers becomes a symptom" },
  ],
  shapes,
};

export default spec;
