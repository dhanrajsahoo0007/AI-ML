import { describe, expect, it } from "vitest";
import { drawLoop, summariseLoop, type MockQuestion } from "./mock-loop";

const q = (id: string, over: Partial<MockQuestion> = {}): MockQuestion => ({
  id,
  q: `Prompt ${id}`,
  level: "Senior",
  companies: [],
  signals: [],
  area: "general",
  followUps: [],
  ...over,
});

// A fixed sequence, so a draw is repeatable.
const seeded = () => {
  let n = 0;
  return () => ((n = (n * 9301 + 49297) % 233280), n / 233280);
};

describe("drawLoop", () => {
  const bank = [
    ...["a1", "a2", "a3"].map((id) => q(id, { companies: ["amazon"], area: "ownership" })),
    ...["a4", "a5"].map((id) => q(id, { companies: ["amazon"], area: "conflict" })),
    q("a6", { companies: ["amazon"], area: "delivery", level: "Junior" }),
    ...["m1", "m2", "m3", "m4"].map((id, i) => q(id, { companies: ["meta"], area: `area-${i}` })),
    ...["g1", "g2", "g3"].map((id, i) => q(id, { area: `other-${i}` })),
  ];

  it("draws the asked number without repeats", () => {
    const loop = drawLoop(bank, { company: null, level: null }, seeded());
    expect(loop).toHaveLength(5);
    expect(new Set(loop.map((x) => x.id)).size).toBe(5);
  });

  it("prefers the chosen company and fills the rest from elsewhere", () => {
    const meta = drawLoop(bank, { company: "meta", level: null }, seeded());
    expect(meta.filter((x) => x.companies.includes("meta"))).toHaveLength(4);
    expect(meta).toHaveLength(5);
  });

  it("spreads over areas before repeating one", () => {
    const amazon = drawLoop(bank, { company: "amazon", level: null }, seeded(), 3);
    expect(new Set(amazon.map((x) => x.area)).size).toBe(3);
    expect(amazon.every((x) => x.companies.includes("amazon"))).toBe(true);
  });

  it("prefers the chosen level inside the company", () => {
    const junior = drawLoop(bank, { company: "amazon", level: "Junior" }, seeded(), 1);
    expect(junior[0].id).toBe("a6");
  });

  it("returns what there is when the bank is small", () => {
    expect(drawLoop(bank.slice(0, 2), { company: null, level: null }, seeded())).toHaveLength(2);
    expect(drawLoop([], { company: "meta", level: "Mid" }, seeded())).toEqual([]);
  });
});

describe("summariseLoop", () => {
  const loop = [
    q("x", { signals: ["conflict", "feedback"] }),
    q("y", { signals: ["conflict"] }),
    q("z", { signals: ["ownership"] }),
  ];

  it("averages the ratings and lists the weak answers", () => {
    const s = summariseLoop(loop, { x: 2, y: 5 });
    expect(s).toMatchObject({ answered: 2, average: 3.5, weak: ["x"] });
    expect(s.signals[0]).toBe("conflict");
  });

  it("has no average before anything is rated", () => {
    expect(summariseLoop(loop, {})).toMatchObject({ answered: 0, average: null, weak: [] });
  });
});
