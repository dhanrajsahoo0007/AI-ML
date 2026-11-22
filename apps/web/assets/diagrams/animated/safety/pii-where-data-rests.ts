import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE, n } from "@/components/diagrams/presets/production";
import { blk, note } from "@/components/diagrams/presets/production-safety";

// Where Brightpost's personal data rests (data-privacy-pii-handling, Deep dive): five places a ticket's words can end up
// after the answer is sent, what each holds, the control that limits it and how long it is kept. ILLUSTRATIVE retention
// periods are Brightpost's own choices (30 days for traces matches tracing-logging's log-redaction figure); the provider
// row follows the provider's published terms (OpenAI: abuse-monitoring logs kept up to 30 days by default; zero data
// retention available on approval; Anthropic: zero data retention by agreement; checked November 2026).
//   The fine-tuning set is DATASETS.fineTuneSet = 5,000 resolved tickets.
// Steps: 1 the five places and what is in them · 2 the control on each · 3 how long each keeps it.
// Grid (880 wide): rows y 40 + 76 i (h 64), i = 0..4; columns x 20 (place, w 170) | 210 (holds, w 230) | 460 (control,
// w 220) | 700 (retention, w 160); column headings y 12.
// Colours (PROD_TONE): prompt log and fine-tuning set blue (data), trace store and cache violet (stores), the provider
// neutral (outside our walls); control column lime (a check); retention column neutral.

const ROWS = [
  {
    key: "log",
    place: "Prompt log",
    tone: PROD_TONE.data,
    holds: "raw question and answer",
    control: "redact before the write",
    keep: "30 days (illustrative)",
  },
  {
    key: "trace",
    place: "Trace store",
    tone: PROD_TONE.store,
    holds: "spans, tool arguments",
    control: "placeholders; role access",
    keep: "30 days (illustrative)",
  },
  {
    key: "cache",
    place: "Semantic cache",
    tone: PROD_TONE.store,
    holds: "past answers, by meaning",
    control: "redact first; key by tenant",
    keep: "24 hours (illustrative)",
  },
  {
    key: "tune",
    place: "Fine-tuning set",
    tone: PROD_TONE.data,
    holds: `${n(DATASETS.fineTuneSet)} resolved tickets`,
    control: "scrub, then train",
    keep: "until the model retires",
  },
  {
    key: "prov",
    place: "Model provider",
    tone: PROD_TONE.infra,
    holds: "every prompt we send",
    control: "zero-retention terms",
    keep: "by contract; check yours",
  },
] as const;

const Y = (i: number) => 40 + i * 76;
const shapes: LayoutShape[] = [
  note("h-place", 20, 12, "Where", 1),
  note("h-holds", 210, 12, "What it can hold", 1),
  note("h-control", 460, 12, "Control", 2),
  note("h-keep", 700, 12, "How long", 3),
];
ROWS.forEach((r, i) => {
  shapes.push(blk(`${r.key}-place`, 20, Y(i), 170, 64, r.place, undefined, r.tone, 1));
  shapes.push(blk(`${r.key}-holds`, 210, Y(i), 230, 64, r.holds, undefined, PROD_TONE.infra, 1));
  shapes.push(blk(`${r.key}-control`, 460, Y(i), 220, 64, r.control, undefined, PROD_TONE.check, 2));
  shapes.push(blk(`${r.key}-keep`, 700, Y(i), 168, 64, r.keep, undefined, PROD_TONE.infra, 3));
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Five places personal data can rest",
  width: 880,
  height: Y(4) + 64 + 16,
  steps: [
    { title: "Five places, what each can hold" },
    { title: "The control on each" },
    { title: "How long each keeps it" },
  ],
  shapes,
};

export default spec;
