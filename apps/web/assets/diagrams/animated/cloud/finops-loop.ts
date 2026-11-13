import type { LayoutSpec } from "@/components/diagrams/types";

// FinOps as a loop: see, decide, act, then see again (cloud/operations/finops-and-cost-tools).
// The "See" column holds what the cloud's own tools give you; "Decide" and "Act" hold team habits.
// Step 1: see (cost reports, the billing export, alerts, advice). Step 2: decide (the monthly review, an owner per
// line, cost per order, three actions). Step 3: act (switch off, rightsize, clean storage, fix tags). Step 4: the
// arrow back to "See": next month's numbers show whether the actions worked.
//
// Geometry: three groups of equal width (x 20, 275, 530; 230 wide) with a header box at y 70 and four item boxes
// at y 150, 212, 274 and 336 (200 × 48). Header boxes are joined left to right; the loop arrow runs under the
// three groups at y 432 from the last "Act" box back to the last "See" box. Box labels fit their width at 6.2 px per
// character.
const COLS = [35, 290, 545];
const ITEM_Y = [150, 212, 274, 336];

function item(
  id: string,
  col: number,
  row: number,
  label: string,
  sub: string,
  tone: "blue" | "orange" | "green",
  step: number
) {
  return { id, type: "box" as const, x: COLS[col], y: ITEM_Y[row], w: 200, h: 48, label, sub, tone, step };
}

const spec: LayoutSpec = {
  kind: "layout",
  title: "FinOps: see, decide, act",
  width: 780,
  height: 470,
  groups: [
    { id: "g-see", title: "Cloud tools, daily", tone: "blue", x: 20, y: 40, w: 230, h: 365 },
    { id: "g-decide", title: "Team habit, monthly", tone: "orange", x: 275, y: 40, w: 230, h: 365 },
    { id: "g-act", title: "Owners, that week", tone: "green", x: 530, y: 40, w: 230, h: 365 },
  ],
  shapes: [
    // Step 1: see.
    {
      id: "see",
      type: "box",
      x: 35,
      y: 70,
      w: 200,
      h: 56,
      label: "1. See",
      sub: "where the money goes",
      tone: "blue",
      highlight: true,
    },
    item("see-reports", 0, 0, "Cost reports", "by account and tag", "blue", 1),
    item("see-export", 0, 1, "Billing export", "every row, every day", "blue", 1),
    item("see-alerts", 0, 2, "Alerts", "forecast and spikes", "blue", 1),
    item("see-advice", 0, 3, "Advice", "rightsizing, storage", "blue", 1),

    // Step 2: decide.
    { id: "d1", type: "arrow", x: 0, y: 0, from: "see", to: "decide", tone: "neutral", step: 2 },
    {
      id: "decide",
      type: "box",
      x: 290,
      y: 70,
      w: 200,
      h: 56,
      label: "2. Decide",
      sub: "what to change",
      tone: "orange",
      step: 2,
    },
    item("dec-review", 1, 0, "Monthly review", "45 minutes, both teams", "orange", 2),
    item("dec-owner", 1, 1, "An owner per line", "untagged share falls", "orange", 2),
    item("dec-unit", 1, 2, "Cost per order", "the number to watch", "orange", 2),
    item("dec-pick", 1, 3, "Pick 3 actions", "largest saving first", "orange", 2),

    // Step 3: act.
    { id: "a1", type: "arrow", x: 0, y: 0, from: "decide", to: "act", tone: "neutral", step: 3 },
    {
      id: "act",
      type: "box",
      x: 545,
      y: 70,
      w: 200,
      h: 56,
      label: "3. Act",
      sub: "engineers change it",
      tone: "green",
      step: 3,
    },
    item("act-off", 2, 0, "Switch off", "idle and forgotten", "green", 3),
    item("act-size", 2, 1, "Rightsize", "one size smaller", "green", 3),
    item("act-store", 2, 2, "Clean up storage", "old snapshots and logs", "green", 3),
    item("act-tags", 2, 3, "Fix tags", "then require them", "green", 3),

    // Step 4: the loop closes.
    {
      id: "loop",
      type: "arrow",
      x: 0,
      y: 0,
      from: "act-tags",
      to: "see-advice",
      via: [
        [645, 432],
        [135, 432],
      ],
      label: "next month's numbers show the result",
      tone: "neutral",
      dashed: true,
      packet: true,
      step: 4,
    },
  ],
  steps: [
    { title: "See: the cloud's cost tools" },
    { title: "Decide: a monthly review" },
    { title: "Act: owners make the change" },
    { title: "Look again next month" },
  ],
};

export default spec;
