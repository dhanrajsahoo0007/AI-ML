import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { CONTEXT, EVAL, QUERY_GUARDS as Q, USERS } from "@/components/diagrams/presets/gcase-kgsemi";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";

// The guard chain for generated and templated queries over both stores (kg-semiconductor-case-study, Step 3 and deep
// dive 2; design sheet §15.2, §10.7–10.8, §14). Numbers from QUERY_GUARDS, USERS and EVAL in presets/gcase-kgsemi.ts:
//   1 Templates first: USERS.templateShare = 70% of lookups match one of Q.templates = 40 (28 graph, 12 cross-store);
//     the encoder fills USERS.encoderSlotShare = 80% of their slots. The rest are generated (Cypher, or SQL over
//     allow-listed ClickHouse views) from a 2,500-token schema subset and four verified examples (CONTEXT.generate.in
//     3,600 tokens in all).
//   2 Every literal is linked to a master id before execution (exact, alias, then fuzzy with a chip). Red box: an
//     invented "ETCH4-B" is stopped by the linker ("unknown chamber 'ETCH4-B'; did you mean ETCH04-B?") instead of
//     returning "no rows", which reads as "no maintenance on that chamber".
//   3 Parse and allow-list (Cypher: MATCH, OPTIONAL MATCH, WHERE, WITH, UNWIND, RETURN, ORDER BY, LIMIT; SQL: one
//     SELECT over allow-listed views); schema and value check; bounds: ≤ Q.maxHops = 4 hops, LIMIT Q.maxRows = 1,000,
//     a time filter on event labels, EXPLAIN ≤ Q.maxEstimatedRows = 1M estimated rows (a heuristic), columnar ≤
//     Q.columnarMaxRowsToRead = 200M rows read, ≤ Q.crossStoreKeyCap = 100,000 ids across stores. CALL is allow-listed
//     (apoc.cypher.*, apoc.load.*, apoc.periodic.*, dbms.* excluded); LOAD CSV blocked. A failed check gets Q.repairs = 1
//     repair with the error, then every check again.
//   4 A read-only scoped role on an assistant-only replica: Q.timeoutMs = 5 s, Q.memoryMb = 512 MB (server settings,
//     acceptable because the replicas serve only the assistant); ClickHouse readonly=1 with row policies. The table is
//     rendered by code with the query and a paraphrase. Red box: a valid query that joins Run to Chamber through
//     ON_TOOL instead of VISITED returns every chamber of the tool; templates first, the query shown and the query-set
//     gate ("wrong but valid" ≤ 5%) are the defences.
// Steps: 1 template or generation · 2 link every literal · 3 parse, allow-list, check, bound · 4 the scoped read-only
// run, and the valid-but-wrong query.
// Layout (880 wide): row A (y 34–166) question, template over generation, the linker, the stopped name; row B (y 232)
// the four checks left to right; row C the blocked list and the table; row D the red valid-but-wrong box; footers.
// Colours (GENAI_TONE): the engineer orange, the template lime (rank), generation green (model), the linker and checks
// lime (check), the run violet (store), the table teal, failures red, the blocked list neutral.

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill: "pastel", step, ...extra });

const arrow = (id: string, from: string, to: string, step: number, extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
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

const pct = (v: number) => `${Math.round(v * 100)}%`;
const RB = 232; // row B top
const RC = 336; // row C top
const RD = 420; // row D top
const FOOT = RD + 84;

const spec: LayoutSpec = {
  kind: "layout",
  title: "One guard chain for both stores: templates first, every literal linked, read-only and bounded",
  width: 880,
  height: FOOT + 48,
  steps: [
    { title: `Templates first (${pct(USERS.templateShare)} of lookups); generation from a schema subset` },
    { title: "Every literal linked to a master id before any query runs" },
    { title: "Parse, allow-list, check and bound, for Cypher and SQL alike" },
    { title: "A read-only scoped role on an assistant-only replica; the valid-but-wrong query" },
  ],
  shapes: [
    // Step 1: template first, or generation.
    box("question", 12, 74, 116, 52, "Question", "typed or from YMS", GENAI_TONE.user, 1),
    box(
      "template",
      200,
      34,
      200,
      52,
      `Template (${Q.templates})`,
      `encoder fills ${pct(USERS.encoderSlotShare)} of slots`,
      GENAI_TONE.rank,
      1
    ),
    box("generate", 200, 114, 200, 52, "Generated query", "2,500-token schema subset", GENAI_TONE.model, 1),
    arrow("a-tmpl", "question", "template", 1, { label: pct(USERS.templateShare) }),
    arrow("a-gen", "question", "generate", 1, { label: pct(1 - USERS.templateShare) }),

    // Step 2: link every literal.
    box("link", 440, 74, 186, 52, "Link literals", "every name → master id", GENAI_TONE.check, 2, { highlight: true }),
    arrow("a-link-1", "template", "link", 2),
    arrow("a-link-2", "generate", "link", 2),
    box(
      "unknown",
      664,
      62,
      204,
      76,
      `"ETCH4-B" stopped,\nnever "no rows"`,
      `"did you mean ETCH04-B?"`,
      GENAI_TONE.failure,
      2
    ),
    arrow("a-unknown", "link", "unknown", 2, { dashed: true }),

    // Step 3: parse, allow-list, schema and value check, bounds.
    box("parse", 12, RB, 196, 64, "Parse, allow-list", "Cypher clauses; one SELECT", GENAI_TONE.check, 3),
    box("schema", 232, RB, 196, 64, "Schema, value check", "labels, types, enums", GENAI_TONE.check, 3),
    box(
      "bounds",
      452,
      RB,
      196,
      64,
      "Bounds, EXPLAIN",
      `≤ ${Q.maxHops} hops, LIMIT ${n(Q.maxRows)}`,
      GENAI_TONE.check,
      3
    ),
    arrow("a-parse", "link", "parse", 3, {
      via: [
        [525, 194],
        [110, 194],
      ],
    }),
    arrow("a-schema", "parse", "schema", 3),
    arrow("a-bounds", "schema", "bounds", 3),
    box(
      "blocked",
      12,
      RC,
      416,
      56,
      "Blocked: writes, LOAD CSV, apoc.cypher.*, apoc.load.*, dbms.*",
      `a failed check gets ${Q.repairs} repair with the error, then every check again`,
      "neutral",
      3,
      { fill: "soft" }
    ),

    // Step 4: the scoped read-only run, the table, and the valid-but-wrong query.
    box(
      "run",
      672,
      RB,
      196,
      64,
      "Read-only run",
      `replica: ${Q.timeoutMs / 1_000} s, ${Q.memoryMb} MB`,
      GENAI_TONE.store,
      4
    ),
    arrow("a-run", "bounds", "run", 4),
    box("table", 672, RC, 196, 56, "Table by code", "with the query, paraphrase", GENAI_TONE.tool, 4),
    arrow("a-table", "run", "table", 4),
    box(
      "wrong",
      12,
      RD,
      856,
      60,
      "Valid but wrong: Run -ON_TOOL-> Chamber instead of -VISITED->",
      "returns every chamber of the tool; caught by templates first, the query shown and the query-set gate",
      GENAI_TONE.failure,
      4,
      { highlight: true }
    ),
    text(
      "foot-1",
      FOOT,
      `Columnar: readonly=1, row policies, ≤ ${n(Q.columnarMaxRowsToRead / 1e6)}M rows read; ≤ ${n(Q.crossStoreKeyCap)} ids across stores; EXPLAIN ≤ ${n(Q.maxEstimatedRows / 1e6)}M rows is a heuristic.`,
      4
    ),
    text(
      "foot-2",
      FOOT + 20,
      `Gates: templates ≥ 95% (${EVAL.queries.template}), generated ≥ 80% (${EVAL.queries.generated}), ${EVAL.queries.misspelled} misspelled names never "no rows", 0 of ${EVAL.bypass.attempts} constructed bypass attempts executed.`,
      4
    ),
  ],
};

// CONTEXT is imported so the header's 3,600-token generation prompt stays tied to the preset.
void CONTEXT.generate.in;

export default spec;
