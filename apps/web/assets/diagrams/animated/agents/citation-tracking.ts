import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { CLAIMS, SOURCES } from "@/components/diagrams/presets/agents-research";

// Citation tracking on deep-research-agents (Core concepts, "Citations and source tracking"). Every note a worker
// sends back carries the id of the source it came from; every sentence the lead writes names the notes it rests on; a
// check reads each sentence against its note. In draft 1 the courier sentence rests on no note (the lead inferred it):
// it is the "1 claim unsourced" the reviewer returns on multi-agent-systems. In round 2 the refund-records worker
// finds S4, the sentence now cites it, and draft 2 passes.
//
// Four steps: 1 notes from round 1, each with its source id · 2 the lead's draft, one sentence per claim · 3 the check
// on draft 1: four supported, one with no source (ringed) · 4 round 2 adds S4 and draft 2 passes.
//
// Layout: a header row at y 40; five claim rows at y 80 + 60 × i, 48 high. Columns: the note (x 20, w 250), the
// sentence (x 286, w 330), the draft 1 check (x 632, w 110), the draft 2 check (x 756, w 104). A line naming the four
// sources sits under the rows.
//
// Colour (agents legend, four tones): notes blue (retrieved text), sentences green (the model's answer), checks lime,
// the unsourced sentence's check red. Headers and the source line neutral.

const COL = {
  note: { x: 20, w: 250 },
  sentence: { x: 286, w: 330 },
  check1: { x: 632, w: 110 },
  check2: { x: 756, w: 104 },
} as const;
const rowY = (i: number) => 80 + 60 * i;
const H = 48;

const sourceName = (id: string) => SOURCES.find((s) => s.id === id)?.name ?? id;

const header = (id: string, col: { x: number; w: number }, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: col.x,
  y: 40,
  w: col.w,
  h: 30,
  label,
  tone: AGENT_TONE.infra,
  step,
});

const rows: LayoutShape[] = CLAIMS.flatMap((c, i) => {
  const y = rowY(i);
  const late = c.round === 2;
  return [
    {
      id: `${c.id}-note`,
      type: "box" as const,
      x: COL.note.x,
      y,
      w: COL.note.w,
      h: H,
      label: c.note,
      sub: `${c.source} · ${sourceName(c.source)}`,
      tone: AGENT_TONE.result,
      fill: "pastel" as const,
      step: late ? 4 : 1,
      quiet: !late && i > 0,
    },
    {
      id: `${c.id}-sentence`,
      type: "box" as const,
      x: COL.sentence.x,
      y,
      w: COL.sentence.w,
      h: H,
      label: c.sentence,
      sub: late ? `cites ${c.source} only in draft 2` : `cites ${c.source}`,
      tone: AGENT_TONE.model,
      fill: "soft" as const,
      step: 2,
      quiet: i > 0,
    },
    {
      id: `${c.id}-link`,
      type: "arrow" as const,
      x: 0,
      y: 0,
      from: `${c.id}-note`,
      to: `${c.id}-sentence`,
      step: late ? 4 : 2,
    },
    late
      ? {
          id: `${c.id}-check1`,
          type: "cell" as const,
          x: COL.check1.x,
          y,
          w: COL.check1.w,
          h: H,
          label: "no source",
          tone: AGENT_TONE.failure,
          fill: "pastel" as const,
          step: 3,
          highlight: true,
        }
      : {
          id: `${c.id}-check1`,
          type: "cell" as const,
          x: COL.check1.x,
          y,
          w: COL.check1.w,
          h: H,
          label: "supported",
          tone: AGENT_TONE.check,
          fill: "pastel" as const,
          step: 3,
          quiet: true,
        },
    {
      id: `${c.id}-check2`,
      type: "cell" as const,
      x: COL.check2.x,
      y,
      w: COL.check2.w,
      h: H,
      label: "supported",
      tone: AGENT_TONE.check,
      fill: "pastel" as const,
      step: 4,
      quiet: !late,
    },
  ];
});

const belowY = rowY(CLAIMS.length) + 4;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Citation tracking: every sentence points at a note, every note at a source",
  width: 880,
  height: belowY + 40,
  steps: [
    { title: "Each note from a worker carries its source id" },
    { title: "The lead's draft: one sentence per claim" },
    { title: "Draft 1 check: one sentence has no source" },
    { title: "Round 2 finds S4; draft 2 passes" },
  ],
  shapes: [
    header("h-note", COL.note, "Note from a worker", 1),
    header("h-sentence", COL.sentence, "Sentence in the draft", 2),
    header("h-check1", COL.check1, "Draft 1", 3),
    header("h-check2", COL.check2, "Draft 2", 4),
    ...rows,
    {
      id: "sources",
      type: "text",
      x: 20,
      y: belowY,
      w: 840,
      h: 24,
      label: SOURCES.map((s) => `${s.id} ${s.name}`).join(" · "),
      tone: AGENT_TONE.infra,
    },
  ],
};

export default spec;
