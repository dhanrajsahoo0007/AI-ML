import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST } from "@/components/diagrams/presets/agents";

// Plan-and-execute on the Brightpost refund (agent-architectures, Deep dive; replaces the old state diagram). The
// planner writes a three-step plan; the executor runs one step at a time; step 2 finds nothing, so the planner
// rewrites it; step 3 runs; a review checks the goal before the run ends.
//
// Five steps: 1 the plan · 2 step 1 done · 3 step 2 finds nothing · 4 re-plan: a new step 2 · 5 step 3 and the review.
//
// Layout: planner (top left) and executor (below it) at x 20–170; the plan's rows at x 230–530 (rows 50, 118, 186,
// 254; the row at 186 stays empty until the re-plan fills it); one status cell per row at x 550–690; the review under
// the status column. The planner hands the plan down to the executor; the executor's arrows share one
// vertical bus at x 200 and enter each row from the left. The re-plan arrow leaves the
// failed status cell to the right, climbs at x 712 and runs along y 22 to the planner, clear of the other cells.
//
// Colour (agents legend, four tones plus neutral): planner, executor and plan rows' authors green; the plan rows are
// state (violet); done is a check (lime); the failed step is red.

const ROW = [50, 118, 186, 254] as const;
const H = 44;

const item = (id: string, row: number, label: string, step: number): LayoutShape => ({
  id,
  type: "box",
  x: 230,
  y: ROW[row],
  w: 300,
  h: H,
  label,
  tone: AGENT_TONE.memory,
  fill: "pastel",
  step,
});

const status = (id: string, row: number, label: string, ok: boolean, step: number): LayoutShape => ({
  id,
  type: "cell",
  x: 550,
  y: ROW[row],
  w: 140,
  h: H,
  label,
  tone: ok ? AGENT_TONE.check : AGENT_TONE.failure,
  fill: "pastel",
  step,
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

const spec: LayoutSpec = {
  kind: "layout",
  title: "Plan-and-execute: plan, run, re-plan, review",
  width: 730,
  height: 384,
  steps: [
    { title: "The planner writes a three-step plan" },
    { title: "The executor runs step 1" },
    { title: "Step 2 finds nothing" },
    { title: "The planner rewrites step 2" },
    { title: "Step 3 runs and a review checks the goal" },
  ],
  shapes: [
    {
      id: "planner",
      type: "box",
      x: 20,
      y: 50,
      w: 150,
      h: 52,
      label: "Planner",
      sub: "writes the plan",
      tone: AGENT_TONE.model,
      fill: "pastel",
    },
    item("p1", 0, `1. Look up order ${BRIGHTPOST.orderId}`, 1),
    item("p2", 1, '2. Search "kettle refund"', 1),
    item("p3", 3, `3. Refund £${BRIGHTPOST.price} if allowed`, 1),

    {
      id: "executor",
      type: "box",
      x: 20,
      y: 186,
      w: 150,
      h: 52,
      label: "Executor",
      sub: "one step at a time",
      tone: AGENT_TONE.model,
      fill: "pastel",
      step: 2,
    },
    arrow("plan", "planner", "executor", 2, { label: "plan" }),
    arrow("x1", "executor", "p1", 2, {
      via: [
        [200, 212],
        [200, ROW[0] + 22],
      ],
    }),
    status("s1", 0, `kettle, £${BRIGHTPOST.price}`, true, 2),
    arrow("r1", "p1", "s1", 2),

    arrow("x2", "executor", "p2", 3, {
      via: [
        [200, 212],
        [200, ROW[1] + 22],
      ],
    }),
    status("s2", 1, "no match", false, 3),
    arrow("r2", "p2", "s2", 3),

    arrow("replan", "s2", "planner", 4, {
      via: [
        [712, ROW[1] + 22],
        [712, 22],
        [95, 22],
      ],
      dashed: true,
      label: "re-plan",
    }),
    item("p2b", 2, `2′. Search "${BRIGHTPOST.helpQuery}"`, 4),
    arrow("x2b", "executor", "p2b", 4, {
      via: [
        [200, 212],
        [200, ROW[2] + 22],
      ],
    }),
    status("s2b", 2, BRIGHTPOST.helpArticle, true, 4),
    arrow("r2b", "p2b", "s2b", 4),

    arrow("x3", "executor", "p3", 5, {
      via: [
        [200, 212],
        [200, ROW[3] + 22],
      ],
    }),
    status("s3", 3, "waits for approval", true, 5),
    arrow("r3", "p3", "s3", 5),
    {
      id: "review",
      type: "box",
      x: 550,
      y: 320,
      w: 140,
      h: 44,
      label: "Review",
      sub: "goal met?",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 5,
    },
    arrow("rv", "s3", "review", 5),
  ],
};

export default spec;
