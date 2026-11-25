import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { FAB, GRAPH, TRACES } from "@/components/diagrams/presets/gcase-kgsemi";
import { PROD_TONE } from "@/components/diagrams/presets/production";

// The fab ontology (kg-semiconductor-case-study, Step 2; design sheet §7, ontology ont-3.2.0). Rebuilt from the old
// ten-box sketch. Types follow the fab's standards (equipment and states from SEMI E120 and E10, locations from E90,
// parameter names from E164; dossier F1–F5):
//   Execution: `Run` (lot × step × tool, track-in, track-out) -IN_LOT-> Lot, -AT_STEP-> StepDef, -ON_TOOL-> Tool,
//   -VISITED {seq}-> Chamber (2.5 a run: a lot spreads over chambers; a cluster tool passes etch then strip),
//   -USED_RECIPE_BODY-> RecipeBody (the body version the RMS verified for the job: upload-and-compare at job start,
//   or the last golden compare; "unverified" when stale), -USED_MATERIAL-> MaterialLot.
//   Which wafer took which chamber is a columnar row, not an edge (GRAPH.waferChamberEdges ≈ 537.6M if it were).
//   Equipment: Tool -HAS_CHAMBER-> Chamber (qualified for FAB.stepsPerChamber ≈ 8 steps: re-entrant flow)
//   -HAS_PART-> PartInstall (part number, revision, part lot). Events on equipment (E10 state changes, maintenance,
//   qualification, FDC holds, SPC, golden mismatches) -ON-> Chamber.
//   Material and test: Wafer (scribe id; re-ID aliases) -IN_LOT-> Lot (splits, merges, rework); SortInsertion (first
//   pass or retest, bins, signature class) -PROBED_BY-> probe card, tester, test program.
//   Knowledge (approved, from FMEA and 8D): FailureMechanism -PRODUCES-> Signature, -TRIGGERED_BY-> an event type (part swaps are maintenance events);
//   each edge carries source, extractor version, approver and date. ExcursionCase -SHOWED-> Signature.
//   Reference, not data: FDC traces stay in the FDC store, keyed by its own context and matched to (wafer, run).
// Steps: 1 execution and equipment · 2 recipes, material, events, parts and the test side · 3 approved knowledge and
// the trace reference, with the bitemporal footer.
// Numbers: GRAPH.nodeCount ≈ 62.7M, GRAPH.edgeCount ≈ 237.6M, GRAPH.storeBytes ≈ 41.1 GB; TRACES.samplesPerDay
// ≈ 1.77 × 10¹¹, GRAPH.samplesPerDayOverEdges ≈ 744× (presets/gcase-kgsemi.ts; estimates for the illustrative fab).
// Layout (880 wide): four columns of 150-wide boxes at x 20 | 250 | 480 | 710 (80 px apart, room for a short pill on a
// horizontal relation) and five rows at y 20 | 130 | 240 | 350 | 460 (52 tall, 58 between rows). Run sits in the middle
// (480, 130), highlighted. Chamber → part install is a short drop; events → chamber climbs the right gutter x 872 past the part box, its ON
// tag a text beside the gutter. USED_MATERIAL is a text left of its diagonal, so it clears USED_RECIPE_BODY. The cell
// (480, 350) stays empty so the knowledge arrows cross nothing.
// Colours: types from fab systems violet (GENAI_TONE.store, they live in the graph); approved knowledge blue
// (GENAI_TONE.data, text-derived); the trace reference neutral and dashed.

const COL = [20, 250, 480, 710] as const;
const ROW = [20, 130, 240, 350, 460] as const;
const W = 150;
const H = 52;

const box = (
  id: string,
  c: number,
  r: number,
  label: string,
  sub: string,
  step: number,
  tone: LayoutTone = GENAI_TONE.store,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "box",
  x: COL[c],
  y: ROW[r],
  w: W,
  h: H,
  label,
  sub,
  tone,
  fill: "pastel",
  step,
  ...extra,
});

const rel = (from: string, to: string, label: string, step: number, extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id: `${from}-${label.toLowerCase().replace(/[^a-z_]+/g, "")}-${to}`,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
  step,
  ...extra,
});

const text = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: 12,
  y,
  w: 856,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
});

const FOOT = ROW[4] + H + 22;
const RIGHT = COL[3] + W; // 860

const spec: LayoutSpec = {
  kind: "layout",
  title: "The fab ontology: runs, chambers, events, recipe bodies, the test side and approved knowledge",
  width: 880,
  height: FOOT + 48,
  steps: [
    { title: "Execution and equipment: a run visits chambers" },
    { title: "Recipe bodies, material, events, parts and the test side" },
    { title: "Approved knowledge, and traces kept as a reference" },
  ],
  shapes: (
    [
      // Step 1: execution and equipment.
      box("route", 1, 0, "Product, route", "versioned route", 1),
      box("stepdef", 2, 0, "StepDef", "operation, module", 1),
      box("tool", 3, 0, "Tool", "E120 equipment", 1),
      box("lot", 0, 1, "Lot", "split, merge, rework", 1),
      box("run", 2, 1, "Run", "lot × step × tool, times", 1, GENAI_TONE.store, { highlight: true }),
      box("chamber", 3, 1, "Chamber", `E120 module, ≈ ${FAB.stepsPerChamber} steps`, 1),
      box("wafer", 0, 2, "Wafer", "scribe id, re-ID aliases", 1),
      rel("route", "stepdef", "HAS_STEP", 1),
      rel("run", "stepdef", "AT_STEP", 1),
      rel("run", "tool", "ON_TOOL", 1),
      rel("run", "lot", "IN_LOT", 1),
      rel("run", "chamber", "VISITED", 1),
      rel("tool", "chamber", "HAS_CHAMBER", 1),
      rel("wafer", "lot", "IN_LOT", 1, { id: "wafer-inlot-lot" }),

      // Step 2: recipe bodies, material, events, parts, the test side.
      box("recipe", 2, 2, "Recipe body", "version the RMS verified", 2),
      box("material", 1, 2, "Material lot", "resist, slurry, gas", 2),
      box("events", 3, 3, "Equipment events", "E10 state, PM, hold, SPC", 2),
      box("part", 3, 2, "Part install", "revision, part lot", 2),
      box("sort", 0, 3, "Sort insertion", "bins, signature, retest", 2),
      box("probe", 0, 4, "Probe card, tester", "test program version", 2),
      box("signature", 1, 3, "Signature", "wafer-map class", 2),
      rel("run", "recipe", "USED_RECIPE_BODY", 2),
      rel("run", "material", "", 2, { id: "run-usedmaterial-material", label: undefined }),
      {
        id: "material-label",
        type: "text",
        x: 300,
        y: ROW[1] + H + 18,
        w: 130,
        h: 18,
        label: "USED_MATERIAL",
        tone: "neutral",
        step: 2,
        quiet: true,
      },
      rel("chamber", "part", "HAS_PART", 2),
      rel("events", "chamber", "", 2, {
        id: "events-on-chamber",
        label: undefined,
        via: [
          [RIGHT + 12, ROW[3] + H / 2],
          [RIGHT + 12, ROW[1] + H / 2],
        ],
      }),
      {
        id: "on-label",
        type: "text",
        x: RIGHT - 22,
        y: ROW[2] + H + 20,
        w: 34,
        h: 18,
        label: "ON",
        tone: "neutral",
        step: 2,
        quiet: true,
      },
      rel("wafer", "sort", "HAS_SORT", 2),
      rel("sort", "probe", "PROBED_BY", 2),
      rel("sort", "signature", "SHOWS", 2),

      // Step 3: approved knowledge; traces by reference.
      box("mechanism", 2, 4, "Failure mechanism", "FMEA row, approver, date", 3, GENAI_TONE.data, { highlight: true }),
      box("case", 1, 4, "Excursion case", "confirmed cause, 8D", 3, GENAI_TONE.data),
      box("trace", 3, 4, "FDC trace (reference)", "context → (wafer, run)", 3, "neutral", { fill: "soft" }),
      rel("mechanism", "signature", "PRODUCES", 3),
      rel("mechanism", "events", "TRIGGERED_BY", 3),
      rel("case", "signature", "SHOWED", 3),
      text(
        "foot-1",
        FOOT,
        `Every event and edge: valid_from, valid_to, recorded_at, superseded_at; a correction is a new version. ≈ ${(GRAPH.nodeCount / 1e6).toFixed(1)}M nodes, ≈ ${(GRAPH.edgeCount / 1e6).toFixed(1)}M edges, ≈ ${(GRAPH.storeBytes / 1e9).toFixed(1)} GB.`,
        3
      ),
      text(
        "foot-2",
        FOOT + 22,
        `Samples stay in the FDC store: ${(TRACES.samplesPerDay / 1e11).toFixed(2)} × 10¹¹ a day, ≈ ${Math.round(GRAPH.samplesPerDayOverEdges)}× the graph's edges. Wafer-to-chamber visits are columnar rows.`,
        3
      ),
    ] as LayoutShape[]
  ).map((sh) => (sh.id === "foot-1" || sh.id === "foot-2" ? { ...sh, quiet: true } : sh)),
};

export default spec;
