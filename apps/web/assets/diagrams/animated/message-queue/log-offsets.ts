import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// One partition as a log of offsets, two consumer groups at their own positions (distributed-message-queue, Step 3
// and Deep dive 1).
// Twelve messages at offsets 0 to 11, stored in three segment files of four messages each. Offsets 0 to 3 are older
// than the 7-day retention, so the cleaner deletes that whole file next. Offsets 4 to 10 are committed (on every
// in-sync replica); offset 11 is on the leader only, so no consumer can read it yet (the high watermark is 11).
// Two steps: 1 the billing group's next offset is 10, the analytics group's is 6: each group is one number per
// partition, and reading moves the number, not the data · 2 a bug is fixed in analytics, which resets its offset to
// 4 and reads 4 to 10 again; billing is untouched.
// Working: a group's position is one 8-byte offset per partition: 4,000 partitions × 20 groups × 8 bytes = 640 kB
// for the whole cluster, against a per-message acknowledgement record for every message in a queue.
// Layout (780 × 390): cells 50 wide on a 56 pitch from x 30, with 16 px more between segments; three dotted groups
// (segments) behind the cells; pointer boxes below with arrows up to their cells; a legend line at the bottom.
// Colours (PATTERN_TONE): committed messages blue (data), the uncommitted one lime (a check: not yet readable),
// expiring ones neutral, consumer groups teal (compute), the replay green (what the figure adds).

const CW = 50;
const Y = 100;
const H = 48;
const cx = (i: number) => 30 + i * 56 + 16 * Math.floor(i / 4);
const mid = (i: number) => cx(i) + CW / 2;

const shapes: LayoutShape[] = [];
for (let i = 0; i < 12; i++) {
  const tone = i < 4 ? PATTERN_TONE.infra : i === 11 ? PATTERN_TONE.check : PATTERN_TONE.data;
  shapes.push({ id: `o${i}`, type: "cell", x: cx(i), y: Y, w: CW, h: H, label: String(i), tone, quiet: i !== 11 });
}

const pointer = (id: string, label: string, sub: string, target: number, y: number, tone: LayoutTone, step = 1) => {
  shapes.push(
    {
      id,
      type: "box",
      x: mid(target) - 85,
      y,
      w: 170,
      h: 44,
      label,
      sub,
      tone,
      fill: "pastel",
      step,
    },
    { id: `${id}-a`, type: "arrow", x: 0, y: 0, from: id, to: `o${target}`, step, dashed: step > 1, packet: step > 1 }
  );
};
pointer("billing", "Group billing", "next offset 10", 10, 220, PATTERN_TONE.compute);
pointer("analytics", "Group analytics", "next offset 6", 6, 290, PATTERN_TONE.compute);
pointer("replay", "Analytics replays", "offset reset to 4", 4, 220, PATTERN_TONE.pattern, 2);

shapes.push({
  id: "legend",
  type: "text",
  x: 20,
  y: 352,
  w: 740,
  h: 18,
  label: "Blue: on every in-sync replica, readable · Lime: leader only, not yet readable · Grey: past retention",
  tone: PATTERN_TONE.infra,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A partition is a log; a consumer group is an offset",
  width: 780,
  height: 390,
  steps: [{ title: "Two groups, two offsets" }, { title: "Replay: move the offset back" }],
  groups: [
    { id: "s0", title: "Segment 0: expired", tone: PATTERN_TONE.infra, x: 22, y: 56, w: 234, h: 120 },
    { id: "s1", title: "Segment 4", tone: PATTERN_TONE.store, x: 262, y: 56, w: 234, h: 120 },
    { id: "s2", title: "Active segment 8", tone: PATTERN_TONE.store, x: 502, y: 56, w: 234, h: 120 },
  ],
  shapes,
};

export default spec;
