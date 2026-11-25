import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";
import { BPE, ENCODED } from "@/components/diagrams/presets/llm-tokens";

// Encoding new words with the merge list learned in `bpe-merges` (corpus "low", "lower", "newest"; merges l + o,
// lo + w, low + e). The trainer, the encoder and every number come from presets/llm-tokens.ts; its header comment has
// the working. In short:
//   lowest   l o w e s t → lo w e s t → low e s t → lowe s t     6 characters → 3 tokens, ids 10 6 7
//   newer    n e w e r, unchanged by every merge                  5 characters → 5 tokens, ids 5 3 2 3 4
//   slowly   s l o w l y → s lo w l y → s low l y (low + e does not apply)
//                                                                 6 characters → 4 tokens, ids 6 9 0 and <unk>
// Facts checked against Sennrich et al. 2016 (arXiv 1508.07909) §3.2: at test time words are split into characters
// and the learned operations are applied to merge them into larger known symbols; footnote 3: the only symbols
// unknown at test time are unknown characters. Applying the merges one after another in learned order gives the same
// result as repeatedly merging the lowest-ranked pair present, since a later merge never re-creates an earlier pair.
//
// Steps: 1 the three words as characters; 2–4 one merge each, a band per merge, tokens formed in that band in pastel
// violet (earlier merged tokens soft violet, characters neutral); step 4 also adds the id row and the counts. The
// <unk> cell is the only red (something breaks) and carries the ring.
//
// Geometry: label column x 20–146; word columns at x 160, 396, 632, 36 px per character (6 characters = 216 px; the
// unknown id is labelled "unk" to fit one cell, and the count text under it names it <unk>);
// bands 56 px apart from y 70; id row 44 px under the last band; counts and the vocabulary note under that.

const MERGED: LayoutTone = "violet"; // merged tokens, as in bpe-merges
const LABEL_X = 20;
const LABEL_W = 126;
const WORD_X = [160, 396, 632];
const COL_W = 226;
const CH = 36;
const CELL_H = 30;
const TOP = 70;
const PITCH = 56;
const bandY = (k: number) => TOP + k * PITCH;
const MERGES = BPE.merges.length;
const ID_Y = bandY(MERGES) + 44;
const COUNT_Y = ID_Y + CELL_H + 14;
const NOTE_Y = COUNT_Y + 52;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = "neutral",
  h = 20,
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: quiet || undefined });

const shapes: LayoutShape[] = [];

// Word titles.
ENCODED.forEach((e, c) =>
  shapes.push(text(`title-${c}`, WORD_X[c] - 8, TOP - 36, COL_W - 10, `“${e.word}”`, 1, "neutral", 22))
);

// One band per state: the characters, then one band after each merge.
for (let k = 0; k <= MERGES; k++) {
  const step = k + 1;
  const y = bandY(k);
  if (k === 0) {
    shapes.push(text("lbl-0", LABEL_X, y + 2, LABEL_W, "Start: characters", step, "neutral", 26, false));
  } else {
    const m = BPE.merges[k - 1];
    shapes.push({
      id: `lbl-${k}`,
      type: "box",
      x: LABEL_X,
      y: y - 6,
      w: LABEL_W,
      h: CELL_H + 12,
      label: `${m.a} + ${m.b} → ${m.a + m.b}`,
      sub: `apply merge ${k}`,
      tone: MERGED,
      fill: "pastel",
      step,
    });
  }
  ENCODED.forEach((e, c) => {
    const prev = k > 0 ? e.steps[k - 1] : [];
    let x = WORD_X[c];
    e.steps[k].forEach((sym, i) => {
      const merged = sym.length > 1;
      const isNew = merged && !prev.includes(sym);
      shapes.push({
        id: `tok-${k}-${c}-${i}`,
        type: "cell",
        x,
        y,
        w: sym.length * CH,
        h: CELL_H,
        label: sym,
        tone: merged ? MERGED : "neutral",
        fill: isNew ? "pastel" : "soft",
        step,
        quiet: true,
      });
      x += sym.length * CH;
    });
  });
}

// Ids of the final tokens, and the token counts.
const last = MERGES + 1;
shapes.push(text("lbl-ids", LABEL_X, ID_Y + 4, LABEL_W, "Token ids", last, "neutral", 22));
ENCODED.forEach((e, c) => {
  let x = WORD_X[c];
  e.tokens.forEach((tok, i) => {
    const id = e.ids[i];
    shapes.push({
      id: `id-${c}-${i}`,
      type: "cell",
      x,
      y: ID_Y,
      w: tok.length * CH,
      h: CELL_H,
      label: id === undefined ? "unk" : String(id),
      tone: id === undefined ? ROLE_TONE.blocked : "neutral",
      fill: id === undefined ? "pastel" : "paper",
      highlight: id === undefined || undefined,
      step: last,
      quiet: id !== undefined || undefined,
    });
    x += tok.length * CH;
  });
  const unknown = e.ids.filter((v) => v === undefined).length;
  const counts = `${e.word.length} characters → ${e.tokens.length} tokens`;
  shapes.push(
    text(
      `count-${c}`,
      WORD_X[c] - 8,
      COUNT_Y,
      COL_W - 10,
      unknown ? `${counts}\n“y” was never seen: <unk>` : counts,
      last,
      unknown ? ROLE_TONE.blocked : "neutral",
      unknown ? 40 : 20
    )
  );
});

shapes.push(
  text(
    "vocab",
    LABEL_X,
    NOTE_Y,
    820,
    `Ids come from the trained vocabulary, in the order it was built: ${BPE.vocab
      .map((t, i) => `${t} ${i}`)
      .join(", ")}.`,
    1,
    "neutral",
    20
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Encoding new words with the learned merges",
  width: 860,
  height: NOTE_Y + 34,
  shapes,
  steps: [
    { title: "Split three unseen words into characters" },
    { title: "Apply merge 1, l + o, wherever the pair occurs" },
    { title: "Apply merge 2, lo + w: both lo tokens become low" },
    { title: "Apply merge 3, low + e, then look up each token's id" },
  ],
};

export default spec;
