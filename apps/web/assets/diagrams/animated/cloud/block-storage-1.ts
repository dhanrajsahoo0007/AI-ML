import type { LayoutSpec } from "@/components/diagrams/types";

// The three numbers of a block volume (cloud/data/block-storage), one row per step.
// Step 1, IOPS: the review database asks for many small 8 KB blocks; 1,200 reads a second move under 10 MB, so the
// count of reads is the limit. Step 2, throughput: a backup job reads the same volume in 1 MB pieces; 125 reads a
// second move 125 MB, so megabytes per second are the limit. Step 3, latency: how long one read takes on a laptop
// SSD, a network SSD volume and a network HDD volume (rough planning values, not provider figures).
// Each row: a reader box on the left (x 20), the reads in the middle (x 180 to 520), the volume on the right
// (x 560); an arrow and a sentence under the row. Row tops: 40, 160, 280. The first row starts at y 40 so the NEW
// badges stay inside the canvas.
const cell = (id: string, x: number, y: number) => ({
  id,
  type: "cell" as const,
  x,
  y,
  w: 44,
  h: 40,
  label: "8 KB",
  tone: "teal" as const,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "IOPS, throughput and latency",
  width: 700,
  height: 380,
  steps: [
    { title: "IOPS: how many reads a second" },
    { title: "Throughput: how many megabytes a second" },
    { title: "Latency: how long one read takes" },
  ],
  shapes: [
    // Step 1: many small reads.
    {
      id: "db",
      type: "box",
      x: 20,
      y: 36,
      w: 140,
      h: 48,
      label: "Review database",
      sub: "small, scattered",
      tone: "teal",
    },
    cell("c1", 180, 40),
    cell("c2", 236, 40),
    cell("c3", 292, 40),
    cell("c4", 348, 40),
    cell("c5", 404, 40),
    cell("c6", 460, 40),
    {
      id: "vol1",
      type: "box",
      x: 560,
      y: 36,
      w: 120,
      h: 48,
      label: "Volume",
      sub: "IOPS limit",
      tone: "violet",
      highlight: true,
    },
    { id: "a1", type: "arrow", x: 180, y: 96, w: 370, h: 0, label: "1,200 reads a second", tone: "teal", packet: true },
    {
      id: "t1",
      type: "text",
      x: 20,
      y: 112,
      w: 660,
      h: 20,
      label: "1,200 × 8 KB = under 10 MB a second. The number of reads is the limit.",
      tone: "neutral",
    },

    // Step 2: few big reads.
    {
      id: "backup",
      type: "box",
      x: 20,
      y: 156,
      w: 140,
      h: 48,
      label: "Backup job",
      sub: "big, start to end",
      tone: "orange",
      step: 2,
    },
    { id: "m1", type: "box", x: 180, y: 160, w: 160, h: 40, label: "1 MB", tone: "orange", step: 2 },
    { id: "m2", type: "box", x: 350, y: 160, w: 160, h: 40, label: "1 MB", tone: "orange", step: 2 },
    {
      id: "vol2",
      type: "box",
      x: 560,
      y: 156,
      w: 120,
      h: 48,
      label: "Volume",
      sub: "MB/s limit",
      tone: "violet",
      highlight: true,
      step: 2,
    },
    {
      id: "a2",
      type: "arrow",
      x: 180,
      y: 216,
      w: 370,
      h: 0,
      label: "125 reads a second",
      tone: "orange",
      packet: true,
      step: 2,
    },
    {
      id: "t2",
      type: "text",
      x: 20,
      y: 232,
      w: 660,
      h: 20,
      label: "125 × 1 MB = 125 MB a second. The megabytes are the limit: throughput.",
      tone: "neutral",
      step: 2,
    },

    // Step 3: the time one read takes.
    {
      id: "l1",
      type: "box",
      x: 20,
      y: 280,
      w: 200,
      h: 48,
      label: "Laptop SSD",
      sub: "about 0.1 ms",
      tone: "neutral",
      step: 3,
    },
    {
      id: "l2",
      type: "box",
      x: 250,
      y: 280,
      w: 200,
      h: 48,
      label: "Network SSD volume",
      sub: "about 1 ms",
      tone: "violet",
      highlight: true,
      step: 3,
    },
    {
      id: "l3",
      type: "box",
      x: 480,
      y: 280,
      w: 200,
      h: 48,
      label: "Network HDD volume",
      sub: "several ms",
      tone: "violet",
      step: 3,
    },
    {
      id: "t3",
      type: "text",
      x: 20,
      y: 340,
      w: 660,
      h: 20,
      label: "Reads beyond the limit wait in a queue, and the wait adds to every read.",
      tone: "neutral",
      step: 3,
    },
  ],
};

export default spec;
