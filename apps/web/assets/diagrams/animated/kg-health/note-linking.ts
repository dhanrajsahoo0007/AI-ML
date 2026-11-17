import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// "Linking a note to the graph" on the healthcare case study, using the page's own example note: "Pt started on
// warfarin, no hx of bleeding". Clinical NLP finds two mentions and links each to a code system; each becomes a fact
// in the patient graph. The negated mention becomes NOT_HAS (highlighted: the point of the figure), and the red box
// shows the fact a pipeline without negation handling would write instead. The TAKES fact feeds the interaction
// check against new prescriptions.
//
// Tones (four plus neutral): the note blue (text), the coded mentions teal (vocabulary lookups, like metadata), the
// facts violet (the patient graph), the wrong fact red (it breaks), the interaction check neutral (infrastructure).
//
// Layout: three columns, the note at x 20 (230 wide), mentions at x 320 (210 wide), facts at x 600 (260 wide); four
// rows at y 20 | 120 | 220 | 320. The note spans the two middle rows. Arrows out of the note start at exact points on
// its right border (x 250 + 4 px gap) at each mention's centre line, so they leave straight.

/** A pastel box with a label and an optional sub line. */
function box(
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  sub: string | undefined,
  tone: LayoutTone,
  opts: { h?: number; fill?: "pastel" | "soft" | "paper"; highlight?: boolean } = {}
): LayoutShape {
  return {
    id,
    type: "box",
    x,
    y,
    w,
    h: opts.h ?? 56,
    label,
    sub,
    tone,
    fill: opts.fill ?? "pastel",
    highlight: opts.highlight,
  };
}

const COL = { note: 20, mention: 320, fact: 600 } as const;
const W = { note: 230, mention: 210, fact: 260 } as const;
const ROW = [20, 120, 220, 320] as const;
const H = 56;
const NOTE_EXIT = COL.note + W.note + 4; // a point on the note's right border, plus the edge gap

const spec: LayoutSpec = {
  kind: "layout",
  title: "Linking a clinical note to the patient graph, with negation kept",
  width: 880,
  height: 396,
  shapes: [
    box("note", COL.note, ROW[1], W.note, '"Pt started on\nwarfarin, no hx\nof bleeding"', undefined, RAG_TONE.text, {
      h: ROW[2] + H - ROW[1],
    }),

    box("bleeding", COL.mention, ROW[1], W.mention, '"bleeding"', "SNOMED CT finding, negated", RAG_TONE.keyword),
    box("warfarin", COL.mention, ROW[2], W.mention, '"warfarin"', "RxNorm drug", RAG_TONE.keyword),

    box("wrong", COL.fact, ROW[0], W.fact, "Patient HAS bleeding", "if the 'no' is dropped", RAG_TONE.failure, {
      fill: "soft",
    }),
    box("notHas", COL.fact, ROW[1], W.fact, "Patient NOT_HAS bleeding", "history, from this note", RAG_TONE.store, {
      highlight: true,
    }),
    box("takes", COL.fact, ROW[2], W.fact, "Patient TAKES warfarin", "start date from the note", RAG_TONE.store),
    box("check", COL.fact, ROW[3], W.fact, "Interaction check", "vs new prescriptions", RAG_TONE.infra, {
      fill: "paper",
    }),

    // The note's two mentions, found and coded.
    {
      id: "note-bleeding",
      type: "arrow",
      x: 0,
      y: 0,
      from: "note",
      to: "bleeding",
      via: [[NOTE_EXIT, ROW[1] + H / 2]],
    },
    {
      id: "note-warfarin",
      type: "arrow",
      x: 0,
      y: 0,
      from: "note",
      to: "warfarin",
      via: [[NOTE_EXIT, ROW[2] + H / 2]],
    },
    // Each mention becomes a fact; dropping the negation writes the wrong one.
    { id: "bleeding-nothas", type: "arrow", x: 0, y: 0, from: "bleeding", to: "notHas" },
    { id: "bleeding-wrong", type: "arrow", x: 0, y: 0, from: "bleeding", to: "wrong", dashed: true },
    { id: "warfarin-takes", type: "arrow", x: 0, y: 0, from: "warfarin", to: "takes" },
    { id: "takes-check", type: "arrow", x: 0, y: 0, from: "takes", to: "check" },
  ],
};

export default spec;
