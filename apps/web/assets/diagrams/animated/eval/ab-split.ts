import type { DiagramSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";

// Sticky user buckets for a prompt A/B test (ab-testing-prompts-models, Architecture). Brightpost's support assistant
// sends 200,000 requests a day; half the users get the current prompt (A), half a rewritten one (B).
//
// Four steps: 1 a request arrives carrying a user id · 2 the assignment layer computes bucket = hash(salt + user id)
// mod 100: buckets 0-49 are arm A, 50-99 are arm B, so the same user always lands in the same arm (the example user,
// 8812, falls in bucket 37, an invented value for illustration) · 3 the assignment is written to an exposure log with
// the arm, before the model answers · 4 each arm's answers are scored, and the metrics are computed per arm: the
// primary metric (resolution rate) and the guardrails (cost per conversation, p95 latency, hand-offs to a person),
// joined to the exposure log by user id. Nodes never move.
//
// Layout (880 × 470): user (95, 170) and assignment layer (300, 170), the accent; prompt A (535, 70) and prompt B
// (535, 270) fan out of it; exposure log (535, 400) below; metrics (775, 170) collect from A, B and the log.
// Colours (PROD_TONE, four tones plus neutral): the user orange (traffic), the assignment layer neutral (control),
// the two prompts green (the model), the log violet (a store), the metrics lime (a check).
// Fact check: salted-hash bucketing, a log of exposures and a sample-ratio check are the standard design of online
// controlled experiments (Kohavi, Tang and Xu, Trustworthy Online Controlled Experiments, 2020).

const spec: DiagramSpec = {
  title: "Sticky user buckets: one user, one prompt",
  width: 880,
  height: 470,
  steps: [
    { title: "A request arrives with a user id" },
    { title: "Hash the id into one of 100 buckets" },
    { title: "Write down who saw which arm" },
    { title: "Score each arm and compare" },
  ],
  zones: [],
  nodes: [
    {
      id: "user",
      label: "Customer",
      sub: "user 8812",
      icon: "users",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      x: 85,
      y: 170,
      w: 150,
    },
    {
      id: "assign",
      label: "Assignment layer",
      sub: "hash(salt + id) mod 100",
      icon: "hash",
      tone: PROD_TONE.infra,
      accent: true,
      step: 2,
      x: 345,
      y: 170,
      w: 190,
      h: 64,
    },
    {
      id: "a",
      label: "Prompt A",
      sub: "current: 0-49",
      icon: "prompt",
      tone: PROD_TONE.model,
      fill: "pastel",
      step: 2,
      x: 580,
      y: 70,
      w: 160,
    },
    {
      id: "b",
      label: "Prompt B",
      sub: "new: 50-99",
      icon: "prompt",
      tone: PROD_TONE.model,
      fill: "pastel",
      step: 2,
      x: 580,
      y: 270,
      w: 160,
    },
    {
      id: "log",
      label: "Exposure log",
      sub: "user, arm, time",
      icon: "log",
      tone: PROD_TONE.store,
      fill: "pastel",
      step: 3,
      x: 580,
      y: 400,
      w: 160,
    },
    {
      id: "metrics",
      label: "Metrics per arm",
      sub: "resolved, cost, p95",
      icon: "chart",
      tone: PROD_TONE.check,
      fill: "pastel",
      step: 4,
      x: 782,
      y: 170,
      w: 180,
    },
  ],
  edges: [
    {
      from: "user",
      to: "assign",
      label: "user id",
      packet: true,
      step: 2,
    },
    { from: "assign", to: "a", label: "bucket 37", packet: true, delay: 0.4, step: 2 },
    { from: "assign", to: "b", label: "50-99", packet: true, delay: 0.8, step: 2 },
    { from: "assign", to: "log", label: "arm", labelAt: 0.3, dashed: true, step: 3 },
    { from: "a", to: "metrics", label: "scored", packet: true, step: 4 },
    { from: "b", to: "metrics", label: "scored", packet: true, delay: 0.4, step: 4 },
    { from: "log", to: "metrics", label: "join", labelAt: 0.7, dashed: true, step: 4 },
  ],
};

export default spec;
