import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

// Brightpost's pipeline from one commit to production (cloud/operations/ci-cd-and-deployment-strategies).
// Step 1: CI builds and tests each commit once. Step 2: the image is scanned, signed and stored in the registry under
// one digest. Step 3: CD promotes that same digest to staging, runs a smoke test, waits for an approval and deploys it
// to production. Step 4: a rollback redeploys the previous digest, and a change freeze holds the approval gate shut.
//
// Geometry: the CI row is a group at y 34-134 with five boxes (w 128, gaps 26) at y 62-116, from x 25 to 769. The
// registry box sits alone at x 290-505, y 172-228. The CD row is a group at y 270-410 with four boxes at y 300-354 and
// two notes underneath (y 362-398). Sign reaches the registry down x 705 and along y 200; the rollback leaves
// production up x 682 and runs along y 222, so the two paths never touch. The registry feeds staging through a bend
// at (150, 250), which enters the CD group right of its short "Deliver" tab. Nothing sits in the top-right corner,
// where the figure's pause button is drawn. Labels fit width - 8 at 6.2 px per character.

const CI = [
  { id: "commit", x: 25, label: "Commit", sub: "v1.9 merged", tone: "neutral", step: 1 },
  { id: "build", x: 179, label: "Build", sub: "one image", tone: "teal", step: 1 },
  { id: "test", x: 333, label: "Test", sub: "unit tests", tone: "teal", step: 1 },
  { id: "scan", x: 487, label: "Scan", sub: "known flaws", tone: "red", step: 2 },
  { id: "sign", x: 641, label: "Sign", sub: "pipeline's key", tone: "red", step: 2 },
] as const;

const CD = [
  { id: "staging", x: 25, w: 165, label: "Staging", sub: "test account", tone: "teal" },
  { id: "smoke", x: 215, w: 165, label: "Smoke test", sub: "one test order", tone: "teal" },
  { id: "approval", x: 405, w: 165, label: "Approval", sub: "a second engineer", tone: "orange" },
  { id: "prod", x: 595, w: 174, label: "Production", sub: "canary, then 100%", tone: "green" },
] as const;

const shapes: LayoutShape[] = [
  // Step 1 and 2: CI runs once per commit.
  ...CI.map((b): LayoutShape => ({
    id: b.id,
    type: "box",
    x: b.x,
    y: 62,
    w: 128,
    h: 54,
    label: b.label,
    sub: b.sub,
    tone: b.tone,
    step: b.step,
  })),
  { id: "a-commit-build", type: "arrow", x: 0, y: 0, from: "commit", to: "build", tone: "neutral" },
  { id: "a-build-test", type: "arrow", x: 0, y: 0, from: "build", to: "test", tone: "neutral" },
  { id: "a-test-scan", type: "arrow", x: 0, y: 0, from: "test", to: "scan", tone: "neutral", step: 2 },
  { id: "a-scan-sign", type: "arrow", x: 0, y: 0, from: "scan", to: "sign", tone: "neutral", step: 2 },

  // Step 2: one image, one digest, stored once.
  {
    id: "registry",
    type: "box",
    x: 290,
    y: 172,
    w: 215,
    h: 56,
    label: "Registry",
    sub: "v1.9 = sha256:9c1e…",
    tone: "orange",
    step: 2,
    highlight: true,
  },
  {
    id: "a-sign-registry",
    type: "arrow",
    x: 0,
    y: 0,
    from: "sign",
    to: "registry",
    via: [[705, 200]],
    tone: "orange",
    packet: true,
    step: 2,
  },

  // Step 3: CD moves the same digest from one environment to the next.
  ...CD.map((b): LayoutShape => ({
    id: b.id,
    type: "box",
    x: b.x,
    y: 300,
    w: b.w,
    h: 54,
    label: b.label,
    sub: b.sub,
    tone: b.tone,
    step: 3,
  })),
  {
    id: "a-registry-staging",
    type: "arrow",
    x: 0,
    y: 0,
    from: "registry",
    to: "staging",
    via: [[150, 250]],
    tone: "orange",
    packet: true,
    step: 3,
  },
  { id: "a-staging-smoke", type: "arrow", x: 0, y: 0, from: "staging", to: "smoke", tone: "neutral", step: 3 },
  { id: "a-smoke-approval", type: "arrow", x: 0, y: 0, from: "smoke", to: "approval", tone: "neutral", step: 3 },
  { id: "a-approval-prod", type: "arrow", x: 0, y: 0, from: "approval", to: "prod", tone: "neutral", step: 3 },
  {
    id: "same-bytes",
    type: "text",
    x: 25,
    y: 362,
    w: 355,
    h: 36,
    label: "Same digest everywhere; only settings differ",
    tone: "teal",
    step: 3,
  },

  // Step 4: going back is a redeploy of the digest that worked, and a freeze keeps the gate shut.
  {
    id: "a-rollback",
    type: "arrow",
    x: 0,
    y: 0,
    from: "prod",
    to: "registry",
    via: [[682, 222]],
    label: "roll back: previous digest",
    tone: "red",
    dashed: true,
    step: 4,
  },
  {
    id: "freeze",
    type: "text",
    x: 405,
    y: 362,
    w: 364,
    h: 36,
    label: "Freeze: the gate stays shut in sale week",
    tone: "red",
    step: 4,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "From one commit to production: build once, promote the same digest",
  width: 795,
  height: 420,
  groups: [
    { id: "ci", title: "CI: every commit", tone: "teal", x: 10, y: 34, w: 775, h: 100 },
    { id: "cd", title: "Deliver", tone: "orange", x: 10, y: 270, w: 775, h: 140 },
  ],
  shapes,
  steps: [
    { title: "CI: build and test each commit once" },
    { title: "Scan, sign and store one digest" },
    { title: "CD: the same digest through staging, approval, production" },
    { title: "Roll back to the previous digest; freeze the gate" },
  ],
};

export default spec;
