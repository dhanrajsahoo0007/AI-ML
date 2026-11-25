import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { TEA } from "@/components/diagrams/presets/llm-tokens";

// What a byte-level tokenizer starts from: "tea" in six writings, each character with its UTF-8 bytes. Before any
// merge, a byte-level BPE (GPT-2, Radford et al. 2019, §2.2: "a byte-level version of BPE only requires a base
// vocabulary of size 256") gives one token per byte, so the byte count is the token count before merges. The bytes
// are computed with TextEncoder in presets/llm-tokens.ts (working in its header comment):
//   English tea  74 65 61                       3 characters → 3 bytes
//   German  Tee  54 65 65                       3 → 3
//   Russian чай  D1 87 · D0 B0 · D0 B9          3 → 6  (Cyrillic: 2 bytes per character)
//   Hindi   चाय  E0 A4 9A · E0 A4 BE · E0 A4 AF  3 → 9  (Devanagari: 3 bytes per code point; ा is a vowel sign)
//   Chinese 茶   E8 8C B6                       1 → 3
//   Emoji   🍵   F0 9F 8D B5                    1 → 4
// UTF-8 lengths: U+0000–007F 1 byte, U+0080–07FF 2, U+0800–FFFF 3, U+10000 and above 4 (RFC 3629, §3).
// The letter "y", which had no id in `bpe-encode`, is byte 79 here: all 256 byte values are in the base vocabulary,
// so no input is ever unknown.
//
// Geometry: language names x 20–110; each character is a cell spanning its bytes (52 px per byte, from x 130, at most
// 9 bytes = 468 px); the byte count per row in a teal cell at x 620. Rows 84 px apart from y 74. Colour: characters
// neutral, bytes teal; the Hindi count (the largest) carries the ring.

const BYTE: LayoutTone = "teal";
const NAME_X = 20;
const NAME_W = 90;
const X0 = 130;
const BW = 52;
const CHAR_H = 40;
const BYTE_H = 26;
const TOP = 74;
const PITCH = 84;
const COUNT_X = 620;
const COUNT_W = 120;
const rowY = (r: number) => TOP + r * PITCH;
const MAX = Math.max(...TEA.map((t) => t.byteCount));
const Y_BYTE = new TextEncoder().encode("y")[0].toString(16).toUpperCase();

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone = "neutral",
  h = 20,
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step: 1, quiet: quiet || undefined });

const shapes: LayoutShape[] = [
  text(
    "h-chars",
    X0 - 10,
    TOP - 46,
    9 * BW + 20,
    "Characters (Unicode code points), then their UTF-8 bytes in hex",
    "neutral",
    20,
    false
  ),
  text("h-count", COUNT_X - 20, TOP - 46, COUNT_W + 140, "Tokens before any merge", BYTE),
];

TEA.forEach((t, r) => {
  const y = rowY(r);
  shapes.push(text(`name-${r}`, NAME_X, y + CHAR_H / 2 - 10, NAME_W, t.lang, "neutral", 20));
  let x = X0;
  t.chars.forEach((c, i) => {
    shapes.push({
      id: `ch-${r}-${i}`,
      type: "cell",
      x,
      y,
      w: c.bytes.length * BW,
      h: CHAR_H,
      label: c.ch,
      sub: c.code,
      tone: "neutral",
      fill: "soft",
      step: 1,
      quiet: true,
    });
    c.bytes.forEach((b, j) =>
      shapes.push({
        id: `b-${r}-${i}-${j}`,
        type: "cell",
        x: x + j * BW,
        y: y + CHAR_H + 2,
        w: BW,
        h: BYTE_H,
        label: b,
        tone: BYTE,
        fill: "pastel",
        step: 1,
        quiet: true,
      })
    );
    x += c.bytes.length * BW;
  });
  shapes.push({
    id: `count-${r}`,
    type: "cell",
    x: COUNT_X,
    y: y + 10,
    w: COUNT_W,
    h: 40,
    label: `${t.byteCount} bytes`,
    sub: `${t.chars.length} character${t.chars.length > 1 ? "s" : ""}`,
    tone: BYTE,
    weight: Math.round((0.15 + (0.55 * t.byteCount) / MAX) * 100) / 100,
    highlight: t.byteCount === MAX || undefined,
    step: 1,
    quiet: t.byteCount !== MAX || undefined,
  });
});

const NOTE_Y = rowY(TEA.length) - 6;
shapes.push(
  text(
    "note",
    NAME_X,
    NOTE_Y,
    820,
    `All 256 byte values are in the base vocabulary, so nothing is unknown: the “y” of “slowly” is byte ${Y_BYTE}.\nMerges learned from the training data then join the byte runs it saw often; rare scripts stay near these counts.`,
    "neutral",
    40
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "“Tea” in six writings, as UTF-8 bytes",
  width: 860,
  height: NOTE_Y + 60,
  shapes,
};

export default spec;
