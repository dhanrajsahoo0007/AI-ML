import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, TRAFFIC, meter, meterSize, n } from "@/components/diagrams/presets/production";
import {
  SUPPORT_TPM,
  TEAM_KEYS,
  TOKENS_PER_REQUEST,
  mLabel,
  usedM,
} from "@/components/diagrams/presets/production-gateway";

// Token budgets per team key on Brightpost's gateway (llm-gateway, "Keys, budgets and quotas"). Static: no order to
// teach. Two kinds of limit in two groups:
//   Daily budgets (each bar drawn against its own budget):
//     support    440 M in + 50 M out = 490 M of 600 M  (200,000 × 2,200 and × 250; TOKENS)
//     catalogue   16 M in +  8 M out =  24 M of  40 M  (illustrative)
//     labs        40 M in +  5 M out =  45 M asked for, 30 M budget → 15 M refused with 429 (illustrative)
//   Per-minute limit on the support key at peak:
//     12 requests/s × 60 = 720 a minute × 2,450 tokens = 1,764,000 tokens/min, of which 720 × 2,200 = 1,584,000 in
//     and 720 × 250 = 180,000 out, against an illustrative 2,000,000 tokens/min.
// All numbers from presets/production-gateway.ts (which derives them from presets/production.ts).
//
// Grid (720 × 484): a legend row at y 0; group 1 from y 48 (its tab clear of the legend) holds three meters at y 80,
// 172, 264 (meterSize height 76, pitch 92); group 2 from y 376 holds one meter at y 408. Meters are 600 wide from x 50.
// Colours (PROD_TONE): input tokens orange (the prompt is traffic), output tokens green (the model's words), refused
// tokens red (a budget overrun), unused budget paper and neutral. Three tones plus neutral.

const X = 50;
const W = 600;
const { height: MH } = meterSize({ width: W });
const PITCH = MH + 16;
const G1 = 48;
const G2 = G1 + 32 + 3 * PITCH + 16;

/** A 12.5 px text shape sized to its label (about 6.5 px per character), left edge at x. */
const text = (id: string, x: number, y: number, label: string, tone: LayoutShape["tone"] = PROD_TONE.infra) =>
  ({ id, type: "text", x, y, w: Math.ceil(label.length * 6.5) + 6, h: 18, label, tone }) as LayoutShape;

/** A legend chip: a small pastel cell and its word. */
const chip = (
  id: string,
  x: number,
  label: string,
  tone: LayoutShape["tone"],
  fill: LayoutShape["fill"] = "pastel"
) => [
  { id: `${id}-cell`, type: "cell", x, y: 3, w: 14, h: 14, tone, fill, quiet: true } as LayoutShape,
  text(`${id}-text`, x + 18, 1, label),
];

const team = (id: string, t: (typeof TEAM_KEYS)[keyof typeof TEAM_KEYS], y: number, labels: boolean) =>
  meter(id, X, y, {
    label: `${t.app} · ${t.key}`,
    used: usedM(t),
    limit: t.budgetM,
    unit: "M tokens/day",
    width: W,
    limitLabel: "daily budget",
    segments: [
      { value: t.inputM, tone: PROD_TONE.traffic, label: labels ? mLabel(t.inputM) : undefined },
      { value: t.outputM, tone: PROD_TONE.model, label: labels ? mLabel(t.outputM) : undefined },
    ],
  });

const labs = TEAM_KEYS.labs;
const labsY = G1 + 32 + 2 * PITCH;
const refused = `${mLabel(usedM(labs) - labs.budgetM)} refused with 429`;

const shapes: LayoutShape[] = [
  ...chip("lg-in", X, "input tokens", PROD_TONE.traffic),
  ...chip("lg-out", X + 120, "output tokens", PROD_TONE.model),
  ...chip("lg-free", X + 248, "unused", PROD_TONE.infra, "paper"),
  ...chip("lg-over", X + 330, "refused", PROD_TONE.failure),

  ...team("support", TEAM_KEYS.support, G1 + 32, true),
  ...team("catalogue", TEAM_KEYS.catalogue, G1 + 32 + PITCH, true),
  // Labs: the input segment is cut at the budget and the output never fits, so no segment labels; the red cell says
  // "+15" and the note under it says what happened to those tokens.
  ...team("labs", labs, labsY, false),
  text("labs-refused", X + W - Math.ceil(refused.length * 6.5) - 6, labsY + 24 + 28 + 6, refused, PROD_TONE.failure),

  ...meter("tpm", X, G2 + 32, {
    label: `${TEAM_KEYS.support.app}: ${TRAFFIC.peakPerSecond} requests/s × 60 × ${n(TOKENS_PER_REQUEST)} tokens`,
    used: SUPPORT_TPM.tokensPerMinute,
    limit: SUPPORT_TPM.limit,
    unit: "tokens/min",
    width: W,
    limitLabel: "rate limit",
    segments: [
      { value: SUPPORT_TPM.inputPerMinute, tone: PROD_TONE.traffic, label: n(SUPPORT_TPM.inputPerMinute) },
      // 180,000 out is 54 px wide: too narrow for its label; the legend and the page give it.
      { value: SUPPORT_TPM.outputPerMinute, tone: PROD_TONE.model },
    ],
  }),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Token budgets and a rate limit, per team key",
  width: 720,
  height: G2 + 32 + MH + 20,
  groups: [
    {
      id: "daily",
      title: "Daily budget per team key",
      tone: PROD_TONE.infra,
      x: 20,
      y: G1,
      w: 680,
      h: 32 + 3 * PITCH,
    },
    {
      id: "minute",
      title: "Rate limit on the support key, at peak",
      tone: PROD_TONE.infra,
      x: 20,
      y: G2,
      w: 680,
      h: 32 + MH + 8,
    },
  ],
  shapes,
};

export default spec;
