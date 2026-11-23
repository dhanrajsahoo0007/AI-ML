import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { funnel, fmt } from "@/components/diagrams/presets/rag";
import {
  APPEALS,
  CALIBRATION,
  CASCADE,
  LLM,
  LOCAL_LAW,
  PEOPLE,
  PLATFORM,
  PREVALENCE,
  REPORTS,
  TIERS,
} from "@/components/diagrams/presets/gcase-moderation";

// The cascade a day (content-moderation-system, design sheet §2, §5 and the Figures table, review 45; preset TIERS,
// CASCADE, REPORTS, LOCAL_LAW, APPEALS, PEOPLE in presets/gcase-moderation.ts). Every volume is ILLUSTRATIVE (Kestrel).
//   Step 1, the cascade only: PLATFORM.units 140M units meet the hash lists and own banks: TIERS.vetted 710 +
//     TIERS.own 547,530 = 548,240 matched (0.39%); the classifiers score every unit and remove TIERS.autoAct ≈ 201,748
//     at once (0.14%); the band is TIERS.band ≈ 2.52M units, of which TIERS.held ≈ 562,833 distinct units are held out
//     of view (0.40%, severity 0–1 band and above); the policy-reading model reads the band; people get
//     TIERS.peopleFromCascade ≈ 129,129 items from the cascade.
//   Step 2, side inputs, not funnel stages: model calls from reports by reason REPORTS.toModel 940,800, reach
//     re-checks CASCADE.recheckCalls ≈ 193,756 and local law outside the hate band LOCAL_LAW.extraCalls ≈ 18,805 →
//     LLM.enforcementCalls ≈ 3.68M calls (2.6% of units); people items from reports, notices and legal queues ≈ 46,035,
//     appeals ≈ 63,751 (users 55,370 + notifiers 8,381) and QA, calibration, prevalence and NCII requests ≈ 9,021 →
//     TIERS.people ≈ 247,937 (0.18% of units).
// Layout (880 wide): funnel() from presets/rag.ts at cx 260, widths on a log scale of the counts (a linear scale would
// draw every stage after the first as the minimum); side inputs as boxes in a column at x 560, arrows into the model
// and people stages.
// Colours: hashes and classifiers lime (checks), the band lime (ranking), the model green, people orange; side inputs
// neutral.

const pct = (v: number, d = 2) => `${(v * 100).toFixed(d)}%`;
const m = (v: number) => `${(v / 1e6).toFixed(2)}M`;
const hashHits = TIERS.vetted + TIERS.own;

const stages = [
  {
    label: "Hash lists and own banks",
    sub: `${fmt(PLATFORM.units / 1e6)}M units · ${fmt(Math.round(hashHits))} matched (${pct(hashHits / PLATFORM.units)})`,
    n: PLATFORM.units,
    tone: GENAI_TONE.check,
  },
  {
    label: "Classifiers on every unit",
    sub: `${fmt(Math.round(TIERS.autoAct))} removed at once (${pct(TIERS.autoActShare)})`,
    n: PLATFORM.units - hashHits,
    tone: GENAI_TONE.check,
  },
  {
    label: "The band; worst harms held",
    sub: `${m(TIERS.band)} band units · ${fmt(Math.round(TIERS.held))} held (${pct(TIERS.heldShare)})`,
    n: TIERS.band,
    tone: GENAI_TONE.rank,
  },
  {
    label: "Policy-reading model",
    sub: `${m(TIERS.band)} band calls of ${m(LLM.enforcementCalls)} a day`,
    n: TIERS.band,
    tone: GENAI_TONE.model,
  },
  {
    label: "People",
    sub: `${fmt(Math.round(TIERS.peopleFromCascade))} items from the cascade`,
    n: TIERS.peopleFromCascade,
    tone: GENAI_TONE.user,
  },
];

const CX = 260;
const Y0 = 34;
const H = 48;
const GAP = 26;
const fun = funnel(
  "f",
  CX,
  Y0,
  stages.map((s) => ({ label: s.label, sub: s.sub, count: Math.log10(s.n), tone: s.tone, step: 1 })),
  { maxW: 470, minW: 250, h: H, gap: GAP }
);
const stageY = (i: number) => Y0 + i * (H + GAP);

// Side inputs (step 2).
const peopleReports = REPORTS.toSpecialists + REPORTS.urgentPeople + REPORTS.peopleGeneral;
const peopleNotices = peopleReports + REPORTS.trusted + LOCAL_LAW.legalQueue + LOCAL_LAW.toPeople;
const appeals = APPEALS.appeals + APPEALS.notifierAppeals;
const qa = PEOPLE.queues.find((q) => q.id === "QA")!.items;
const measure = qa + CALIBRATION.perDay + PREVALENCE.humanLabelsPerDay + PLATFORM.nciiRequests;

const SX = 590;
const SW = 270;
const SH = 40;
const side = (id: string, y: number, label: string, sub: string, to: number, quiet = true): LayoutShape[] => [
  { id, type: "box", x: SX, y, w: SW, h: SH, label, sub, tone: "neutral", step: 2, quiet },
  {
    id: `${id}-a`,
    type: "arrow",
    x: 0,
    y: 0,
    from: id,
    to: `f-${to}`,
    via: [[SX - 24, y + SH / 2]],
    dashed: true,
    step: 2,
    quiet: true,
  },
];
const sides: LayoutShape[] = [
  ...side("s-reports", stageY(3) - 70, "Reports, routed by reason", `${fmt(REPORTS.toModel)} model calls`, 3, false),
  ...side(
    "s-recheck",
    stageY(3) - 20,
    "Reach re-checks at 1,000 views",
    `${fmt(Math.round(CASCADE.recheckCalls))} calls`,
    3
  ),
  ...side("s-local", stageY(3) + 30, "Local law outside the band", `${fmt(Math.round(LOCAL_LAW.extraCalls))} calls`, 3),
  ...side(
    "s-notices",
    stageY(4) + 6,
    "Reports, notices, legal queues",
    `${fmt(Math.round(peopleNotices))} items`,
    4,
    false
  ),
  ...side("s-appeals", stageY(4) + 56, "Appeals: users and notifiers", `${fmt(Math.round(appeals))} items`, 4),
  ...side("s-measure", stageY(4) + 106, "QA, calibration, prevalence, NCII", `${fmt(Math.round(measure))} items`, 4),
];

const TOT_Y = stageY(4) + 162;
const text = (id: string, y: number, label: string, step: number, quiet = false): LayoutShape => ({
  id,
  type: "text",
  x: 12,
  y,
  w: 856,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
  quiet,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: `The cascade a day: ${fmt(PLATFORM.units / 1e6)}M units, ≈ ${pct(TIERS.modelShare, 1)} to the model, ≈ ${pct(TIERS.peopleShare)} to people`,
  width: 880,
  height: TOT_Y + 46,
  steps: [
    { title: "The cascade: each tier settles what it can" },
    {
      title: `Side inputs: ${m(LLM.enforcementCalls)} model calls and ${fmt(Math.round(TIERS.people))} people items in all`,
    },
  ],
  shapes: [
    text(
      "head",
      6,
      "A day on Kestrel (illustrative volumes): each tier settles what it can and passes the rest on",
      1,
      true
    ),
    ...fun,
    ...sides,
    text(
      "tot-1",
      TOT_Y,
      `Model: ${m(LLM.enforcementCalls)} calls a day, ${pct(LLM.shareOfUnits, 1)} of units. People: ${fmt(Math.round(TIERS.people))} items a day, ${pct(TIERS.peopleShare)} of units.`,
      2,
      true
    ),
    text("tot-2", TOT_Y + 22, "Every volume and per-tier share is illustrative: no platform publishes them.", 2, true),
  ],
};

export default spec;
