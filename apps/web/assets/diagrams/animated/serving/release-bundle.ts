import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { BUNDLE, BUNDLE_PARTS, type BundlePart } from "@/components/diagrams/presets/production-release";

// The release bundle (rollback-blue-green-deployment, Deep dive; reused by cicd-ct-pipelines). A Brightpost release is
// not one artefact but five pinned versions that were tested together: the model, the prompt, the retrieval index,
// the guardrail configuration and the tool schemas. Version labels come from BUNDLE in presets/production-release.ts
// (invented for the figure).
// Step 1: bundle 41 is live. Step 2: bundle 42 changes four parts (guardrails stay g5). Step 3: a half rollback that
// restores only the tool schemas to t7 leaves prompt p12, which calls the refund tool with a reason_code field that
// t7 does not have: the pair is red. Step 4: rolling back the whole bundle restores all five together.
//
// Layout (880 x 400): row labels at x 10 (w 130); five boxes per row at x 150 (w 124, gap 12), so the row ends at 818.
// Rows at y 52 (bundle 41), 122 (bundle 42), 212 (half rollback), 322 (restored); a one-line note 14 px under rows 2,
// 3 and 4. Colour (four tones plus neutral): model green, prompt and tools blue (versioned text), index violet (a
// store), guardrails lime (a check). Red only on the two parts that disagree in step 3.

const COL_X = 150;
const COL_W = 124;
const GAP = 12;
const BOX_H = 44;
const ROWS = { live: 52, next: 122, half: 212, back: 322 } as const;

const TONE: Record<BundlePart, LayoutTone> = {
  model: PROD_TONE.model,
  prompt: PROD_TONE.data,
  index: PROD_TONE.store,
  guardrails: PROD_TONE.check,
  tools: PROD_TONE.data,
};
const LABEL: Record<BundlePart, string> = {
  model: "Model",
  prompt: "Prompt",
  index: "Index",
  guardrails: "Guardrails",
  tools: "Tools",
};

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

function row(
  id: string,
  y: number,
  label: string,
  versions: Record<BundlePart, string>,
  step: number,
  bad: BundlePart[] = []
) {
  const out: LayoutShape[] = [text(`${id}-label`, 10, y, 130, BOX_H, label, step)];
  BUNDLE_PARTS.forEach((part, i) => {
    out.push({
      id: `${id}-${part}`,
      type: "box",
      x: COL_X + i * (COL_W + GAP),
      y,
      w: COL_W,
      h: BOX_H,
      label: LABEL[part],
      sub: versions[part],
      tone: bad.includes(part) ? PROD_TONE.failure : TONE[part],
      fill: "pastel",
      step,
    });
  });
  return out;
}

const NOTE_W = 668;
const shapes: LayoutShape[] = [
  ...row("live", ROWS.live, "Bundle 41\nlive", BUNDLE[41], 1),
  ...row("next", ROWS.next, "Bundle 42\ncandidate", BUNDLE[42], 2),
  text(
    "note-next",
    COL_X,
    ROWS.next + BOX_H + 4,
    NOTE_W,
    18,
    "Four of five parts changed; tested and released as one",
    2
  ),
  ...row("half", ROWS.half, "Half a rollback\n(tools only)", { ...BUNDLE[42], tools: BUNDLE[41].tools }, 3, [
    "prompt",
    "tools",
  ]),
  text(
    "note-half",
    COL_X,
    ROWS.half + BOX_H + 4,
    NOTE_W,
    36,
    "Prompt p12 calls the refund tool with a reason_code field.\nSchema t7 has no such field, so the call is rejected (illustrative).",
    3
  ),
  ...row("back", ROWS.back, "Bundle 41\nrestored", BUNDLE[41], 4),
  text(
    "note-back",
    COL_X,
    ROWS.back + BOX_H + 4,
    NOTE_W,
    18,
    "One switch restores all five parts, as they were tested together",
    4
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "A release is five pinned versions that ship and roll back together",
  width: 880,
  height: 410,
  steps: [
    { title: "Bundle 41 is five pinned versions" },
    { title: "Bundle 42 changes four of them" },
    { title: "Rolling back one part leaves a mismatch" },
    { title: "Roll back the whole bundle" },
  ],
  shapes,
};

export default spec;
