import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { arr, blk } from "@/components/diagrams/presets/production-safety";

// Four places bias gets in (bias-toxicity-detection, Deep dive "Where bias comes from"): the data, the model, the
// prompt and the evaluation. Each column gives one example, one way to check for it and one fix. A stepper reveals one
// source at a time.
// Steps: 1 data · 2 model · 3 prompt · 4 evaluation. Header chain: neutral arrows data → model → prompt → evaluation.
// Grid (880 wide): four columns x 20, 245, 470, 695 (w 180); header y 16 (h 56); example y 96 (h 76); check y 192
// (h 76); fix y 288 (h 76). Row captions are text on the first column only.
// Colours (PROD_TONE): data blue, model green, prompt orange (traffic: it is what the customer and engineers write),
// evaluation lime (a check). The check row is lime in every column; the example row is soft neutral.

const COLS = [
  {
    key: "data",
    title: "Data",
    sub: "what the model learned from",
    tone: PROD_TONE.data,
    example: "Web text skews to some voices",
    check: "Count examples by group",
    fix: "Rebalance, filter, add data",
  },
  {
    key: "model",
    title: "Model",
    sub: "what it absorbed",
    tone: PROD_TONE.model,
    example: "Repeats stereotypes if vague",
    check: "Tests such as BBQ",
    fix: "Preference tuning, refusals",
  },
  {
    key: "prompt",
    title: "Prompt",
    sub: "what we ask it",
    tone: PROD_TONE.traffic,
    example: "A persona tilts the reply",
    check: "Swap one attribute, compare",
    fix: "Neutral wording, re-test",
  },
  {
    key: "eval",
    title: "Evaluation",
    sub: "how we measure it",
    tone: PROD_TONE.check,
    example: "A judge favours one style",
    check: "Error rates split by group",
    fix: "Varied raters, audit it",
  },
] as const;

const X = [20, 245, 470, 695];
const shapes: LayoutShape[] = [];
COLS.forEach((c, i) => {
  const step = i + 1;
  shapes.push(blk(`${c.key}-head`, X[i], 16, 180, 56, c.title, c.sub, c.tone, step));
  shapes.push(blk(`${c.key}-ex`, X[i], 100, 180, 70, "Example", c.example, PROD_TONE.infra, step));
  shapes.push(blk(`${c.key}-chk`, X[i], 190, 180, 70, "Check", c.check, PROD_TONE.check, step));
  shapes.push(blk(`${c.key}-fix`, X[i], 280, 180, 70, "Fix", c.fix, PROD_TONE.infra, step));
  if (i > 0) shapes.push(arr(`chain-${i}`, `${COLS[i - 1].key}-head`, `${c.key}-head`, step));
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Where bias gets in: four sources",
  width: 880,
  height: 370,
  steps: [{ title: "The data" }, { title: "The model" }, { title: "The prompt" }, { title: "The evaluation" }],
  shapes,
};

export default spec;
