import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE } from "@/components/diagrams/presets/production";
import { QUALITY, box, link, note } from "@/components/diagrams/presets/production-ops";

// Registry lifecycle for Brightpost's model (model-registry-governance, Architecture). A model version moves from
// registered to staging to production to archived, with an approval at each move. Steps 3-4 show how MLflow does the
// same today: stages are deprecated (since MLflow 2.9.0, checked November 2026) and aliases replace them. An alias is
// a mutable, named pointer to one version; promoting means repointing "champion", rolling back means pointing it back.
//
// Working: the offline gate is the golden-set floor, 85 % of 200 = 170 passes (QUALITY.floor, DATASETS.goldenSet);
// model m7 scored 184 of 200 (illustrative, shared with the release pipeline). Version numbers v5 to v7 are invented.
//
// Steps: 1 four stages · 2 an approval at each move · 3 aliases point at versions · 4 promote by repointing.
// Layout (880 x 480): stage boxes y 30 (w 170, h 56) at x 15 / 235 / 455 / 675; approval boxes y 140 (w 190, h 70) at
// x 115 / 335 / 555 with a thin line up to the arrow between the stages; heading note y 255; version boxes y 295
// (w 170, h 56) at x 235 / 455 / 675; alias boxes y 410 (w 170, h 50) at x 455 (champion) and x 675 (challenger).
// Colour (four tones plus neutral): stages violet (a registry), approvals lime (a check), versions green (a model),
// aliases neutral.

const STAGES = [
  { id: "reg", x: 15, label: "Registered", sub: "version 7, linked to its run" },
  { id: "stg", x: 235, label: "Staging", sub: "offline gate passed" },
  { id: "prod", x: 455, label: "Production", sub: "serves live traffic" },
  { id: "arch", x: 675, label: "Archived", sub: "kept for audit" },
] as const;

const APPROVALS = [
  {
    id: "ap1",
    x: 115,
    label: "Offline gate",
    sub: `${Math.round(QUALITY.floor * DATASETS.goldenSet)} of ${DATASETS.goldenSet} to pass, card filled`,
  },
  { id: "ap2", x: 335, label: "Canary and sign-off", sub: "owner and risk reviewer" },
  { id: "ap3", x: 555, label: "Retire", sub: "successor live and baked" },
] as const;

const shapes: LayoutShape[] = [];
STAGES.forEach((s, i) => {
  shapes.push(box(s.id, s.x, 30, 170, 56, s.label, s.sub, PROD_TONE.store, 1));
  if (i > 0) shapes.push(link(`a-${s.id}`, STAGES[i - 1].id, s.id, 1));
});
APPROVALS.forEach((a) => {
  shapes.push(box(a.id, a.x, 140, 190, 70, a.label, a.sub, PROD_TONE.check, 2));
  shapes.push({
    id: `${a.id}-line`,
    type: "arrow",
    x: a.x + 95,
    y: 140,
    w: 0,
    h: -82,
    tone: PROD_TONE.infra,
    dashed: true,
    head: false,
    step: 2,
  });
});

shapes.push(
  note(
    "alias-head",
    15,
    255,
    850,
    26,
    "MLflow today: stages are deprecated (since 2.9.0); aliases point at versions",
    3
  ),
  box("v5", 235, 295, 170, 56, "Version 5", "archived", PROD_TONE.model, 3),
  box("v6", 455, 295, 170, 56, "Version 6", "live", PROD_TONE.model, 3),
  box("v7", 675, 295, 170, 56, "Version 7", "candidate, m7", PROD_TONE.model, 3),
  box("champion", 455, 410, 170, 50, "@champion", "serving alias", PROD_TONE.infra, 3),
  box("challenger", 675, 410, 170, 50, "@challenger", "under test", PROD_TONE.infra, 3),
  link("al-champ-6", "champion", "v6", 3, { dashed: true }),
  link("al-chall-7", "challenger", "v7", 3),
  link("al-champ-7", "champion", "v7", 4, { packet: true }),
  note("repoint", 15, 305, 200, 40, "Promote: repoint\n@champion to v7", 4)
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Registry lifecycle: four stages, an approval at each move, and aliases",
  width: 880,
  height: 480,
  steps: [
    { title: "Four stages of a model version" },
    { title: "An approval at each move" },
    { title: "Aliases point at versions" },
    { title: "Promote by repointing; roll back by pointing back" },
  ],
  shapes,
};

export default spec;
