import type { DiagramSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE, TOKENS, n } from "@/components/diagrams/presets/production";

// Distilling from an API model with synthetic data (distillation-and-small-models, Architecture): the teacher answers
// Brightpost's questions, a filter keeps the answers worth learning from, the student trains on what is kept, and both
// models are compared on the 200-ticket golden set, which the teacher never labelled and the student never saw.
//
// Counts: the 5,000 questions are the fine-tuning set's tickets (DATASETS.fineTuneSet); the teacher answers all of them
// (5,000 × 2,200 input and 5,000 × 250 output tokens). Kept: 4,300 is ILLUSTRATIVE (86 %); the filter checks format,
// the refund rule (refunds over £30 need approval) and a judge's pass/fail.
// Steps: 1 the teacher answers the questions · 2 a filter keeps the usable answers · 3 the student trains on them ·
// 4 both models answer the golden set and are compared. Nodes never move between steps.
// Layout: row 1 y 90 (questions x 110, teacher x 370, answers x 630); row 2 y 220 (filter x 630, kept x 370, training
// x 110); row 3 y 350 (student x 110, compare x 370, golden set x 630).
// Colour (production legend): data blue, the teacher green (accent), the filter and the comparison lime (checks), the
// student orange (the weights being trained). The teacher is the accent.

const KEPT = 4300;

const spec: DiagramSpec = {
  title: "Distilling a teacher into a student with synthetic data",
  width: 820,
  height: 440,
  steps: [
    { title: "The teacher answers the questions" },
    { title: "A filter keeps the usable answers" },
    { title: "The student trains on what is kept" },
    { title: "Both models answer the golden set" },
  ],
  zones: [],
  nodes: [
    {
      id: "questions",
      label: "Questions",
      sub: `${n(DATASETS.fineTuneSet)} past tickets`,
      icon: "chat",
      tone: PROD_TONE.data,
      fill: "pastel",
      x: 110,
      y: 90,
      w: 190,
    },
    {
      id: "teacher",
      label: "Teacher model",
      sub: "large, frozen",
      icon: "model",
      tone: PROD_TONE.model,
      accent: true,
      x: 370,
      y: 90,
      w: 180,
    },
    {
      id: "answers",
      label: "Teacher answers",
      sub: `${n(DATASETS.fineTuneSet)} replies`,
      icon: "database",
      tone: PROD_TONE.data,
      fill: "pastel",
      x: 630,
      y: 90,
      w: 190,
    },
    {
      id: "filter",
      label: "Filter",
      sub: "format, refund rule, judge",
      icon: "meter",
      tone: PROD_TONE.check,
      fill: "pastel",
      x: 630,
      y: 220,
      w: 190,
      step: 2,
    },
    {
      id: "kept",
      label: "Kept answers",
      sub: `${n(KEPT)} (illustrative)`,
      icon: "database",
      tone: PROD_TONE.data,
      fill: "pastel",
      x: 370,
      y: 220,
      w: 180,
      step: 2,
    },
    {
      id: "train",
      label: "Student training",
      sub: "small model, fine-tune",
      icon: "model",
      tone: "orange",
      fill: "pastel",
      x: 110,
      y: 220,
      w: 190,
      step: 3,
    },
    {
      id: "student",
      label: "Student model",
      sub: "small",
      icon: "model",
      tone: "orange",
      fill: "pastel",
      x: 110,
      y: 350,
      w: 190,
      step: 3,
    },
    {
      id: "compare",
      label: "Compare",
      sub: "teacher vs student",
      icon: "meter",
      tone: PROD_TONE.check,
      fill: "pastel",
      x: 370,
      y: 350,
      w: 180,
      step: 4,
    },
    {
      id: "golden",
      label: "Golden set",
      sub: `${n(DATASETS.goldenSet)} tickets, held out`,
      icon: "database",
      tone: PROD_TONE.data,
      fill: "pastel",
      x: 630,
      y: 350,
      w: 190,
      step: 4,
    },
  ],
  edges: [
    { from: "questions", to: "teacher", label: `${n(TOKENS.inputPerRequest)} in`, packet: true },
    { from: "teacher", to: "answers", label: `${n(TOKENS.outputPerRequest)} out`, packet: true, delay: 0.4 },
    { from: "answers", to: "filter", label: "all", packet: true, step: 2 },
    { from: "filter", to: "kept", label: "pass", packet: true, step: 2 },
    { from: "kept", to: "train", label: "train on", packet: true, step: 3 },
    { from: "train", to: "student", label: "weights", packet: true, step: 3 },
    { from: "student", to: "compare", label: "answers", packet: true, step: 4 },
    { from: "golden", to: "compare", label: "tickets", packet: true, step: 4, delay: 0.4 },
  ],
};

export default spec;
