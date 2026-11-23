import type { DiagramSpec } from "@/components/diagrams/types";
import { FLASH_SALE, ORDER, PATTERN_TONE, n } from "@/components/diagrams/presets/patterns";

// Why "a cron job scans the holds table every minute" fails (workflows-and-job-scheduling, first figure).
// Two steps: 1 one cron node runs at 12:11 to expire the 500,000 holds created between 12:00 and 12:01; it dies
// after 200,000 rows and nothing resumes the run, so 300,000 holds stay held and their kettles stay off sale · 2 a
// second cron node is added for high availability with the same schedule; both read hold 4471 and both put its
// kettle back, so the stock count goes up twice for one kettle and the shop can sell it twice.
// Working: 500,000 holds due in one run (FLASH_SALE.shoppers, illustrative: one hold per shopper); the crash point
// 200,000 is illustrative, so 500,000 − 200,000 = 300,000 holds are stuck.
// Layout (880 × 400): cron nodes in a column at x 120, the stores at x 445, the broken outcomes at x 770.
// Colours (PATTERN_TONE): cron nodes teal (compute), the holds table and the stock row violet (stores), the broken
// outcomes red (fail).
// Fact check (2026-11-16, Kubernetes CronJob docs): "there are certain circumstances where two Jobs might be created,
// or no Job might be created", so jobs "should be idempotent".

const due = FLASH_SALE.shoppers;
const doneBeforeCrash = 200_000; // illustrative
const stuck = due - doneBeforeCrash;

const spec: DiagramSpec = {
  title: "One cron node dies or runs twice",
  width: 880,
  height: 400,
  steps: [{ title: "One cron node dies mid-run" }, { title: "Two cron nodes run the same job" }],
  zones: [],
  nodes: [
    {
      id: "cronA",
      label: "Cron node A",
      sub: "runs at 12:11",
      icon: "clock",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 120,
      y: 110,
      w: 180,
    },
    {
      id: "holds",
      label: "Holds table",
      sub: `${n(due)} due at 12:11`,
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 445,
      y: 110,
      w: 200,
    },
    {
      id: "stuck",
      label: `${n(stuck)} stuck`,
      sub: "kettles off sale",
      icon: "lock",
      tone: PATTERN_TONE.fail,
      fill: "pastel",
      x: 770,
      y: 110,
      w: 190,
    },
    {
      id: "cronB",
      label: "Cron node B",
      sub: "same schedule (HA)",
      icon: "clock",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 2,
      x: 120,
      y: 300,
      w: 180,
    },
    {
      id: "stock",
      label: "Kettle stock",
      sub: `+1 for hold ${ORDER.orderId}`,
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 2,
      x: 445,
      y: 300,
      w: 200,
    },
    {
      id: "twice",
      label: "Released twice",
      sub: "one kettle sold twice",
      icon: "ticket",
      tone: PATTERN_TONE.fail,
      fill: "pastel",
      step: 2,
      x: 770,
      y: 300,
      w: 190,
    },
  ],
  edges: [
    { from: "cronA", to: "holds", label: "scan due holds", packet: true },
    { from: "holds", to: "stuck", label: "A dies mid-run", tone: PATTERN_TONE.fail, dashed: true },

    { from: "cronA", to: "stock", label: "+1 kettle", packet: true, step: 2 },
    { from: "cronB", to: "stock", label: "+1 kettle again", tone: PATTERN_TONE.fail, packet: true, step: 2 },
    { from: "stock", to: "twice", dashed: true, step: 2 },
  ],
};

export default spec;
