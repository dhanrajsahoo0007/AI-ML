import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { ANSWER_BUDGET_MS, CHECK_MS, JUDGE_MS, SAMPLE_RATE } from "@/components/diagrams/presets/production-online";

// Blocking a request against observing it (online-production-evaluation, Deep dive: guardrail or evaluation).
// Two lanes with the same model. Lane 1, a guardrail, sits ON the request path: the draft must pass it before the
// customer sees anything, so it can block (fall back to a safe reply) but it adds its own time to every request: a
// rule or small classifier, about 50 ms (illustrative, as on guardrails-output-validation). Lane 2, an evaluation, sits
// BESIDE the path: the customer is answered at once (0 ms added), a 5 % copy goes to a judge, which is a full model
// call of about 2,000 ms (illustrative), longer than the whole 1,500 ms answer budget (presets/production-online.ts),
// so it could never sit on the path; the score reaches a dashboard minutes later and changes the next release, not
// this answer.
// Steps: 1 the guardrail lane · 2 the evaluation lane · 3 the comparison note.
// Layout (880 x 400): lane 1 boxes y 56 (h 52) at x 10, 190, 370, 550; fallback at (370, 138); lane 2 boxes y 262 at
// x 10, 190, 370, 550, 730 (w 140); customer at (190, 336). Colours: traffic orange, model green, guardrail and judge
// and dashboard lime, infrastructure neutral. Nothing is red: nothing breaks.

const W = 140;
const box = (
  id: string,
  x: number,
  y: number,
  label: string,
  sub: string,
  tone: LayoutShape["tone"],
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w: W, h: 52, label, sub, tone, fill: "pastel", step, ...extra });
const arrow = (id: string, from: string, to: string, step: number, label?: string, dashed = false): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
  dashed: dashed || undefined,
  step,
});
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

const shapes: LayoutShape[] = [
  text("l1", 10, 14, 560, 20, "Guardrail: on the request path, can block", 1),
  box("g-req", 10, 56, "Request", "from the customer", PROD_TONE.traffic, 1),
  box("g-model", 190, 56, "Model", "writes a draft", PROD_TONE.model, 1),
  box("g-check", 370, 56, "Guardrail", "rule or classifier", PROD_TONE.check, 1, { highlight: true }),
  box("g-cust", 550, 56, "Customer", "sees the answer", PROD_TONE.traffic, 1),
  box("g-fall", 370, 156, "Safe reply", "if blocked", PROD_TONE.infra, 1),
  arrow("g-a1", "g-req", "g-model", 1),
  arrow("g-a2", "g-model", "g-check", 1, "draft"),
  arrow("g-a3", "g-check", "g-cust", 1, "pass"),
  arrow("g-a4", "g-check", "g-fall", 1, "block"),
  arrow("g-a5", "g-fall", "g-cust", 1),
  text("g-note", 712, 56, 160, 52, `adds about ${CHECK_MS} ms\nto every request\n(illustrative)`, 1),

  text("l2", 10, 240, 560, 20, "Evaluation: beside the request path, only observes", 2),
  box("e-req", 10, 280, "Request", "from the customer", PROD_TONE.traffic, 2),
  box("e-model", 190, 280, "Model", "writes the answer", PROD_TONE.model, 2),
  box("e-samp", 370, 280, "Sampler", `keeps ${SAMPLE_RATE * 100} %`, PROD_TONE.infra, 2),
  box("e-judge", 550, 280, "Judge", "a model call", PROD_TONE.check, 2, { highlight: true }),
  box("e-dash", 730, 280, "Dashboard", "alerts, new cases", PROD_TONE.check, 2),
  box("e-cust", 190, 378, "Customer", "answered at once", PROD_TONE.traffic, 2),
  arrow("e-a1", "e-req", "e-model", 2),
  arrow("e-a2", "e-model", "e-cust", 2, "0 ms added"),
  arrow("e-a3", "e-model", "e-samp", 2, "copy", true),
  arrow("e-a4", "e-samp", "e-judge", 2, "5 %", true),
  arrow("e-a5", "e-judge", "e-dash", 2, "score", true),
  text(
    "e-note",
    370,
    378,
    500,
    52,
    `A judge call takes about ${n(JUDGE_MS)} ms (illustrative), longer than the whole ${n(ANSWER_BUDGET_MS)} ms\nanswer budget, so it cannot sit on the path. Its score arrives minutes later\nand shapes the next release, not this answer.`,
    3
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Blocking a request against observing it",
  width: 880,
  height: 450,
  steps: [
    { title: "A guardrail blocks, and costs time on every request" },
    { title: "An evaluation observes, and costs the customer nothing" },
    { title: "A judge is too slow to block" },
  ],
  shapes,
};

export default spec;
