import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// Training BPE on the page's tiny corpus "low", "lower", "newest" (each word once), three merges. The counting is done
// by the small BPE trainer below, so every number drawn comes from code.
//
// Rules used (as in Sennrich et al. 2016, arXiv 1508.07909, §3.2, minus the end-of-word marker):
// - Each word starts as a sequence of characters. No end-of-word marker is added, to keep the figure small; pairs never
//   cross a word boundary.
// - Each round counts every adjacent pair of symbols in the corpus and merges the most frequent one everywhere.
// - Tie-break: among pairs with the same count, the one seen first wins (reading the words in order, left to right).
//
// Working (pairs listed in order of first appearance):
//   start      l o w | l o w e r | n e w e s t
//              l+o 2, o+w 2, w+e 2, e+r 1, n+e 1, e+w 1, e+s 1, s+t 1  → tie at 2 (l+o, o+w, w+e); l+o seen first
//   merge 1    l + o → lo:   lo w | lo w e r | n e w e s t
//              lo+w 2, w+e 2, e+r 1, n+e 1, e+w 1, e+s 1, s+t 1         → tie at 2; lo+w seen first
//   merge 2    lo + w → low: low | low e r | n e w e s t
//              low+e 1, e+r 1, n+e 1, e+w 1, w+e 1, e+s 1, s+t 1        → every pair once; low+e seen first
//   merge 3    low + e → lowe: low | lowe r | n e w e s t
// Merge list: l + o → lo, lo + w → low, low + e → lowe. Vocabulary: l o w e r n s t + lo, low, lowe (8 → 11).
//
// Note: the page's text says "e.g. 'w' + 'e'". On this corpus w+e ties with l+o and o+w at 2 in the first count, so
// it is a valid first merge only with a different tie-break; with "seen first" the first merge is l + o.

// ── A tiny BPE trainer ──────────────────────────────────────────────────────────────────────────────────────────

const CORPUS = ["low", "lower", "newest"];
const MERGES = 3;

type Pair = { a: string; b: string; count: number };

/** Every adjacent pair in the corpus with its count, in order of first appearance. */
function countPairs(words: string[][]): Pair[] {
  const seen = new Map<string, Pair>();
  for (const w of words)
    for (let i = 0; i + 1 < w.length; i++) {
      const key = `${w[i]}\u0000${w[i + 1]}`;
      const p = seen.get(key);
      if (p) p.count += 1;
      else seen.set(key, { a: w[i], b: w[i + 1], count: 1 });
    }
  return [...seen.values()];
}

/** The most frequent pair; on a tie, the first one seen (Array order is first appearance). */
const best = (pairs: Pair[]) => pairs.reduce((top, p) => (p.count > top.count ? p : top));

function mergeWord(w: string[], a: string, b: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < w.length; i++) {
    if (i + 1 < w.length && w[i] === a && w[i + 1] === b) {
      out.push(a + b);
      i += 1;
    } else out.push(w[i]);
  }
  return out;
}

interface Round {
  words: string[][];
  pairs: Pair[];
  /** The pair merged to reach this round (undefined for the start). */
  merged?: Pair;
}

const rounds: Round[] = [];
{
  let words = CORPUS.map((w) => [...w]);
  let merged: Pair | undefined;
  for (let r = 0; r <= MERGES; r++) {
    const pairs = countPairs(words);
    rounds.push({ words, pairs, merged });
    if (r === MERGES) break;
    merged = best(pairs);
    const m = merged;
    words = words.map((w) => mergeWord(w, m.a, m.b));
  }
}
const BASE_VOCAB = [...new Set(CORPUS.join(""))]; // l o w e r n s t
const MAX_COUNT = Math.max(...rounds[0].pairs.map((p) => p.count));

// ── Layout ──────────────────────────────────────────────────────────────────────────────────────────────────────

const NEW_TONE: LayoutTone = "violet"; // merged symbols, in the corpus, the vocabulary and the new-token boxes
const COUNT_TONE: LayoutTone = "orange";

const COL_A = 20; // new-token boxes
const COL_A_W = 104;
const CORPUS_X = 156;
const CH = 22; // width of one character in the corpus; a merged symbol spans its characters
const ROW_H = 24;
const ROW_GAP = 5;
const COUNTS_X = 330;
const PILL_W = 58;
const PILL_H = 40;
const PILL_GAP = 6;
const TOP = 84;
const PITCH = 116;
const bandTop = (k: number) => TOP + k * PITCH;
const BAND_H = 3 * ROW_H + 2 * ROW_GAP; // 82
const NEW_BOX_H = 44;
const newBoxY = (k: number) => bandTop(k) + (BAND_H - NEW_BOX_H) / 2;
const pillY = (k: number) => bandTop(k) + (BAND_H - PILL_H) / 2;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = "neutral",
  h = 20,
  quiet = false
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: quiet || undefined });

const shapes: LayoutShape[] = [];

// Column headings (quiet: in step 1 the "Start: characters" label carries the ring).
shapes.push(
  text("h-new", COL_A - 4, TOP - 46, COL_A_W + 8, "New token", 1, "neutral", 20, true),
  text("h-corpus", CORPUS_X - 10, TOP - 46, 6 * CH + 20, "Corpus", 1, "neutral", 20, true),
  text(
    "h-counts",
    COUNTS_X - 6,
    TOP - 46,
    8 * PILL_W + 7 * PILL_GAP + 12,
    "Adjacent pairs and their counts (a tie goes to the pair seen first)",
    1,
    COUNT_TONE,
    20,
    true
  )
);

rounds.forEach((round, k) => {
  const step = k + 1;
  const top = bandTop(k);

  // Left column: what this round added.
  if (round.merged) {
    const m = round.merged;
    shapes.push({
      id: `new-${k}`,
      type: "box",
      x: COL_A,
      y: newBoxY(k),
      w: COL_A_W,
      h: NEW_BOX_H,
      label: m.a + m.b,
      sub: `merge ${k}: ${m.a} + ${m.b}`,
      tone: NEW_TONE,
      fill: "pastel",
      step,
    });
    // From the winning pair of the previous round, through the gap between bands, into the new token.
    const prevWin = rounds[k - 1].pairs.indexOf(best(rounds[k - 1].pairs));
    const gapY = bandTop(k) - (PITCH - BAND_H) / 2;
    shapes.push({
      id: `merge-${k}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `pair-${k - 1}-${prevWin}`,
      to: `new-${k}`,
      via: [
        [COUNTS_X + prevWin * (PILL_W + PILL_GAP) + PILL_W / 2, gapY],
        [COL_A + COL_A_W / 2, gapY],
      ],
      step,
    });
  } else {
    shapes.push(text("start", COL_A, newBoxY(k), COL_A_W, "Start:\ncharacters", step, "neutral", NEW_BOX_H));
  }

  // The corpus, one word per row; a merged symbol is one wider cell.
  round.words.forEach((w, r) => {
    let x = CORPUS_X;
    w.forEach((sym, i) => {
      const merged = sym.length > 1;
      shapes.push({
        id: `w-${k}-${r}-${i}`,
        type: "cell",
        x,
        y: top + r * (ROW_H + ROW_GAP),
        w: sym.length * CH,
        h: ROW_H,
        label: sym,
        tone: merged ? NEW_TONE : "neutral",
        fill: merged ? "pastel" : "soft",
        step,
        quiet: true,
      });
      x += sym.length * CH;
    });
  });

  // Pair counts (not for the last round: training would go on from there).
  if (k < MERGES) {
    const win = best(round.pairs);
    round.pairs.forEach((p, i) => {
      shapes.push({
        id: `pair-${k}-${i}`,
        type: "cell",
        x: COUNTS_X + i * (PILL_W + PILL_GAP),
        y: pillY(k),
        w: PILL_W,
        h: PILL_H,
        label: `${p.a} + ${p.b}`,
        sub: String(p.count),
        tone: COUNT_TONE,
        weight: Math.round((0.15 + (0.55 * p.count) / MAX_COUNT) * 100) / 100,
        highlight: p === win || undefined,
        step,
        quiet: true,
      });
    });
  }
});

// After the last merge: what happens next.
shapes.push(
  text(
    "next",
    COUNTS_X - 6,
    bandTop(MERGES) + 12,
    8 * PILL_W + 7 * PILL_GAP + 12,
    "Training repeats until the vocabulary reaches its target size.\nThe ordered merge list is the tokenizer: l + o, then lo + w, then low + e.",
    MERGES + 1,
    "neutral",
    40,
    true
  )
);

// The vocabulary: the 8 characters, then one new symbol per merge.
const VOCAB_Y = bandTop(MERGES) + BAND_H + 40;
shapes.push(text("h-vocab", COL_A, VOCAB_Y + 2, COL_A_W, "Vocabulary", 1, "neutral", 26, true));
{
  let x = CORPUS_X;
  BASE_VOCAB.forEach((c, i) => {
    shapes.push({
      id: `v-base-${i}`,
      type: "cell",
      x,
      y: VOCAB_Y,
      w: 28,
      h: 30,
      label: c,
      tone: "neutral",
      fill: "soft",
      step: 1,
      quiet: true,
    });
    x += 28 + 4;
  });
  rounds.slice(1).forEach((round, j) => {
    const sym = round.merged!.a + round.merged!.b;
    const w = 20 + sym.length * 9;
    x += 8;
    shapes.push({
      id: `v-new-${j}`,
      type: "cell",
      x,
      y: VOCAB_Y,
      w,
      h: 30,
      label: sym,
      tone: NEW_TONE,
      fill: "pastel",
      step: j + 2,
      quiet: true,
    });
    x += w;
  });
  shapes.push(
    text(
      "v-size",
      x + 16,
      VOCAB_Y + 5,
      170,
      `${BASE_VOCAB.length} characters + ${MERGES} merges`,
      MERGES + 1,
      NEW_TONE,
      20,
      true
    )
  );
}

shapes.push(
  text(
    "note",
    COL_A,
    VOCAB_Y + 48,
    820,
    "Each word appears once and gets no end-of-word marker; pairs never cross a word boundary.",
    1,
    "neutral",
    20,
    true
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: 'Training BPE on "low", "lower", "newest"',
  width: 860,
  height: VOCAB_Y + 80,
  shapes,
  steps: [
    { title: "Split each word into characters and count every adjacent pair" },
    { title: "Merge the most frequent pair, l + o, into the new token lo" },
    { title: "Count again and merge lo + w into low" },
    { title: "Every pair now occurs once, so the tie-break picks low + e" },
  ],
};

export default spec;
