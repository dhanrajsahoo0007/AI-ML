import type { DiagramSpec } from "@/components/diagrams/types";
import { FLASH_SALE, PATTERN_TONE, n } from "@/components/diagrams/presets/patterns";

// A distributed job scheduler for hold expiry (workflows-and-job-scheduling, the Architecture figure).
// Five steps: 1 checkout writes one expiry job per hold into a job store bucketed by due time (16 partitions, each a
// sorted set scored by the due time) · 2 one scanner per partition polls every second for jobs whose due time has
// passed and moves them to a ready queue · 3 expiry workers lease jobs for 30 s and expire the hold only if it is
// still held, then delete the job · 4 a worker dies mid-job; it never deletes, so its lease runs out and the job is
// delivered again · 5 a failing job is put back with backoff (1 s, 2 s, 4 s); after the fifth failure it goes to the
// dead letters for a person to look at.
// Working: 500,000 holds in the first minute (illustrative: one per shopper) = 500,000 ÷ 60 = 8,333 a second, so
// 8,333 expiries a second from 12:10 to 12:11. At 20 ms per expiry (illustrative) that is 8,333 × 0.02 = 167 jobs in
// flight (Little's law), so 9 workers of 20 threads (180 slots). 8,333 ÷ 16 partitions = 521 due jobs per scanner
// poll.
// Layout (880 × 480): row 1 (y 100) checkout, job store, scanners; row 2 (y 280) holds DB, workers, ready queue;
// row 3 (y 420) the dead letters under the holds DB and the crashed worker under the queue.
// Colours (PATTERN_TONE): checkout and workers teal (compute), the job store and holds DB violet (stores), scanners
// and dead letters green (the pattern; scanners are the accent), the ready queue neutral (plumbing), the crashed
// worker red.
// Fact check (2026-11-16, SQS developer guide): an undeleted message "becomes visible again" when its visibility
// timeout (default 30 s) expires; a dead-letter queue catches messages that fail repeatedly.

const perSecond = Math.round(FLASH_SALE.shoppers / 60); // 8,333
const partitions = 16; // illustrative
const perPoll = Math.round(perSecond / partitions); // 521

const spec: DiagramSpec = {
  title: "Due-time buckets, scanners and leased workers",
  width: 880,
  height: 480,
  steps: [
    { title: "Store each job by due time" },
    { title: "A scanner per partition" },
    { title: "Workers lease jobs" },
    { title: "A worker dies: the lease runs out" },
    { title: "Retry with backoff, then dead-letter" },
  ],
  zones: [],
  nodes: [
    {
      id: "checkout",
      label: "Checkout",
      sub: `${n(perSecond)} holds/s`,
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 115,
      y: 100,
      w: 190,
    },
    {
      id: "store",
      label: "Job store",
      sub: `${partitions} sorted sets`,
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 430,
      y: 100,
      w: 190,
    },
    {
      id: "scan",
      label: "Scanners",
      sub: "1 per partition",
      icon: "clock",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 2,
      x: 745,
      y: 100,
      w: 190,
    },
    {
      id: "queue",
      label: "Ready queue",
      sub: "30 s lease",
      icon: "queue",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      step: 2,
      x: 745,
      y: 280,
      w: 190,
    },
    {
      id: "workers",
      label: "Expiry workers",
      sub: "9 × 20 threads",
      icon: "workers",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 3,
      x: 430,
      y: 280,
      w: 190,
    },
    {
      id: "db",
      label: "Holds DB",
      sub: "expire if held",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 3,
      x: 115,
      y: 280,
      w: 190,
    },
    {
      id: "crashed",
      label: "Crashed worker",
      sub: "never deletes",
      icon: "server",
      tone: PATTERN_TONE.fail,
      fill: "pastel",
      step: 4,
      x: 745,
      y: 420,
      w: 190,
    },
    {
      id: "dlq",
      label: "Dead letters",
      sub: "after 5 failures",
      icon: "queue",
      tone: PATTERN_TONE.pattern,
      fill: "pastel",
      step: 5,
      x: 115,
      y: 420,
      w: 190,
    },
  ],
  edges: [
    { from: "checkout", to: "store", label: "add at due time", packet: true, step: 1 },

    { from: "store", to: "scan", label: `≤ ${n(perPoll)} due`, packet: true, step: 2 },
    { from: "scan", to: "queue", label: "enqueue", packet: true, step: 2 },

    { from: "queue", to: "workers", label: "lease 30 s", packet: true, step: 3 },
    { from: "workers", to: "db", label: "expire if held", packet: true, step: 3 },

    { from: "crashed", to: "queue", label: "visible again", tone: PATTERN_TONE.fail, dashed: true, step: 4 },

    { from: "workers", to: "store", label: "retry 1, 2, 4 s", dashed: true, step: 5 },
    { from: "workers", to: "dlq", label: "5th failure", step: 5 },
  ],
};

export default spec;
