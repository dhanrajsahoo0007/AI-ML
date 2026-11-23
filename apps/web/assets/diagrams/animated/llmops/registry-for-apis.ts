import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE } from "@/components/diagrams/presets/production";
import { BUNDLE } from "@/components/diagrams/presets/production-release";
import { QUALITY, RUNS, box, note } from "@/components/diagrams/presets/production-ops";

// What a registry entry is when the "model" is a provider's API (model-registry-governance, Deep dive). Brightpost
// does not host weights for this route: the entry is a bundle of a provider model id, a prompt, a decoding config,
// the tool schemas and the guardrails. Version labels come from BUNDLE (bundle 42: prompt p12, guardrails g5, tools t8);
// the provider ids ("provider-model-2026-09-01", "provider-model-latest") are invented generic names.
//
// Step 1: the entry's five parts. Step 2: a dated snapshot stays the same until you move it; an alias can be moved by
// the provider, so answers change while the entry still says version 42 (red: something breaks). Step 3: what the
// registry keeps beside the parts: the evaluation (184 of 200, from RUNS.a, illustrative), the approval and a tested
// fallback.
//
// Layout (880 x 420): header y 20 (x 15, w 850, h 50); five part boxes y 100 (w 160, gap 12, x 15); step 2 boxes y 190
// (w 400) at x 15 and x 465; step 3 boxes y 320 (w 270) at x 15 / 305 / 595.
// Colour (four tones plus neutral): header and config neutral, provider model green, prompt and tools blue,
// guardrails lime; red only on the moving alias.

const PART_X = [15, 187, 359, 531, 703];
const b = BUNDLE[42];

const shapes: LayoutShape[] = [
  box(
    "head",
    15,
    20,
    850,
    50,
    "Registry entry brightpost-support, version 42",
    "provider model + prompt + config + tools + guardrails",
    PROD_TONE.infra,
    1
  ),
  box("p-model", PART_X[0], 100, 160, 64, "Provider model", "pinned snapshot id", PROD_TONE.model, 1),
  box("p-prompt", PART_X[1], 100, 160, 64, "Prompt", b.prompt, PROD_TONE.data, 1),
  box("p-config", PART_X[2], 100, 160, 64, "Config", "temperature 0, 400 tokens", PROD_TONE.infra, 1),
  box("p-tools", PART_X[3], 100, 160, 64, "Tool schemas", b.tools, PROD_TONE.data, 1),
  box("p-guard", PART_X[4], 100, 160, 64, "Guardrails", b.guardrails, PROD_TONE.check, 1),

  box(
    "pinned",
    15,
    190,
    400,
    64,
    "Pinned: provider-model-2026-09-01",
    "same weights until you move it on purpose",
    PROD_TONE.model,
    2
  ),
  box(
    "alias",
    465,
    190,
    400,
    64,
    "Alias: provider-model-latest",
    "the provider moves it; answers change",
    PROD_TONE.failure,
    2
  ),
  note(
    "alias-note",
    15,
    262,
    850,
    24,
    "The registry entry still says version 42. Nobody approved the new snapshot.",
    2
  ),

  box(
    "evidence",
    15,
    320,
    270,
    64,
    "Evaluation",
    `${RUNS.a.pass} of ${DATASETS.goldenSet}, floor ${Math.round(QUALITY.floor * 100)} %`,
    PROD_TONE.check,
    3
  ),
  box("approval", 305, 320, 270, 64, "Approval", "owner and risk sign-off", PROD_TONE.infra, 3),
  box("fallback", 595, 320, 270, 64, "Fallback", "a second snapshot, tested the same way", PROD_TONE.model, 3),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "A registry entry for an API-based model: five parts, one pinned snapshot",
  width: 880,
  height: 420,
  steps: [
    { title: "The entry is five parts, not one model file" },
    { title: "Pin a snapshot; an alias can move under you" },
    { title: "Keep the proof and a fallback with the entry" },
  ],
  shapes,
};

export default spec;
