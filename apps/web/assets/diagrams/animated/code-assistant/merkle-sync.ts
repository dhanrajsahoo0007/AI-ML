import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { RAG_TONE } from "@/components/diagrams/presets/rag";
import { INDEX } from "@/components/diagrams/presets/gcase-code";

// Index freshness with a Merkle tree of file hashes (code-assistant, design sheet §5 "Merkle sync", §10.4–10.5, Step 3;
// preset INDEX in presets/gcase-code.ts; 64 bytes an entry from dossier F24: 3.2 MB for 50,000 files):
//   a balanced tree over INDEX.files = 50,000 files at fan-out 20 has ceil(log₂₀ 50,000) = INDEX.levels = 4 levels;
//   one saved file changes one hash per level, so the client compares 20 hashes × 64 B = 1.28 KB a level, 4 levels:
//   INDEX.oneFileCompareKB ≈ 5.1 KB in 4 round trips, INDEX.oneFileSyncMs ≈ 200 ms at 50 ms RTT. When nothing changed,
//   one root compare. Re-uploading the whole tree would be 3.2 MB a sync.
//   What syncs where: local grep and symbols ≤ 1 s after a save (nothing leaves the machine; a new 50,000-file clone
//   builds a 120 MB index in ≈ 8 s, ripgrep until then); cloud tasks started from uncommitted work get only the changed
//   files; the embeddings arm (A/B only) gets changed chunks, secret-scanned, with HMAC-keyed paths, embedded within
//   2 minutes at p95 (750 chunks of churn a day). Sync runs 30 s after the last save, on a branch switch, and before a
//   cloud task.
// Steps: 1 the tree and one changed path · 2 what leaves the machine, and when.
// Layout (880 wide): the tree on the left (x 20–500: a root over columns 2–3, then one row of 6 of the 20 children a
// level, the changed child orange and stepping one column a row, an arrow down to the next row; the leaf is ringed), one note a row on the right (x 520); three boxes below for step 2.
// Colours: unchanged hashes neutral; the changed path orange (the developer's edit); notes neutral; the boxes: local
// index violet (a store), cloud task teal (a tool), embeddings arm pink (embeddings, the RAG legend).

const X = 20;
const CELL_W = 64;
const CELL_H = 28;
const GAP = 8;
const ROW0 = 34;
const PITCH = 52;
const NOTE_X = 520;
const NOTE_W = 340;
const SHOWN = 6;

const KB = (bytes: number) => (bytes / 1_000).toFixed(2);
const perLevel = 20 * INDEX.entryBytes; // 1,280 B

const HEX = ["e41a", "07c3", "b98d", "5f20", "a6e1", "3d4b", "c870", "91fe", "2b6a", "f03c"];
// The changed child's position in each of the four rows: it steps one column at a time, so each arrow crosses only the
// gap between two rows. The tree is balanced by hash, not by directory, so inner nodes are hashes; the leaf is the
// file Brightpost's developer saved.
const CHANGED = [2, 3, 2, 3];
const CHANGED_LABEL = ["≠ 7b2a", "≠ 19cd", "≠ 4e80", "parser.ts"];

const rowY = (level: number) => ROW0 + level * PITCH;
const cellX = (i: number) => X + i * (CELL_W + GAP);

const text = (
  id: string,
  x: number,
  y: number,
  label: string,
  step: number,
  w = NOTE_W,
  quiet = true
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
  quiet,
});

const ROOT_X = cellX(2);
const tree: LayoutShape[] = [
  {
    id: "root",
    type: "cell",
    x: ROOT_X,
    y: rowY(0),
    w: 2 * CELL_W + GAP,
    h: CELL_H,
    label: "Root hash ≠",
    tone: GENAI_TONE.user,
    fill: "pastel",
    step: 1,
    quiet: true, // step 1's one ring is on the saved file
  },
];
for (let level = 1; level <= INDEX.levels; level++) {
  const y = rowY(level);
  const changed = CHANGED[level - 1];
  for (let i = 0; i < SHOWN; i++) {
    const hit = i === changed;
    tree.push({
      id: `n${level}-${i}`,
      type: "cell",
      x: cellX(i),
      y,
      w: CELL_W,
      h: CELL_H,
      label: hit ? CHANGED_LABEL[level - 1] : HEX[(level * 3 + i) % HEX.length],
      tone: hit ? GENAI_TONE.user : PROD_TONE.infra,
      fill: hit ? "pastel" : "soft",
      step: 1,
      quiet: !(hit && level === INDEX.levels),
    });
  }
  tree.push(text(`more${level}`, cellX(SHOWN), y + 5, "… 20", 1, 44));
  const from = level === 1 ? "root" : `n${level - 1}-${CHANGED[level - 2]}`;
  tree.push({ id: `a${level}`, type: "arrow", x: 0, y: 0, from, to: `n${level}-${changed}`, step: 1, quiet: true });
}

const notes: LayoutShape[] = [
  text("note0", NOTE_X, rowY(0) + 5, "Same root: nothing to sync, one compare", 1),
  ...Array.from({ length: INDEX.levels }, (_, i) =>
    text(
      `note${i + 1}`,
      NOTE_X,
      rowY(i + 1) + 5,
      `Round ${i + 1}: 20 hashes × ${INDEX.entryBytes} B = ${KB(perLevel)} KB`,
      1
    )
  ),
];

const TOTAL_Y = rowY(INDEX.levels) + CELL_H + 14;
const step1: LayoutShape[] = [
  text(
    "h1",
    X,
    4,
    `${n(INDEX.files)} files, fan-out 20: ${INDEX.levels} levels; one saved file changes one path`,
    1,
    520,
    true
  ),
  ...tree,
  ...notes,
  text(
    "total",
    X,
    TOTAL_Y,
    `${INDEX.levels} × 20 × ${INDEX.entryBytes} B ≈ ${INDEX.oneFileCompareKB.toFixed(1)} KB in ${INDEX.levels} round trips (≈ ${INDEX.oneFileSyncMs} ms at 50 ms RTT), against 3.2 MB to re-upload the tree`,
    1,
    840
  ),
];

// ── Step 2: what leaves the machine, and when ────────────────────────────────────────────────────────────────────
const H2_Y = TOTAL_Y + 40;
const BOX_Y = H2_Y + 28;
const BOX_W = 270;
const BOX_H = 76;
const box = (id: string, i: number, label: string, tone: LayoutTone): LayoutShape => ({
  id,
  type: "box",
  x: X + i * (BOX_W + 15),
  y: BOX_Y,
  w: BOX_W,
  h: BOX_H,
  label,
  tone,
  fill: "soft",
  step: 2,
  quiet: true,
});
const step2: LayoutShape[] = [
  text("h2", X, H2_Y, "What leaves the machine, and when", 2, 250, false),
  box(
    "local",
    0,
    `Local grep and symbols\nupdated ≤ ${INDEX.freshness.localGrepS} s after a save\nnothing leaves the machine`,
    GENAI_TONE.store
  ),
  box(
    "cloud",
    1,
    "Cloud task from uncommitted work\nonly the changed files\nsecret-scanned on the client",
    GENAI_TONE.tool
  ),
  box(
    "arm",
    2,
    `Embeddings arm (A/B only)\nchanged chunks, HMAC-keyed paths\nembedded ≤ ${INDEX.freshness.embeddingsP95Min} min at p95`,
    RAG_TONE.embedding
  ),
  text(
    "when",
    X,
    BOX_Y + BOX_H + 14,
    `Sync runs ${INDEX.syncDebounceS} s after the last save, on a branch switch and before a cloud task; a new clone builds its ${INDEX.localIndexMB} MB index in ≈ ${INDEX.buildS} s (ripgrep until then)`,
    2,
    840
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: `Merkle sync: one saved file costs ≈ ${INDEX.oneFileCompareKB.toFixed(1)} KB of hashes in ${INDEX.levels} round trips`,
  width: 880,
  height: BOX_Y + BOX_H + 40,
  steps: [
    {
      title: `One changed path: ${INDEX.levels} rounds of 20 hashes, ≈ ${INDEX.oneFileCompareKB.toFixed(1)} KB and ≈ ${INDEX.oneFileSyncMs} ms`,
    },
    { title: "What leaves the machine: changed files for cloud tasks, changed chunks for the arm" },
  ],
  shapes: [...step1, ...step2],
};

export default spec;
