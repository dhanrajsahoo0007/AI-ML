import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// File → chunks → hashes → resume → dedup (blob-storage-and-chunking, "Chunks, hashes and dedup").
// The seller's 800 MB kettle video (illustrative size) cut into fixed 16 MB chunks.
// Four steps: 1 split the file into 50 chunks · 2 hash each chunk with SHA-256; the ordered hashes are the file's
// blocklist, stored as metadata · 3 the link drops during chunk 31: chunks 1 to 30 are stored, so the resume sends
// chunks 31 to 50 · 4 the same video on a second listing: all 50 hashes are known, so no bytes move and only a new
// blocklist row is written.
// Working (computed below): 800 ÷ 16 = 50 chunks; the resume sends 20 × 16 = 320 MB, not 800 MB; the second listing
// sends 0 MB and saves 800 MB of storage.
// Layout (840 × 430): row labels in a 180 px column on the left; chunk strips of 50 cells × 12 px from x 200 to 800.
// Colours (PATTERN_TONE): file and chunks blue (data), hashes and the blocklist pink (ids), stored or known chunks
// green (the pattern: what the client does not resend), the lost chunk red.
// Fact check (2026-11-16, Dropbox tech blog "Streaming file synchronization"): Dropbox splits files into 4 MB blocks,
// hashes each with SHA-256, commits the list of hashes, and uploads only the blocks the server reports missing.

const FILE_MB = 800;
const CHUNK_MB = 16;
const N = FILE_MB / CHUNK_MB; // 50
const SENT = 30;
const PX = 12;
const X0 = 200;
const STRIP = N * PX; // 600
const shapes: LayoutShape[] = [];

const rowLabel = (id: string, y: number, label: string, step: number) =>
  shapes.push({ id, type: "text", x: 10, y, w: 180, h: 30, label, tone: PATTERN_TONE.infra, step, quiet: true });

const strip = (
  prefix: string,
  y: number,
  step: number,
  toneOf: (i: number) => { tone: (typeof PATTERN_TONE)[keyof typeof PATTERN_TONE]; fill: "pastel" | "paper" | "soft" }
) => {
  for (let i = 0; i < N; i++) {
    const { tone, fill } = toneOf(i);
    shapes.push({
      id: `${prefix}-${i + 1}`,
      type: "cell",
      x: X0 + i * PX,
      y,
      w: PX,
      h: 30,
      tone,
      fill,
      step,
      quiet: true,
    });
  }
};

const note = (
  id: string,
  y: number,
  label: string,
  tone: (typeof PATTERN_TONE)[keyof typeof PATTERN_TONE],
  step: number
) => shapes.push({ id, type: "text", x: X0, y, w: STRIP, h: 18, label, tone, step });

// Step 1: the file and its chunks.
rowLabel("l-file", 16, "The video", 1);
shapes.push({
  id: "file",
  type: "box",
  x: X0,
  y: 14,
  w: STRIP,
  h: 34,
  label: `kettle-demo.mp4: ${FILE_MB} MB`,
  tone: PATTERN_TONE.data,
  fill: "pastel",
  step: 1,
});
rowLabel("l-chunks", 70, `${N} chunks of ${CHUNK_MB} MB`, 1);
strip("c", 70, 1, () => ({ tone: PATTERN_TONE.data, fill: "pastel" }));
note("n-chunks", 104, `chunk 1 … chunk ${N}: fixed ${CHUNK_MB} MB boundaries`, PATTERN_TONE.data, 1);

// Step 2: a hash per chunk and the blocklist.
rowLabel("l-hash", 148, "SHA-256 per chunk", 2);
const hashes = [
  { i: 1, x: X0, h: "h1 9f2a…" },
  { i: 2, x: X0 + 130, h: "h2 03bc…" },
  { i: 3, x: X0 + 260, h: "h3 e71d…" },
  { i: N, x: X0 + STRIP - 110, h: `h${N} 5a90…` },
];
for (const { i, x, h } of hashes) {
  shapes.push({
    id: `h-${i}`,
    type: "box",
    x,
    y: 146,
    w: 110,
    h: 32,
    label: h,
    tone: PATTERN_TONE.id,
    fill: "pastel",
    step: 2,
    quiet: true,
  });
  // Arrows only from the first and last chunk: lines from chunks 2 and 3 would cross.
  if (i === 1 || i === N) {
    shapes.push({ id: `a-${i}`, type: "arrow", x: 0, y: 0, from: `c-${i}`, to: `h-${i}`, step: 2, quiet: true });
  }
}
shapes.push({
  id: "h-dots",
  type: "text",
  x: X0 + 380,
  y: 146,
  w: 100,
  h: 32,
  label: "…",
  tone: PATTERN_TONE.id,
  step: 2,
  quiet: true,
});
shapes.push({
  id: "blocklist",
  type: "box",
  x: X0,
  y: 192,
  w: STRIP,
  h: 30,
  label: `blocklist: h1, h2, h3 … h${N} (the file's recipe, in metadata)`,
  tone: PATTERN_TONE.id,
  fill: "soft",
  step: 2,
  highlight: true,
});

// Step 3: the link drops during chunk 31; resume sends 31 to 50.
rowLabel("l-resume", 252, "Link drops, resume", 3);
strip("r", 252, 3, (i) =>
  i < SENT
    ? { tone: PATTERN_TONE.pattern, fill: "pastel" }
    : i === SENT
      ? { tone: PATTERN_TONE.fail, fill: "pastel" }
      : { tone: PATTERN_TONE.infra, fill: "paper" }
);
note(
  "n-resume",
  286,
  `1 to ${SENT} stored; resend ${SENT + 1} to ${N}: ${(N - SENT) * CHUNK_MB} MB, not ${FILE_MB} MB`,
  PATTERN_TONE.pattern,
  3
);

// Step 4: the same video on a second listing.
rowLabel("l-dedup", 334, "Second listing", 4);
strip("d", 334, 4, () => ({ tone: PATTERN_TONE.pattern, fill: "pastel" }));
note("n-dedup", 368, `all ${N} hashes known: 0 MB sent, one new blocklist row`, PATTERN_TONE.pattern, 4);

const spec: LayoutSpec = {
  kind: "layout",
  title: "A video cut into chunks, hashed, resumed and deduplicated",
  width: X0 + STRIP + 40,
  height: 400,
  shapes,
  steps: [
    { title: "Split into 16 MB chunks" },
    { title: "Hash each chunk" },
    { title: "The link drops: resend the rest" },
    { title: "Same video again: nothing to send" },
  ],
};

export default spec;
