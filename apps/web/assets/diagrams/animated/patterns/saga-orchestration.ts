import type { DiagramSpec } from "@/components/diagrams/types";
import { ORDER, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// An orchestrated saga for order 4471 (saga, the Architecture figure): payment, stock and shipping, each a local
// transaction in its own service, driven by a state machine that records every step.
// Five steps: 1 the orchestrator records "saga 4471 started" · 2 charge payment · 3 reserve stock · 4 book a courier
// (the happy path ends here) · 5 the failure path: stock is out, so the orchestrator refunds the payment.
// Layout (860 × 450): orchestrator (accent) at x 330 with its state store below; services in a column at x 690. The
// refund edge is routed above the happy-path edges.
// Colours (PATTERN_TONE): orchestrator green (the pattern), saga state violet (store), services teal (compute), the
// refund dashed (a compensation, not a failure of its own).

const spec: DiagramSpec = {
  title: "An orchestrated saga for one order",
  width: 860,
  height: 450,
  steps: [
    { title: "Start the saga and record it" },
    { title: "Charge the payment" },
    { title: "Reserve the stock" },
    { title: "Book a courier" },
    { title: "Stock fails: refund the payment" },
  ],
  zones: [
    {
      id: "svcs",
      title: "Services",
      tone: PATTERN_TONE.compute,
      x: 590,
      y: 30,
      w: 210,
      h: 400,
    },
  ],
  nodes: [
    {
      id: "orch",
      label: "Order saga",
      sub: "state machine",
      icon: "workflow",
      tone: PATTERN_TONE.pattern,
      accent: true,
      x: 330,
      y: 225,
      w: 180,
    },
    {
      id: "state",
      label: "Saga state",
      sub: `order ${ORDER.orderId}: step 2`,
      icon: "log",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 330,
      y: 385,
      w: 180,
    },

    {
      id: "pay",
      label: "Payment",
      sub: "charge, refund",
      icon: "coin",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 2,
      x: 695,
      y: 95,
      w: 170,
    },
    {
      id: "stock",
      label: "Stock",
      sub: "reserve, release",
      icon: "database",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 3,
      x: 695,
      y: 225,
      w: 170,
    },
    {
      id: "ship",
      label: "Shipping",
      sub: "book, cancel",
      icon: "map",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 4,
      x: 695,
      y: 355,
      w: 170,
    },
  ],
  edges: [
    { from: "orch", to: "state", label: "record each step", bidirectional: true },

    { from: "orch", to: "pay", label: `charge £${ORDER.price}`, packet: true, step: 2 },
    { from: "orch", to: "stock", label: "reserve kettle", packet: true, delay: 0.5, step: 3 },
    { from: "orch", to: "ship", label: "book courier", packet: true, delay: 1, step: 4 },

    {
      from: "orch",
      to: "pay",
      label: `stock failed: refund £${ORDER.price}`,
      dashed: true,
      step: 5,
      via: [
        [330, 60],
        [560, 60],
      ],
    },
  ],
};

export default spec;
