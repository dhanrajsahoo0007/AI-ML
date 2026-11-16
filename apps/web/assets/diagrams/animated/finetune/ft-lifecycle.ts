import type { DiagramSpec } from "@/components/diagrams/types";
import { FINETUNE_TONE as T, PROD_TONE, DATASETS, n } from "@/components/diagrams/presets/production";

// The fine-tuning lifecycle on the Fine-Tuning LLMs page (Architecture): decide -> data -> train -> evaluate ->
// deploy -> monitor, with monitoring feeding new resolved tickets back into the data. Brightpost's numbers:
// the golden set (200 tickets) and the fine-tuning set (5,000 resolved tickets) come from presets/production.ts.
// Steps: 1 decide (baseline + eval; knowledge gap goes to RAG) · 2 data · 3 train · 4 evaluate against the
// baseline · 5 deploy · 6 monitor and loop back. Nodes never move.
// Grid: columns x 100 / 330 / 560 / 790 (w 150). Row 1 y 90: Decide, Data, Train, Evaluate. Row 2 y 260: RAG instead
// (under Decide), Monitor (under Data), Deploy (under Evaluate); the slot under Train stays empty.
// Colours (four tones plus neutral): control neutral (decide, RAG), data blue (data, monitor traces), the weights being
// trained orange (FINETUNE_TONE), the check lime, the deployed model green. No red: nothing breaks in this view.

const COL = [100, 330, 560, 790] as const;
const W = 150;
const R1 = 90;
const R2 = 260;

const spec: DiagramSpec = {
  title: "The fine-tuning lifecycle: decide, data, train, evaluate, deploy, monitor",
  width: 900,
  height: 360,
  steps: [
    { title: "Decide: is the gap behaviour or knowledge?" },
    { title: "Data: real tickets, reviewed" },
    { title: "Train: a small adapter on the base" },
    { title: "Evaluate against the baseline" },
    { title: "Deploy the adapter" },
    { title: "Monitor, and feed new tickets back" },
  ],
  zones: [],
  nodes: [
    {
      id: "decide",
      label: "Decide",
      sub: "baseline + eval",
      icon: "controller",
      tone: PROD_TONE.infra,
      fill: "pastel",
      x: COL[0],
      y: R1,
      w: W,
    },
    {
      id: "rag",
      label: "Use RAG",
      sub: "gap is knowledge",
      icon: "search",
      tone: PROD_TONE.infra,
      fill: "pastel",
      x: COL[0],
      y: R2,
      w: W,
    },
    {
      id: "data",
      label: "Data",
      sub: `${n(DATASETS.fineTuneSet)} tickets`,
      icon: "database",
      tone: T.data,
      fill: "pastel",
      step: 2,
      x: COL[1],
      y: R1,
      w: W,
    },
    {
      id: "train",
      label: "Train",
      sub: "LoRA adapter",
      icon: "gpu",
      tone: T.trained,
      fill: "pastel",
      step: 3,
      x: COL[2],
      y: R1,
      w: W,
    },
    {
      id: "eval",
      label: "Evaluate",
      sub: `golden set: ${DATASETS.goldenSet}`,
      icon: "meter",
      tone: T.check,
      accent: true,
      step: 4,
      x: COL[3],
      y: R1,
      w: W,
    },
    {
      id: "deploy",
      label: "Deploy",
      sub: "merge or swap",
      icon: "model",
      tone: T.model,
      fill: "pastel",
      step: 5,
      x: COL[3],
      y: R2,
      w: W,
    },
    {
      id: "monitor",
      label: "Monitor",
      sub: "traces, drift",
      icon: "chart",
      tone: T.data,
      fill: "pastel",
      step: 6,
      x: COL[1],
      y: R2,
      w: W,
    },
  ],
  edges: [
    { from: "decide", to: "rag", label: "knowledge", dashed: true },
    { from: "decide", to: "data", label: "behaviour", packet: true, step: 2 },
    { from: "data", to: "train", label: "train split", packet: true, step: 3 },
    { from: "train", to: "eval", label: "adapter", packet: true, step: 4 },
    { from: "eval", to: "deploy", label: "better", packet: true, step: 5 },
    { from: "deploy", to: "monitor", label: "live traffic", packet: true, step: 6 },
    { from: "monitor", to: "data", label: "new tickets", step: 6 },
  ],
};
export default spec;
