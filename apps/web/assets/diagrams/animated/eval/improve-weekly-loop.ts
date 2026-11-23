import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import {
  WEEK,
  canaryRequests,
  goldenAfter,
  passAfter,
  passBefore,
  pct,
  rateAfter,
  rateBefore,
} from "@/components/diagrams/presets/production-improve";

// One week of the loop at Brightpost, day by day (continuous-improvement-pipeline, Worked example). ALL COUNTS ARE
// ILLUSTRATIVE (presets/production-improve.ts); the 50-trace sample and the 14 refund failures match the error-analysis
// figure on the evaluation fundamentals page.
//   Mon: read 50 thumbs-down traces; 14 are a refund over £30 sent with no approval: 14 ÷ 50 = 28 %.
//   Tue: the 14 become test cases: 200 + 14 = 214.
//   Wed: the rule becomes a check in the refund tool; offline: 172 of 214 pass before (172 old + 0 new), 187 after
//        (172 + 5 fixed − 3 broken + 13 new): 80.4 % → 87.4 %.
//   Thu: read the 3 broken cases, fix, then a 5 % canary: 200,000 × 0.05 = 10,000 requests a day.
//   Fri: 25 % at 09:00, 100 % at 15:00 if the gates hold; the next Monday's 50 traces hold 3 refund failures (was 14).
// Five steps: one day each, the earlier days stay. Grid: five columns, x = 20 + 172 × i (w 160); day boxes y 24 (h 60),
// notes y 98 (four lines), number boxes y 218 (h 54); the loop-back arrow y 316.
// Colours (PROD_TONE, four tones plus neutral): Mon and Tue blue (data), Wed green (the change), Thu lime (the check),
// Fri orange (traffic); the number boxes use soft fills of the day's tone.

const COL = (i: number) => 20 + 172 * i;
const W = 160;

const days = [
  {
    day: "Monday",
    sub: "Mine the failures",
    tone: PROD_TONE.data,
    note: `Read ${WEEK.sample} thumbs-down\ntraces. ${WEEK.topCount} are a refund\nover £${WEEK.limit}, sent with\nno approval.`,
    big: pct(WEEK.topCount / WEEK.sample, 0),
    small: `of ${WEEK.sample} traces`,
  },
  {
    day: "Tuesday",
    sub: "Write the test cases",
    tone: PROD_TONE.data,
    note: `Add the ${WEEK.newCases} failures as\ncases, de-identified;\ntwo people agree\non each label.`,
    big: `${goldenAfter}`,
    small: `${WEEK.goldenBefore} + ${WEEK.newCases} cases`,
  },
  {
    day: "Wednesday",
    sub: "Change it, test it",
    tone: PROD_TONE.model,
    note: `Move the rule into a\ncode check in the refund\ntool. Offline: ${passBefore} to\n${passAfter} of ${goldenAfter} pass.`,
    big: pct(rateAfter),
    small: `offline, was ${pct(rateBefore)}`,
  },
  {
    day: "Thursday",
    sub: "Check it on live traffic",
    tone: PROD_TONE.check,
    note: `Read the ${WEEK.broken} cases it\nbroke: 2 judge noise,\n1 real; fix it. Then a\n${pct(WEEK.canaryShare, 0)} canary for a day.`,
    big: n(canaryRequests),
    small: "canary requests a day",
  },
  {
    day: "Friday",
    sub: "Promote",
    tone: PROD_TONE.traffic,
    note: "25 % at 09:00, 100 % at\n15:00 if the gates hold;\nrollback stays one\nclick away.",
    big: pct(WEEK.nextMondayCount / WEEK.sample, 0),
    small: `next Monday, was 28 %`,
  },
] as const;

const shapes: LayoutShape[] = [];
days.forEach((d, i) => {
  const step = i + 1;
  // Lint allows three lines a label: the note is two text shapes of two lines each.
  const lines = d.note.split("\n");
  [lines.slice(0, 2), lines.slice(2)].forEach((chunk, k) =>
    shapes.push({
      id: `n${i}-${k}`,
      type: "text",
      x: COL(i),
      y: 98 + k * 28,
      w: W,
      h: 36,
      label: chunk.join("\n"),
      tone: PROD_TONE.infra,
      quiet: true,
      step,
    })
  );
  shapes.push(
    {
      id: `d${i}`,
      type: "box",
      x: COL(i),
      y: 24,
      w: W,
      h: 60,
      label: d.day,
      sub: d.sub,
      tone: d.tone,
      fill: "pastel",
      step,
    },
    {
      id: `v${i}`,
      type: "box",
      x: COL(i),
      y: 200,
      w: W,
      h: 60,
      label: d.big,
      sub: d.small,
      tone: d.tone,
      fill: "soft",
      step,
    }
  );
  if (i > 0) shapes.push({ id: `a${i}`, type: "arrow", x: 0, y: 0, from: `d${i - 1}`, to: `d${i}`, step });
});
shapes.push({
  id: "loop",
  type: "arrow",
  x: 40,
  y: 316,
  w: 800,
  h: 0,
  label: "next Monday's traces start the next loop",
  step: 5,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "One week of the improvement loop at Brightpost",
  width: 880,
  height: 346,
  steps: [
    { title: "Monday: read the failures" },
    { title: "Tuesday: turn them into test cases" },
    { title: "Wednesday: change it and test it offline" },
    { title: "Thursday: a small live canary" },
    { title: "Friday: promote" },
  ],
  shapes,
};

export default spec;
