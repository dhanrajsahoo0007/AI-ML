import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, TRAFFIC, n } from "@/components/diagrams/presets/production";
import { blockBox, leftNote, link, note } from "@/components/diagrams/presets/production-finetune";
import {
  CHALLENGER,
  CHALLENGER_HALF,
  CHALLENGER_HIGH,
  CHALLENGER_LOW,
  CHALLENGER_RATE,
  QUALITY,
} from "@/components/diagrams/presets/production-retrain";
import { HOURLY_REQUESTS } from "@/components/diagrams/presets/production-release";

// Champion against challenger at the 10 % canary stage (automated-retraining-finetuning, Deep dive). The router sends 10 %
// of live traffic to the challenger (bundle 42) and 90 % to the champion (bundle 41); a judge grades 200 answers from each
// on the same rubric. Working (presets/production-release.ts CANARY[1], illustrative pass counts):
//   2.3 requests/s × 3,600 = 8,280 requests an hour; 10 % = 828 to the challenger.
//   Challenger: 178 of 200 = 89 %; 95 % interval ± 1.96 × √(0.89 × 0.11 ÷ 200) = ±4.3 points = [84.7, 93.3].
//   Champion baseline 90 % (QUALITY.baseline); floor 85 %. The interval holds the floor, so the check cannot rule a drop
//   out: widen to 50 % rather than promote.
// Layout (880 x 330): traffic x 20, y 130; router x 200, y 130; champion x 400, y 40; challenger x 400, y 220; graded
// samples x 670, y 130 (w 190); notes below. Colour: traffic orange, router neutral, both models green (challenger is
// the accent), graded samples lime.

const Y_MID = 130;
const shapes: LayoutShape[] = [
  blockBox("traffic", 20, Y_MID, 130, 64, "Traffic", PROD_TONE.traffic, {
    sub: `${TRAFFIC.averagePerSecond} req/s average`,
  }),
  blockBox("router", 200, Y_MID, 140, 64, "Router", PROD_TONE.infra, { sub: "10 % to challenger" }),
  blockBox("champ", 400, 40, 220, 64, "Champion", PROD_TONE.model, { sub: "bundle 41, live, 90 % of traffic" }),
  blockBox("chall", 400, 220, 220, 64, "Challenger", PROD_TONE.model, {
    sub: `bundle 42, 10 % = ${n(Math.round(HOURLY_REQUESTS * CHALLENGER.share))} requests an hour`,
    highlight: true,
  }),
  blockBox("graded", 670, Y_MID, 190, 64, "Graded samples", PROD_TONE.check, { sub: "200 each, one rubric" }),
  link("t-r", "traffic", "router"),
  link("r-c", "router", "champ"),
  link("r-h", "router", "chall"),
  link("c-g", "champ", "graded"),
  link("h-g", "chall", "graded"),
  note("p-c", 400, 112, 220, `baseline ${(QUALITY.baseline * 100).toFixed(0)} % pass`),
  note(
    "p-h",
    400,
    288,
    220,
    `${CHALLENGER.pass} of ${CHALLENGER.graded} = ${(CHALLENGER_RATE * 100).toFixed(0)} % pass`
  ),
  leftNote(
    "ci",
    20,
    332,
    `95 % interval ±${(CHALLENGER_HALF * 100).toFixed(1)} points = [${(CHALLENGER_LOW * 100).toFixed(1)}, ${(CHALLENGER_HIGH * 100).toFixed(1)}] holds the ${(QUALITY.floor * 100).toFixed(0)} % floor: widen to 50 %, do not promote yet`,
    { tone: PROD_TONE.check }
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Champion against challenger at a 10 % canary",
  width: 880,
  height: 365,
  shapes,
};

export default spec;
