import type { LayoutSpec } from "@/components/diagrams/types";

// SLI, SLO and SLA as three rungs (cloud/operations/slos-alerting-and-on-call), with Brightpost's numbers for the
// order path: measured 99.96% this month, an internal SLO of 99.9% (about 43 minutes a month) and a contract SLA of
// 99.5% (about 3.6 hours a month, set on resilience/availability-math). The margin between the SLO and the SLA is
// about 2.9 hours a month: time to notice and fix before any credit is owed.
// Step 1: the measurement. Step 2: the target the team acts on. Step 3: the promise and the margin under it.
//
// Geometry: the rungs are boxes in a left column (x 30-300) at y 30, 140 and 250, joined by vertical arrows. A right
// column (x 340-610) says what each rung is for, level with its rung. Box labels fit their width at 6.2 px per
// character.
const spec: LayoutSpec = {
  kind: "layout",
  title: "SLI, SLO and SLA",
  width: 640,
  height: 370,
  shapes: [
    // Step 1: what was measured.
    {
      id: "sli",
      type: "box",
      x: 30,
      y: 30,
      w: 270,
      h: 58,
      label: "SLI: 99.96% this month",
      sub: "measured: good checkouts ÷ all",
      tone: "blue",
    },
    {
      id: "sli-note",
      type: "text",
      x: 340,
      y: 50,
      w: 270,
      h: 20,
      label: "A count of what shoppers saw",
      tone: "blue",
    },

    // Step 2: the internal target.
    { id: "a1", type: "arrow", x: 0, y: 0, from: "sli", to: "slo", label: "checked against", tone: "neutral", step: 2 },
    {
      id: "slo",
      type: "box",
      x: 30,
      y: 140,
      w: 270,
      h: 58,
      label: "SLO: 99.9%",
      sub: "our target: about 43 min a month",
      tone: "orange",
      step: 2,
    },
    {
      id: "acts",
      type: "box",
      x: 340,
      y: 140,
      w: 270,
      h: 58,
      label: "The team acts here",
      sub: "alerts, freezes, reviews",
      tone: "orange",
      step: 2,
    },

    // Step 3: the outside promise, and the margin between the two.
    { id: "a2", type: "arrow", x: 0, y: 0, from: "slo", to: "sla", label: "kept above", tone: "neutral", step: 3 },
    {
      id: "sla",
      type: "box",
      x: 30,
      y: 250,
      w: 270,
      h: 58,
      label: "SLA: 99.5%",
      sub: "the contract: about 3.6 h a month",
      tone: "red",
      step: 3,
    },
    {
      id: "margin",
      type: "box",
      x: 340,
      y: 250,
      w: 270,
      h: 58,
      label: "Margin: about 2.9 h a month",
      sub: "time to fix before credits are owed",
      tone: "green",
      highlight: true,
      step: 3,
    },
    {
      id: "sla-note",
      type: "text",
      x: 30,
      y: 330,
      w: 270,
      h: 20,
      label: "Below this line, credits are owed",
      tone: "red",
      step: 3,
    },
  ],
  steps: [
    { title: "The SLI: what was measured" },
    { title: "The SLO: the target the team acts on" },
    { title: "The SLA: the promise, set lower on purpose" },
  ],
};

export default spec;
