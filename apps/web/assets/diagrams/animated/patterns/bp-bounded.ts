import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP } from "@/components/diagrams/presets/patterns";

// From an unbounded queue to admission control, priority and per-tenant fairness (back-pressure, the Architecture
// figure).
// Four steps: 1 300 orders/s go straight into a queue that the order service drains at 250/s: it grows by 50/s
// · 2 admission control caps the queue at 2,500 (10 s of work) and answers the surplus at once with 429 and
// Retry-After · 3 sheddable work (receipt emails, order history) gets its own queue that is served only when the
// checkout queue is empty and is shed first · 4 a seller's bulk import is a tenant with a quota, so it cannot fill the
// queue that shoppers need.
// Working: 300 − 250 = 50 rejected a second at the cap; 2,500 ÷ 250 = 10 s of work.
// Layout (880 × 440): producers at x 90, admission control at x 300, queues at x 530, the order service at x 760.
// Colours (PATTERN_TONE): shoppers and the seller import orange (traffic), admission control lime (a check), the
// queues neutral (plumbing), the order service teal (compute), fast rejections red.

const OUT = 250;
const CAP = 2_500;

const spec: DiagramSpec = {
  title: "Bounded queue, rejection, priority and fairness",
  width: 880,
  height: 440,
  steps: [
    { title: "No limit: the queue grows" },
    { title: "A bound and a fast 429" },
    { title: "Shed low priority first" },
    { title: "One tenant cannot fill it" },
  ],
  zones: [],
  nodes: [
    {
      id: "shoppers",
      label: "Shoppers",
      sub: `${SHOP.peakOrdersPerSecond} orders/s`,
      icon: "users",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 85,
      y: 210,
      w: 140,
    },
    {
      id: "queue",
      label: "Checkout queue",
      sub: `drained at ${OUT}/s`,
      icon: "queue",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      x: 563,
      y: 210,
      w: 175,
    },
    {
      id: "svc",
      label: "Order service",
      sub: `${OUT} orders/s`,
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 790,
      y: 210,
      w: 150,
    },
    {
      id: "adm",
      label: "Admission control",
      sub: `cap ${CAP.toLocaleString("en-GB")} = 10 s`,
      icon: "shield",
      tone: PATTERN_TONE.check,
      accent: true,
      step: 2,
      x: 320,
      y: 210,
      w: 180,
    },
    {
      id: "reject",
      label: "429 + Retry-After",
      sub: "50/s, answered at once",
      icon: "signal",
      tone: PATTERN_TONE.fail,
      fill: "soft",
      step: 2,
      x: 320,
      y: 370,
      w: 190,
    },
    {
      id: "low",
      label: "Sheddable queue",
      sub: "receipts, history",
      icon: "queue",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      step: 3,
      x: 563,
      y: 370,
      w: 175,
    },
    {
      id: "seller",
      label: "Seller import",
      sub: "one tenant, bulk",
      icon: "file",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      step: 4,
      x: 85,
      y: 60,
      w: 140,
    },
  ],
  edges: [
    { from: "shoppers", to: "queue", label: "300/s in, +50/s", tone: PATTERN_TONE.fail, packet: true, until: 1 },
    { from: "queue", to: "svc", label: `${OUT}/s`, packet: true },
    { from: "shoppers", to: "adm", label: "300/s", packet: true, step: 2 },
    { from: "adm", to: "queue", label: `${OUT}/s`, packet: true, step: 2 },
    { from: "adm", to: "reject", label: "over the cap", tone: PATTERN_TONE.fail, step: 2 },
    { from: "adm", to: "low", label: "sheddable", step: 3 },
    { from: "low", to: "svc", label: "when idle", dashed: true, step: 3 },
    { from: "seller", to: "adm", label: "quota: 5 %", packet: true, step: 4 },
  ],
};

export default spec;
