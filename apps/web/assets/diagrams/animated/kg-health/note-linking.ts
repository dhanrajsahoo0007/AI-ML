import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { COST, SIZES } from "@/components/diagrams/presets/gcase-kghealth";

// From a note to coded facts (kg-healthcare-case-study, Step 3 and deep dive 2; design sheet §10.5–10.7, §15.2), on the
// sheet's note: "Pt started on warfarin, no hx of GI bleed, PCN allergy (rash 2019)".
//   1 Mentions: NER finds three spans in the signed note (DocumentReference/31).
//   2 Link: exact and dictionary match first (warfarin, GI bleed); otherwise SapBERT-class candidates, the top 20 of
//     SIZES.linkingNames ≈ 3M names from SNOMED CT, RxNorm and LOINC, filtered by semantic type ("PCN").
//   3 Disambiguate: only the ambiguous share COST.ambiguousShare = 25% goes to the cross-encoder, which reads the
//     sentence and section: "PCN" next to "allergy (rash)" is penicillin.
//   4 Assertion with per-kind meaning, then the fact with its provenance: warfarin present (a medication statement that
//     expires into "historical" unless reconfirmed); GI bleed negated ("no hx of"), highlighted; penicillin allergy
//     ACTIVE, because a historical reaction is a current allergy unless refuted. Each fact stores the note id, span,
//     linker version, score, security labels and the first note it appeared in (copy-forward counts once). The red box
//     is the fact a pipeline without assertion would write.
// Spans are character offsets in the quoted sentence; scores and the linker version are illustrative.
// Layout (960 wide): the note across the top; one row per mention (warfarin, PCN, GI bleed: the negated one last, so
// the red "without assertion" box sits under its fact); columns mention x 20 (150) | link x 200 (220) | disambiguate
// x 450 (190) | assertion and fact x 670 (270), 30 px apart; column heads above the rows.
// Colours (GENAI_TONE): the note and mentions blue (text), link and disambiguation lime (ranking), facts violet (the
// fact store), the wrong fact red.

const COL = { mention: 20, link: 200, dis: 450, fact: 670 } as const;
const W = { mention: 150, link: 220, dis: 190, fact: 270 } as const;
const ROW = [150, 240, 330] as const;
const H = 66;
const RED_Y = 420;

const box = (
  id: string,
  col: keyof typeof COL,
  y: number,
  label: string,
  sub: string | undefined,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "box",
  x: COL[col],
  y,
  w: W[col],
  h: H,
  label,
  sub,
  tone,
  fill: "pastel",
  step,
  ...extra,
});
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
const head = (id: string, col: keyof typeof COL, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: COL[col],
  y: 120,
  w: W[col],
  h: 18,
  label,
  tone: "neutral",
  step,
});
const text = (id: string, y: number, label: string, step: number, x = 20, w = 920): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 18,
  label,
  tone: "neutral",
  step,
});

const millions = (v: number) => `${Math.round(v / 1e6)}M`;
const pct = (v: number) => `${Math.round(v * 100)}%`;

const spec: LayoutSpec = {
  kind: "layout",
  title: "From a note to coded facts: mentions, linking, disambiguation, then assertion with per-kind meaning",
  width: 960,
  height: 548,
  steps: [
    { title: "Mentions: three spans in a signed note" },
    { title: `Link: exact match first, else the top 20 of ≈ ${millions(SIZES.linkingNames)} names` },
    { title: `Disambiguate the ambiguous ${pct(COST.ambiguousShare)} in context: "PCN" is penicillin` },
    { title: "Assertion with per-kind meaning; each fact keeps its provenance" },
  ],
  shapes: [
    // Step 1: the note and its mentions.
    {
      id: "note",
      type: "box",
      x: 20,
      y: 24,
      w: 920,
      h: 58,
      label: '"Pt started on warfarin, no hx of GI bleed, PCN allergy (rash 2019)"',
      sub: "DocumentReference/31 · signed 10:12 · section: History · security labels: none",
      tone: GENAI_TONE.data,
      fill: "soft",
      step: 1,
    },
    head("h-mention", "mention", "1 Mention (span)", 1),
    box("m-warf", "mention", ROW[0], '"warfarin"', "span 14–22", GENAI_TONE.data, 1),
    box("m-pcn", "mention", ROW[1], '"PCN"', "span 43–46", GENAI_TONE.data, 1),
    box("m-gib", "mention", ROW[2], '"GI bleed"', "span 33–41", GENAI_TONE.data, 1),

    // Step 2: link to standard vocabularies.
    head("h-link", "link", "2 Link: exact first", 2),
    box("l-warf", "link", ROW[0], "warfarin", "RxNorm ingredient · exact", GENAI_TONE.rank, 2),
    box(
      "l-pcn",
      "link",
      ROW[1],
      "No exact match",
      `top 20 of ≈ ${millions(SIZES.linkingNames)} names`,
      GENAI_TONE.rank,
      2
    ),
    box("l-gib", "link", ROW[2], "GI hemorrhage", "SNOMED CT · synonym match", GENAI_TONE.rank, 2),
    arrow("a-warf-1", "m-warf", "l-warf", 2),
    arrow("a-pcn-1", "m-pcn", "l-pcn", 2),
    arrow("a-gib-1", "m-gib", "l-gib", 2),

    // Step 3: disambiguation, only where the candidates are close.
    head("h-dis", "dis", "3 Disambiguate", 3),
    box("d-warf", "dis", ROW[0], "Not ambiguous", "skips the cross-encoder", GENAI_TONE.rank, 3, { fill: "soft" }),
    box("d-pcn", "dis", ROW[1], "penicillin", "cross-encoder: allergy, rash", GENAI_TONE.rank, 3, { highlight: true }),
    box("d-gib", "dis", ROW[2], "Not ambiguous", "skips the cross-encoder", GENAI_TONE.rank, 3, { fill: "soft" }),
    arrow("a-warf-2", "l-warf", "d-warf", 3),
    arrow("a-pcn-2", "l-pcn", "d-pcn", 3),
    arrow("a-gib-2", "l-gib", "d-gib", 3),

    // Step 4: assertion with per-kind meaning, and the fact with its provenance.
    head("h-fact", "fact", "4 Assertion → fact", 4),
    box(
      "f-warf",
      "fact",
      ROW[0],
      "Medication: warfarin, present",
      "expires to historical unless reconfirmed",
      GENAI_TONE.store,
      4
    ),
    box(
      "f-pcn",
      "fact",
      ROW[1],
      "Allergy: penicillin, rash, ACTIVE",
      "a past reaction is a current allergy",
      GENAI_TONE.store,
      4
    ),
    box("f-gib", "fact", ROW[2], "GI bleed: NEGATED", '"no hx of": never fires a rule', GENAI_TONE.store, 4, {
      highlight: true,
    }),
    arrow("a-warf-3", "d-warf", "f-warf", 4),
    arrow("a-pcn-3", "d-pcn", "f-pcn", 4),
    arrow("a-gib-3", "d-gib", "f-gib", 4),
    {
      id: "wrong",
      type: "box",
      x: COL.fact,
      y: RED_Y,
      w: W.fact,
      h: 56,
      label: "Without assertion: HAS GI bleed",
      sub: "fires bleeding-risk rules on a negation",
      tone: GENAI_TONE.failure,
      fill: "soft",
      step: 4,
    },
    arrow("a-wrong", "d-gib", "wrong", 4, { dashed: true }),
    text("prov", RED_Y + 4, "Each fact stores: note 31, span, linker lnk-2026.10,", 4, COL.mention, 410),
    text("prov-2", RED_Y + 24, "score (0.91), security labels, first note seen.", 4, COL.mention, 410),
    text(
      "foot",
      506,
      "Copy-forward text counts only at its first note; amendments and entered-in-error supersede a fact. Scores illustrative.",
      4
    ),
  ],
};

export default spec;
