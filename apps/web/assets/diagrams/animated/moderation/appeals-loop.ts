import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { APPEALS, APPEALS_SENS, PEOPLE, TARGETS } from "@/components/diagrams/presets/gcase-moderation";

// Appeals and what an overturn changes (content-moderation-system, design sheet §10.11, §13 "Appeals", walk-through 1
// step 9, review 26 and 57; preset APPEALS, APPEALS_SENS, PEOPLE, TARGETS in presets/gcase-moderation.ts). Every rate is
// ILLUSTRATIVE and a launch measurement.
//   Step 1, the user's appeal: an action carries a statement of reasons built from the record; the user may appeal
//     within 6 months (DSA Art. 20); APPEALS.appeals ≈ 55,370 a day (25% of wrong actions and 8% of right ones are
//     appealed, spam accounts rate-limited) at 60 s each ≈ 923 handling hours, ≤ 72 h p95; a person who did not decide
//     first decides, the model's rationale hidden until asked (it anchors); APPEALS.overturned ≈ 18,730 a day overturned
//     (APPEALS.overturnRate ≈ 33.8%), the rest upheld with a notice.
//   Step 2, what an overturn changes, and the notifier's branch: restore the post and remove the strike; unbank the
//     hash entry and re-review everything matched to it; a near-miss into the gold set; retrain and the gates before
//     the next release. A notifier whose report got "no action" can appear too: APPEALS.notifierAppeals ≈ 8,381 a day.
//     The overturn rate hangs on how often right actions are appealed: hate 43.5% / 29.0% / 22.3% at 4% / 8% / 12%
//     (APPEALS_SENS).
// Layout (880 wide): four columns x 12 | 232 | 452 | 672; rows 30 (notifier branch), 120 (the appeal), 220 (outcomes),
// 320 (overturn effects, running right to left and back up to the action).
// Colours: the action teal (it acts); users and notifiers orange; the queue and the reviewer orange (people); upheld
// neutral; overturned red; the effects lime (they correct the checks); the gold set violet (a store).

const n0 = (v: number) => Math.round(v).toLocaleString("en-GB");
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const COL = [12, 232, 452, 672];
const CW = [196, 196, 196, 196];
const ROW = { notifier: 30, appeal: 120, outcome: 220, effects: 320 };
const H = 58;
const appealHours = PEOPLE.queues.find((q) => q.id === "appeals")!.hours;
const hateSens = APPEALS_SENS.map((a) => pct(a.overturnRate)).join(" / ");

const box = (
  id: string,
  col: number,
  y: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  step: number,
  quiet = true
): LayoutShape => ({
  id,
  type: "box",
  x: COL[col],
  y,
  w: CW[col],
  h: H,
  label,
  sub,
  tone,
  fill: "pastel",
  step,
  quiet,
});
const arrow = (id: string, from: string, to: string, step: number, extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
  ...extra,
});

const shapes: LayoutShape[] = [
  // Step 1: the user's appeal.
  box("action", 0, ROW.appeal, "Action + statement", "ground, scope, automated?", GENAI_TONE.tool, 1, false),
  box("appeal", 1, ROW.appeal, "User appeals", "within 6 months", GENAI_TONE.user, 1),
  box(
    "queue",
    2,
    ROW.appeal,
    "Appeal queue",
    `${n0(APPEALS.appeals)} a day · ≤ ${TARGETS.humanP95Hours.appeals} h p95`,
    GENAI_TONE.user,
    1
  ),
  box("person", 3, ROW.appeal, "A different person", "rationale hidden until asked", GENAI_TONE.user, 1),
  box(
    "upheld",
    3,
    ROW.outcome,
    "Upheld",
    `${n0(APPEALS.appeals - APPEALS.overturned)} a day; notice sent`,
    "neutral",
    1
  ),
  box(
    "overturned",
    2,
    ROW.outcome,
    "Overturned",
    `${n0(APPEALS.overturned)} a day (${pct(APPEALS.overturnRate)})`,
    PROD_TONE.failure,
    1
  ),
  arrow("a-action", "action", "appeal", 1),
  arrow("a-appeal", "appeal", "queue", 1),
  arrow("a-queue", "queue", "person", 1),
  arrow("a-upheld", "person", "upheld", 1),
  arrow("a-over", "person", "overturned", 1),

  // Step 2: what an overturn changes; the notifier's branch.
  box("restore", 2, ROW.effects, "Restore the post", "strike removed; notice", PROD_TONE.check, 2, false),
  box("unbank", 1, ROW.effects, "Unbank the entry", "re-review all its matches", PROD_TONE.check, 2),
  box("gold", 0, ROW.effects, "Near-miss to gold set", "retrain; gates next release", GENAI_TONE.store, 2),
  arrow("a-restore", "overturned", "restore", 2),
  arrow("a-unbank", "restore", "unbank", 2),
  arrow("a-gold", "unbank", "gold", 2),
  arrow("a-loop", "gold", "action", 2, { dashed: true }),
  box("notifier", 1, ROW.notifier, "Notifier: “no action”", "on their report", GENAI_TONE.user, 2),
  box("nappeal", 2, ROW.notifier, "Notifier appeal", `${n0(APPEALS.notifierAppeals)} a day`, GENAI_TONE.user, 2),
  arrow("a-notifier", "notifier", "nappeal", 2),
  arrow("a-nappeal", "nappeal", "queue", 2),
];

const FOOT = ROW.effects + H + 18;
const text = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: 12,
  y,
  w: 856,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
  quiet: true,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: `Appeals: ${n0(APPEALS.appeals)} a day to a person who did not decide first; an overturn restores, unbanks and teaches`,
  width: 880,
  height: FOOT + 48,
  steps: [
    { title: "The appeal goes to a person who did not decide first" },
    { title: "An overturn restores, unbanks, re-reviews and teaches; notifiers appeal too" },
  ],
  shapes: [
    ...shapes,
    text(
      "foot-1",
      FOOT,
      `Appeals take ≈ ${n0(appealHours)} handling hours a day at 60 s each; the model never re-judges its own decision.`,
      1
    ),
    text(
      "foot-2",
      FOOT + 22,
      `The overturn rate is illustrative and depends on how often right actions are appealed: hate ${hateSens} at 4% / 8% / 12%.`,
      2
    ),
  ],
};

export default spec;
