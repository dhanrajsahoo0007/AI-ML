import { describe, expect, it } from "vitest";
import { SEQ, layoutSequence, orderRows } from "@/components/diagrams/sequence-layout";
import type { SequenceSpec } from "@/components/diagrams/types";
import { seq } from "./fixtures";

describe("orderRows", () => {
  it("keeps array order by default and puts notes after the messages", () => {
    expect(orderRows(seq).map((r) => `${r.kind[0]}${r.index}`)).toEqual(["m0", "m1", "m2", "m3", "m4", "n0"]);
  });

  it("sorts by `at`, keeping array order for ties", () => {
    const spec: SequenceSpec = {
      ...seq,
      messages: [
        { from: "app", to: "db", at: 2 },
        { from: "app", to: "cache", at: 0 },
        { from: "cache", to: "app", at: 2 },
      ],
      notes: [{ lane: "app", text: "first", at: -1 }],
    };
    expect(orderRows(spec).map((r) => `${r.kind[0]}${r.index}`)).toEqual(["n0", "m1", "m0", "m2"]);
  });
});

describe("layoutSequence", () => {
  it("spaces lanes evenly and stacks rows top to bottom", () => {
    const v = layoutSequence(seq, undefined);
    expect(v.width).toBe(SEQ.colW * 3 + SEQ.marginX * 2);
    expect(v.lanes.map((l) => l.x)).toEqual([110, 290, 470]);
    expect(v.rows.map((r) => r.y)).toEqual([0, 1, 2, 3, 4, 5].map((i) => SEQ.firstRowY + i * SEQ.rowH));
    expect(v.height).toBe(SEQ.firstRowY + 6 * SEQ.rowH + SEQ.bottomPad);
  });

  it("runs the packets one after another and loops after the last one", () => {
    const v = layoutSequence(seq, undefined);
    expect([...v.timing.entries()]).toEqual([
      [0, { begin: 0, duration: 1.2 }],
      [1, { begin: 1.2, duration: 1.2 }],
      [2, { begin: 2.4, duration: 1.2 }],
      [3, { begin: 3.6, duration: 1.2 }],
      [4, { begin: 5.1, duration: 1.2 }],
    ]);
    expect(v.cycle).toBeCloseTo(6.3);
  });

  it("in a step view keeps every row in place, shows earlier rows as old and moves only the new ones", () => {
    const step1 = layoutSequence(seq, 1);
    expect(step1.rows.map((r) => [r.index, r.phase])).toEqual([
      [0, "new"],
      [1, "new"],
    ]);
    const step2 = layoutSequence(seq, 2);
    expect(step2.rows.map((r) => r.phase)).toEqual(["old", "old", "new", "new", "new", "new"]);
    expect(step2.rows[2].y).toBe(layoutSequence(seq, undefined).rows[2].y);
    expect(step2.height).toBe(step1.height);
    expect([...step2.timing.keys()]).toEqual([2, 3, 4]);
    expect(step2.timing.get(2)?.begin).toBe(0);
  });
});
