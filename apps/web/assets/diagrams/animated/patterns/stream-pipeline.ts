import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// Brightpost's trending-products pipeline, built one part at a time (stream-processing-and-windowing, Architecture).
// Six steps: 1 web servers append every product view to a log, keyed by product id · 2 a window counter reads the
// log partitions and counts views per product in 5-minute event-time windows · 3 the counts live in a local state
// store (RocksDB in Flink) · 4 a checkpoint every 60 s (illustrative) saves the state and the log offsets together ·
// 5 when the watermark closes a window, the top 20 products are upserted into the trending list, keyed by window ·
// 6 a worker crashes: the job restores the last checkpoint and rewinds the log to its offsets.
// Working: 463 views/s on average (SHOP.averageReadsPerSecond) × 300 s = 138,900 views per 5-minute window.
// Layout (880 × 500): web servers above the log in the left column; the window counter in the middle with its state
// store below; checkpoints bottom left; the trending list and the crash on the right.
// Colours (PATTERN_TONE): web servers teal (compute), log, state, checkpoints and trending list violet (stores), the
// window counter green (the pattern, the accent), the crash red.
// Fact check (2026-11-16, Flink docs "Stateful Stream Processing"): on failure Flink picks the latest completed
// checkpoint, restores each operator's state and restarts the sources from the checkpointed position; RocksDB is one
// of the state backends.

const perWindow = SHOP.averageReadsPerSecond * 300; // 138,900

const spec: DiagramSpec = {
  title: "A windowed counter for trending products",
  width: 880,
  height: 500,
  steps: [
    { title: "Views go into a log" },
    { title: "A keyed operator counts per window" },
    { title: "Counts live in a local state store" },
    { title: "Checkpoints save state and offsets" },
    { title: "Closed windows update the trending list" },
    { title: "A crash restores the last checkpoint" },
  ],
  zones: [],
  nodes: [
    {
      id: "web",
      label: "Web servers",
      sub: `${SHOP.averageReadsPerSecond} views/s`,
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 130,
      y: 80,
      w: 190,
    },
    {
      id: "log",
      label: "View log",
      sub: "keyed by product",
      icon: "log",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 130,
      y: 250,
      w: 190,
    },
    {
      id: "op",
      label: "Window counter",
      sub: `${n(perWindow)} views/window`,
      icon: "pipeline",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 2,
      x: 450,
      y: 250,
      w: 210,
    },
    {
      id: "state",
      label: "State store",
      sub: "a count per product",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 3,
      x: 450,
      y: 420,
      w: 210,
    },
    {
      id: "ckpt",
      label: "Checkpoints",
      sub: "state + offsets",
      icon: "snapshot",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 4,
      x: 130,
      y: 420,
      w: 190,
    },
    {
      id: "sink",
      label: "Trending list",
      sub: "top 20 per window",
      icon: "chart",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 5,
      x: 760,
      y: 250,
      w: 200,
    },
    {
      id: "crash",
      label: "Worker crash",
      sub: "mid-window",
      icon: "cpu",
      tone: PATTERN_TONE.fail,
      fill: "pastel",
      step: 6,
      x: 760,
      y: 420,
      w: 200,
    },
  ],
  edges: [
    { from: "web", to: "log", label: `${SHOP.averageReadsPerSecond} views/s`, packet: true },
    { from: "log", to: "op", label: "by product id", packet: true, step: 2 },
    { from: "op", to: "state", label: "read, add 1", bidirectional: true, step: 3 },
    { from: "state", to: "ckpt", label: "every 60 s", packet: true, step: 4 },
    { from: "log", to: "ckpt", label: "offsets", step: 4 },
    { from: "op", to: "sink", label: "top 20, upsert", packet: true, step: 5 },
    { from: "crash", to: "op", label: "restart", dashed: true, step: 6 },
    { from: "ckpt", to: "op", label: "restore, rewind", dashed: true, flow: true, step: 6 },
  ],
};

export default spec;
