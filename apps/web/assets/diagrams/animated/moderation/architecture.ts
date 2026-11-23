import type { DiagramEdge, DiagramNode, DiagramSpec } from "@/components/diagrams/types";
import { GENAI_TONE, HERO, genaiZones } from "@/components/diagrams/presets/genai-case";
import { LLM, PEOPLE, PLATFORM, STORAGE } from "@/components/diagrams/presets/gcase-moderation";

// Kestrel's content moderation system (genai-system-design/case-studies/content-moderation-system), the hero. Built one
// requirement at a time, exactly as the design sheet §8 lists it (SYSTEM-DESIGN/plans/genai-design/design/
// content-moderation-system.md, v3):
//   1 One classifier on every post (F1): Kestrel apps → post API → decision engine → text encoder; decision records.
//   2 Hash lists and rules first (F2, F9): hash and rules, PhotoDNA Cloud and the vendor CSEA model, hash banks.
//   3 Classifiers, global thresholds, three paths (F1, F3, N3): the check API joins the request (post API → engine is
//     replaced by post API → check API → engine) and the classifiers card replaces the engine's direct encoder call.
//   4 The policy-reading model where it can change a decision (F4, N4): hold and band queue, policy model, the
//     self-hosted text fallback, the policy registry (the engine reads each family's edges and policy version).
//   5 People by severity, reach and uncertainty (F5, N3): review queues, reviewers, the review app.
//   6 Enforcement, reasons, appeals, reports, legal clocks (F6–F9): enforcement and notices; users, notifiers, victims
//     and authorities (through the post API); the action ledger; the CSEA and NCII vaults.
//   7 Measure what was missed; change policy safely (F10, F11, N1, N2): prevalence and calibration sampler, policy gate,
//     gold sets.
//   8 Adversarial adaptation, close the loop (F12, N6): red team and retraining.
// Numbers (presets/gcase-moderation.ts): PLATFORM.units = 140M a day; LLM.enforcementCalls ≈ 3.68M model calls a day;
// PEOPLE.fte ≈ 1,492; STORAGE.decisionGbDay = 28 GB a day. Every volume is ILLUSTRATIVE (Kestrel is illustrative).
//
// Layout (1200 × 740, genaiZones() from presets/genai-case.ts). The pipeline has six cards in four rows 40 tall
// (y 104 | 160 | 212 | 264) and two columns (x 490 | 660); two slots stay empty so lines can pass:
//            x 490              x 660
//     104    Enforcement        ·  (enforcement's store lines leave through this slot)
//     160    Decision engine*   Hash and rules
//     212    Review queues      Classifiers
//     264    ·                  Hold and band queue
//   The request enters the engine along y 160 (post API at y 104 in step 1–2; check API at y 160 from step 3). The
//   pipeline runs engine → hash → classifiers → hold queue down the right column; the hold queue sends held positives
//   and escalations up-left to the review queues, a vetted hash match goes there too, and the review queues return each
//   decision to the engine, which acts through enforcement above it. The two diagonals use different row gaps.
//   Models and people, two columns x 490 | 660: policy model 400 (straight under the hold queue), text encoder 490,
//   PhotoDNA 580 on the right; fallback 400 (dashed, "provider down") and reviewers 560 on the left.
// Routing (every long edge checked against the boxes, glyph labels and zone tabs it passes):
//   - The services tab spans x 421–588 at y 316–344, so only the right column drops straight down (hold → model).
//   - The right gutter carries two lines: hash → PhotoDNA at x 759 (from y 170) and classifiers → encoder at x 747
//     (from y 212; in steps 1–2 the engine's own encoder call takes the same line from y 186). The inner line ends
//     higher, so neither crosses the other, and no card below y 170 sends a line to the right.
//   - The left gutter x 398 carries review queues → reviewers (from y 212, below the request line at 160).
//   - The review app reaches the reviewers along y 572 under the left gutter's end.
//   - Store lines leave the core above y 170 and step down right of the offline cards, the lower ones bending further
//     left: enforcement → ledger (straight, y 104), enforcement → vaults (y 118, bend x 1010), engine → records and
//     registry (a trunk through the row gap y 132, bend x 995), hash → banks (y 150, bend x 980).
//   - Offline cards (x 879: prevalence 330, red team 400, policy gate 470) reach the stores from below: prevalence →
//     gold sets down x 785 and along y 628; gold sets → gate along y 600 into the gate's foot; gate → registry along
//     y 572 (between the banks label and the gold glyph), up x 1160 into the registry's right side.
// Colours (GENAI_TONE roles): apps, users and the review app orange (user); reviewers orange (a person); the policy
// model, fallback, text encoder and PhotoDNA green (models); hash and rules, classifiers, the policy gate, prevalence and
// red team lime (checks); the hold and band queue and review queues lime (ranking: a routing decision); enforcement teal
// (it acts); stores violet glyphs; the post and check APIs neutral; the decision engine is the one accent.

const C = { clients: 105, edge: 297, left: 490, right: 660, async: 879, store: 1098 } as const;
const ROW = { r1: 104, r2: 160, r3: 212, r4: 264 } as const;
const SVC = { s1: 400, s2: 490, s3: 580, reviewers: 560 } as const;
const ASYNC = { prevalence: 330, redteam: 400, gate: 470 } as const;
const STORE = { ledger: 104, vaults: 206, records: 308, registry: 410, banks: 512, gold: 614 } as const;
const BEND = {
  vaults: 1010,
  trunk: 995,
  banks: 980,
  gutterIn: 747,
  gutterOut: 759,
  left: 398,
  gap: 132,
  glyphRight: 1160,
  async: 785,
} as const;
const W = 150;
const CH = 40;

const card = (
  id: string,
  label: string,
  sub: string,
  icon: string,
  x: number,
  y: number,
  step: number,
  extra: Partial<DiagramNode> = {}
): DiagramNode => ({ id, label, sub, icon, x, y, w: W, h: CH, step, fill: "pastel", ...extra });

const service = (id: string, label: string, sub: string, icon: string, x: number, y: number, step: number) =>
  card(id, label, sub, icon, x, y, step, { h: 44, tone: GENAI_TONE.model });

const store = (
  id: string,
  label: string,
  sub: string | undefined,
  icon: string,
  y: number,
  step: number
): DiagramNode => ({
  id,
  label,
  ...(sub ? { sub } : {}),
  icon,
  tone: GENAI_TONE.store,
  variant: "glyph",
  x: C.store,
  y,
  step,
});

const millions = (v: number, d = 2) => `${(v / 1e6).toFixed(d)}M`;
const engineTrunk = (y: number): [number, number][] => [
  [575, BEND.gap],
  [BEND.trunk, BEND.gap],
  [BEND.trunk, y],
];

const edges: DiagramEdge[] = [
  // Step 1: one classifier on every post.
  { from: "apps", to: "postApi", flow: true, packet: true },
  { from: "postApi", to: "engine", flow: true, packet: true, delay: 0.5, until: 2 },
  {
    from: "engine",
    to: "encoder",
    label: "score",
    labelAt: 0.62,
    bidirectional: true,
    via: [
      [575, 186],
      [BEND.gutterIn, 186],
      [BEND.gutterIn, SVC.s2],
    ],
    until: 2,
  },
  { from: "engine", to: "records", label: "every decision", labelAt: 0.33, via: engineTrunk(STORE.records) },

  // Step 2: hash lists and rules first.
  { from: "engine", to: "hash", flow: true, packet: true, bidirectional: true },
  {
    from: "hash",
    to: "photodna",
    bidirectional: true,
    via: [
      [BEND.gutterOut, 170],
      [BEND.gutterOut, SVC.s3],
    ],
  },
  {
    from: "hash",
    to: "banks",
    via: [
      [745, 150],
      [BEND.banks, 150],
      [BEND.banks, STORE.banks],
    ],
  },

  // Step 3: the check API inside the request; classifiers with one global threshold per family.
  { from: "postApi", to: "checkApi", flow: true, packet: true, step: 3 },
  {
    from: "checkApi",
    to: "engine",
    flow: true,
    packet: true,
    bidirectional: true,
  },
  { from: "hash", to: "classifiers", flow: true },
  {
    from: "classifiers",
    to: "encoder",
    bidirectional: true,
    via: [
      [BEND.gutterIn, ROW.r3],
      [BEND.gutterIn, SVC.s2],
    ],
  },

  // Step 4: the policy-reading model on the band; held units wait out of view.
  { from: "classifiers", to: "hold", flow: true },
  {
    from: "hold",
    to: "model",
    label: "one family a call",
    labelAt: 0.45,
    flow: true,
    packet: true,
    bidirectional: true,
  },
  { from: "model", to: "fallback", dashed: true },
  { from: "engine", to: "registry", via: engineTrunk(STORE.registry) },

  // Step 5: people by severity, reach and uncertainty.
  { from: "hold", to: "review", flow: true },
  { from: "hash", to: "review", dashed: true },
  {
    from: "review",
    to: "reviewers",
    label: "by severity, language",
    labelAt: 0.82,
    bidirectional: true,
    via: [
      [BEND.left, ROW.r3],
      [BEND.left, 548],
    ],
  },
  {
    from: "reviewApp",
    to: "reviewers",
    label: "blurred until clicked",
    labelAt: 0.45,
    bidirectional: true,
    via: [[400, 572]],
  },
  { from: "review", to: "engine" },

  // Step 6: enforcement, statements, reports and appeals, legal clocks.
  { from: "engine", to: "enforcement", flow: true },
  { from: "users", to: "postApi", bidirectional: true },
  { from: "enforcement", to: "ledger", label: "every action", labelAt: 0.8 },
  {
    from: "enforcement",
    to: "vaults",
    label: "evidence",
    labelAt: 0.57,
    via: [
      [575, 118],
      [BEND.vaults, 118],
      [BEND.vaults, STORE.vaults],
    ],
  },

  // Step 7: measure what was missed; ship policy changes through the gate.
  {
    from: "prevalence",
    to: "gold",
    label: "labels",
    labelAt: 0.7,
    via: [
      [BEND.async, ASYNC.prevalence],
      [BEND.async, 628],
      [1040, 628],
    ],
  },
  {
    from: "gold",
    to: "gate",
    label: "hold-out",
    labelAt: 0.4,
    via: [
      [1040, 600],
      [860, 600],
    ],
  },
  {
    from: "gate",
    to: "registry",
    label: "new version",
    labelAt: 0.35,
    dashed: true,
    via: [
      [930, 572],
      [BEND.glyphRight, 572],
      [BEND.glyphRight, STORE.registry],
    ],
  },

  // Step 8: adversarial adaptation closes the loop.
  { from: "prevalence", to: "redteam", label: "misses", labelAt: 0.5, dashed: true },
  { from: "redteam", to: "gate", label: "regression set", labelAt: 0.5, dashed: true },
];

const spec: DiagramSpec = {
  title:
    "Content moderation: hashes and classifiers in the request, holds for the worst harms, a policy-reading model on the band, people, and prevalence",
  width: HERO.width,
  height: HERO.height,
  steps: [
    { title: "One classifier on every post", covers: "F1" },
    { title: "Hash lists and rules first", covers: "F2, F9" },
    { title: "Classifiers, global thresholds, three paths", covers: "F1, F3, N3" },
    { title: "The policy-reading model where it can change a decision", covers: "F4, N4" },
    { title: "People by severity, reach and uncertainty", covers: "F5, N3" },
    { title: "Enforcement, reasons, appeals, reports, legal clocks", covers: "F6, F7, F8, F9" },
    { title: "Measure what was missed; change policy safely", covers: "F10, F11, N1, N2" },
    { title: "Adversarial adaptation, close the loop", covers: "F12, N6" },
  ],
  zones: genaiZones({ core: "Moderation pipeline", services: "Models and people" }),
  nodes: [
    // Clients
    card("apps", "Kestrel apps", `${millions(PLATFORM.units, 0)} units a day`, "users", C.clients, ROW.r1, 1, {
      h: 48,
      tone: GENAI_TONE.user,
    }),
    card("users", "Users, notifiers", "reports, appeals", "users", C.clients, ROW.r2, 6, {
      w: 160,
      h: 48,
      tone: GENAI_TONE.user,
    }),
    card("reviewApp", "Review app", "blurred, greyscale", "browser", C.clients, 572, 5, {
      h: 48,
      tone: GENAI_TONE.user,
    }),

    // Edge and gateway
    card("postApi", "Post API", "create, edit, report", "gateway", C.edge, ROW.r1, 1, { w: 160, h: 44 }),
    card("checkApi", "Check API", "sync, ≤ 150 ms p95", "gateway", C.edge, ROW.r2, 3, { w: 160, h: 44 }),

    // Moderation pipeline
    {
      id: "engine",
      label: "Decision engine",
      sub: "τ, bands, actions",
      icon: "policy",
      accent: true,
      x: C.left,
      y: ROW.r2,
      w: 160,
      h: CH,
      step: 1,
    },
    card("enforcement", "Enforcement", "actions, statements", "gavel", C.left, ROW.r1, 6, { tone: GENAI_TONE.tool }),
    card("hash", "Hash and rules", "lists, banks, terms", "fingerprint", C.right, ROW.r2, 2, {
      tone: GENAI_TONE.check,
    }),
    card("classifiers", "Classifiers", "text, image, OCR", "gauge", C.right, ROW.r3, 3, {
      tone: GENAI_TONE.check,
    }),
    card("hold", "Hold and band", "sev. 0–1 held", "timer", C.right, ROW.r4, 4, { tone: GENAI_TONE.rank }),
    card("review", "Review queues", "severity × reach", "user-check", C.left, ROW.r3, 5, { tone: GENAI_TONE.rank }),

    // Models and people
    service("model", "Policy model", `${millions(LLM.enforcementCalls)} calls a day`, "model", C.right, SVC.s1, 4),
    service("fallback", "Fallback", "if provider down", "gpu", C.left, SVC.s1, 4),
    service("encoder", "Text encoder", "a head per family", "model", C.right, SVC.s2, 1),
    service("photodna", "PhotoDNA", "and vendor CSEA", "fingerprint", C.right, SVC.s3, 2),
    card(
      "reviewers",
      "Reviewers",
      `≈ ${Math.round(PEOPLE.fte).toLocaleString("en-GB")} FTE`,
      "users",
      C.left,
      SVC.reviewers,
      5,
      {
        h: 48,
        tone: GENAI_TONE.user,
      }
    ),

    // Offline pipelines
    card("prevalence", "Prevalence", "view samples, bins", "chart", C.async, ASYNC.prevalence, 7, {
      h: 44,
      tone: GENAI_TONE.check,
    }),
    card("redteam", "Red team", "attacks, retraining", "bug", C.async, ASYNC.redteam, 8, {
      h: 44,
      tone: GENAI_TONE.check,
    }),
    card("gate", "Policy gate", "gold set, canary", "approval", C.async, ASYNC.gate, 7, {
      h: 44,
      tone: GENAI_TONE.check,
    }),

    // Data and state
    store("ledger", "Action ledger", "2 years", "ledger", STORE.ledger, 6),
    store("vaults", "CSEA, NCII vaults", "object lock", "lock", STORE.vaults, 6),
    store("records", "Decision records", `${STORAGE.decisionGbDay} GB a day`, "database", STORE.records, 1),
    store("registry", "Policy registry", "versions, term rules", "policy", STORE.registry, 4),
    store("banks", "Hash banks", undefined, "hash", STORE.banks, 2),
    store("gold", "Gold sets", "labels, hold-outs", "database", STORE.gold, 7),
  ],
  edges,
};

export default spec;
