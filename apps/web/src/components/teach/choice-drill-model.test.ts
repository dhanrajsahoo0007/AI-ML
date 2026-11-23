import { describe, expect, it } from "vitest";
import {
  drillSummary,
  guessTheLevelSchema,
  levelDrill,
  principleDrill,
  scoreDrill,
  whichPrincipleSchema,
} from "./choice-drill-model";

const level = {
  prompt: "Tell me about a time you improved something.",
  levels: ["Mid", "Senior", "Staff"],
  answers: [
    { text: "I rewrote our retry code.", level: "Mid", why: "One person, one component." },
    { text: "I moved four teams to one client.", level: "Staff", why: "Several teams changed." },
  ],
};

const principle = {
  principles: ["Ownership", "Dive Deep"],
  prompts: [
    { text: "Tell me about a problem outside your area.", principle: "Ownership", why: "Outside your area." },
    { text: "Tell me about a metric that lied.", principle: "Dive Deep", why: "Checking the data." },
  ],
};

describe("guessTheLevelSchema", () => {
  it("accepts a valid exercise and maps levels to indexes", () => {
    const drill = levelDrill(guessTheLevelSchema.parse(level));
    expect(drill.options).toEqual(["Mid", "Senior", "Staff"]);
    expect(drill.items.map((i) => i.answer)).toEqual([0, 2]);
    expect(drill.prompt).toBe(level.prompt);
    expect(drill.title).toBe("Guess the level");
  });

  it("rejects a level that is not offered, repeated levels and unknown props", () => {
    const bad = { ...level, answers: [{ ...level.answers[0], level: "Principal" }] };
    expect(guessTheLevelSchema.safeParse(bad).success).toBe(false);
    expect(guessTheLevelSchema.safeParse({ ...level, levels: ["Mid", "Mid"] }).success).toBe(false);
    expect(guessTheLevelSchema.safeParse({ ...level, extra: 1 }).success).toBe(false);
  });
});

describe("whichPrincipleSchema", () => {
  it("accepts a valid exercise", () => {
    const drill = principleDrill(whichPrincipleSchema.parse({ ...principle, title: "Match the principle" }));
    expect(drill.title).toBe("Match the principle");
    expect(drill.items.map((i) => i.answer)).toEqual([0, 1]);
    expect(drill.prompt).toBeUndefined();
    expect(drill.instruction).toMatch(/Which one is the interviewer testing/);
    const sorted = principleDrill(whichPrincipleSchema.parse({ ...principle, instruction: "Sort each answer." }));
    expect(sorted.instruction).toBe("Sort each answer.");
  });

  it("needs at least two prompts and a known principle on each", () => {
    expect(whichPrincipleSchema.safeParse({ ...principle, prompts: [principle.prompts[0]] }).success).toBe(false);
    const bad = { ...principle, prompts: [principle.prompts[0], { ...principle.prompts[1], principle: "Frugality" }] };
    expect(whichPrincipleSchema.safeParse(bad).success).toBe(false);
  });
});

describe("scoreDrill and drillSummary", () => {
  const items = levelDrill(guessTheLevelSchema.parse(level)).items;

  it("counts the right picks and ignores unanswered items", () => {
    expect(scoreDrill(items, [0, 2])).toBe(2);
    expect(scoreDrill(items, [1, 2])).toBe(1);
    expect(scoreDrill(items, [undefined, undefined])).toBe(0);
  });

  it("summarises one item and several", () => {
    expect(drillSummary(1, 1)).toBe("Correct.");
    expect(drillSummary(0, 1)).toMatch(/Not this time/);
    expect(drillSummary(3, 3)).toBe("3 of 3. All correct.");
    expect(drillSummary(1, 3)).toBe("1 of 3 correct. The reasons are above.");
  });
});
