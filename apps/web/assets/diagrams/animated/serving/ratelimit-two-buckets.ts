import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, meter, n } from "@/components/diagrams/presets/production";
import {
  KEY_LIMIT,
  LONG_PROMPTS,
  NORMAL_MINUTE,
  longMinuteTokens,
} from "@/components/diagrams/presets/production-ratelimit";

// "Two buckets": one Brightpost support key has a requests-per-minute limit and a tokens-per-minute limit
// (illustrative gateway limits, presets/production-ratelimit.ts). A request meter and a token meter, in three rows.
//   Step 1, a normal peak minute: 720 requests (72 % of 1,000); 1,584,000 input + 180,000 output = 1,764,000 tokens
//     (88 % of 2,000,000).
//   Step 2, five long prompts of 150,000 tokens arrive: 725 requests (72.5 %), still fine; tokens
//     1,764,000 + 5 × (150,000 + 250) = 2,515,250, which is 515,250 over, so the token bucket says 429.
//   Step 3, the gateway caps a prompt at 32,000 tokens: 5 × (32,000 + 250) = 161,250, so 1,925,250 tokens (96 %).
// Grid: three rows at y 40, 150 and 260 (label line, then a request meter at x 30 and a token meter at x 450, 400 wide).
// Colours: normal input orange (traffic), output green (model), the long prompts blue (data); overrun red.

const ROWS = [40, 150, 260] as const;
const REQ_X = 30;
const TOK_X = 450;
const W = 400;

const shapes: LayoutShape[] = [];
const label = (id: string, y: number, text: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: REQ_X,
  y,
  w: Math.round(text.length * 6.6),
  h: 20,
  label: text,
  tone: PROD_TONE.infra,
  step,
  quiet: true,
});

const rows = [
  { step: 1, title: "A normal peak minute", extra: 0, reqExtra: 0, extraTokens: 0 },
  {
    step: 2,
    title: `${LONG_PROMPTS.count} long prompts of ${n(LONG_PROMPTS.tokens)} tokens arrive`,
    extra: LONG_PROMPTS.count,
    reqExtra: LONG_PROMPTS.count,
    extraTokens: longMinuteTokens(LONG_PROMPTS.tokens),
  },
  {
    step: 3,
    title: `Same ${LONG_PROMPTS.count}, prompts capped at ${n(LONG_PROMPTS.cappedTokens)} tokens`,
    extra: LONG_PROMPTS.count,
    reqExtra: LONG_PROMPTS.count,
    extraTokens: longMinuteTokens(LONG_PROMPTS.cappedTokens),
  },
];

rows.forEach((r, i) => {
  const y = ROWS[i];
  shapes.push(label(`row-${r.step}`, y - 22, r.title, r.step));
  const reqUsed = NORMAL_MINUTE.requests + r.reqExtra;
  const tokUsed = NORMAL_MINUTE.inputTokens + NORMAL_MINUTE.outputTokens + r.extraTokens;
  shapes.push(
    ...meter(`req-${r.step}`, REQ_X, y, {
      label: "Requests per minute",
      used: reqUsed,
      limit: KEY_LIMIT.requestsPerMinute,
      unit: "req/min",
      width: W,
      max: 1_200,
      tone: PROD_TONE.traffic,
      limitLabel: "1,000 limit",
      step: r.step,
    }).map((s) => ({ ...s, quiet: true })),
    ...meter(`tok-${r.step}`, TOK_X, y, {
      label: "Tokens per minute",
      used: tokUsed,
      limit: KEY_LIMIT.tokensPerMinute,
      unit: "tokens/min",
      width: W,
      max: 2_600_000,
      limitLabel: "2,000,000 limit",
      highlight: r.step === 2 || undefined,
      segments: [
        { value: NORMAL_MINUTE.inputTokens, tone: PROD_TONE.traffic },
        { value: NORMAL_MINUTE.outputTokens, tone: PROD_TONE.model },
        ...(r.extraTokens ? [{ value: r.extraTokens, tone: PROD_TONE.data }] : []),
      ],
      step: r.step,
    }).map((s) => ({ ...s, quiet: true }))
  );
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Two buckets: requests per minute and tokens per minute",
  width: 880,
  height: 345,
  steps: [
    { title: "A normal peak minute fits both limits" },
    { title: "Five long prompts: requests fine, tokens over" },
    { title: "Cap the prompt and the minute fits again" },
  ],
  shapes,
};

export default spec;
