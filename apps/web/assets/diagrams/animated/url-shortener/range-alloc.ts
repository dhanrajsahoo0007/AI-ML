import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A block of ids per link server (url-shortener, Step 3 and Deep dive 1).
// Three steps: 1 two link servers each take a block of 1,000 ids from the counter DB with one atomic
// "next = next + 1,000" each, so their blocks never overlap · 2 a create on server A takes the next id from memory,
// scrambles it, encodes it in base 62 and inserts the code only if it is absent · 3 server A crashes (the next
// create times out); on restart it
// takes a fresh block, and the 999 unused ids of its old block are a gap that is never filled.
// Working: blocks of 1,000; A gets 1,000,000 to 1,000,999, B gets 1,001,000 to 1,001,999, A after restart gets
// 1,002,000 to 1,002,999. Scramble for the picture: (id × 1,580,030,173 + 914,281,337) mod 62^7 (a bijection, since
// the multiplier is odd and not a multiple of 31); id 1,000,000 → 2,347,743,700,153 → base 62 "FkFnj3r". A real
// system uses a keyed permutation (a small block cipher over 0 to 62^7 − 1); the multiply-add is only for the figure.
// At 40 creates/s over 10 servers, one server uses a block in 1,000 ÷ 4 = 250 s; the counter DB sees 40 ÷ 1,000 =
// 0.04 calls/s.
// Layout: five lanes. Colours (PATTERN_TONE): the creator orange (traffic), link servers teal (compute), the counter
// DB and link store violet (stores); the crash is the red timeout arrow.

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SPACE = 62 ** 7; // 3,521,614,606,208
const scramble = (id: number) => (id * 1_580_030_173 + 914_281_337) % SPACE;
const base62 = (v: number) => {
  let s = "";
  for (let x = v; x > 0; x = Math.floor(x / 62)) s = ALPHABET[x % 62] + s;
  return s.padStart(7, "0");
};
const BLOCK = 1_000;
const fmt = (v: number) => v.toLocaleString("en-GB");
const range = (start: number) => `${fmt(start)} to ${fmt(start + BLOCK - 1)}`;
const A0 = 1_000_000;
const code = base62(scramble(A0)); // "FkFnj3r"

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A block of 1,000 ids per link server",
  lanes: [
    { id: "creator", label: "Creator", icon: "browser", tone: PATTERN_TONE.traffic },
    { id: "a", label: "Link server A", icon: "server", tone: PATTERN_TONE.compute },
    { id: "b", label: "Link server B", icon: "server", tone: PATTERN_TONE.compute },
    { id: "ctr", label: "Counter DB", icon: "database", tone: PATTERN_TONE.store },
    { id: "store", label: "Link store", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "a", to: "ctr", label: `next += ${fmt(BLOCK)}`, step: 1 },
    { from: "ctr", to: "a", label: range(A0), kind: "return", step: 1 },
    { from: "b", to: "ctr", label: `next += ${fmt(BLOCK)}`, step: 1 },
    { from: "ctr", to: "b", label: range(A0 + BLOCK), kind: "return", step: 1 },

    { from: "creator", to: "a", label: "POST /v1/links", step: 2 },
    { from: "a", to: "store", label: `insert ${code} if absent`, step: 2 },
    { from: "store", to: "a", label: "created", kind: "return", step: 2 },
    { from: "a", to: "creator", label: `201 s.example/${code}`, kind: "return", step: 2 },

    { from: "creator", to: "a", label: "POST: A has crashed", kind: "timeout", step: 3 },
    { from: "a", to: "ctr", label: `restart: next += ${fmt(BLOCK)}`, step: 3 },
    { from: "ctr", to: "a", label: range(A0 + 2 * BLOCK), kind: "return", step: 3 },
  ],
  notes: [
    { lane: "a", text: `id ${fmt(A0)} → scramble → ${code}`, step: 2, at: 4.5 },
    { lane: "a", text: `gap: ${fmt(A0 + 1)} to ${fmt(A0 + BLOCK - 1)}`, step: 3, at: 8.5 },
  ],
  steps: [
    { title: "Each server takes its own block" },
    { title: "A create costs no counter call" },
    { title: "A crash leaves a gap, never a repeat" },
  ],
};

export default spec;
