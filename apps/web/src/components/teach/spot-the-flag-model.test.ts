import { describe, expect, it } from "vitest";
import { scoreFlags, spotTheFlagSchema, summarize, verdictOf } from "./spot-the-flag-model";

const sentences = [
  {
    text: "Our company was founded in 2015 and has three product lines.",
    flag: "Backstory the interviewer cannot score.",
  },
  { text: "I traced the slow query to a missing index.", note: "A first-person action with a cause." },
  { text: "We fixed it together.", flag: "No sign of what you did." },
  { text: "p99 fell from 900 ms to 120 ms." },
];

describe("spotTheFlagSchema", () => {
  const base = { prompt: "Tell me about a time you fixed a slow system.", sentences };

  it("accepts an answer with flagged and clean sentences", () => {
    expect(spotTheFlagSchema.safeParse(base).success).toBe(true);
    expect(spotTheFlagSchema.safeParse({ ...base, title: "Find the weak spots" }).success).toBe(true);
  });

  it("rejects an answer with no red flag, or with nothing but red flags", () => {
    const clean = sentences.map(({ text }) => ({ text }));
    expect(spotTheFlagSchema.safeParse({ ...base, sentences: clean }).success).toBe(false);
    const allBad = sentences.map(({ text }) => ({ text, flag: "bad" }));
    expect(spotTheFlagSchema.safeParse({ ...base, sentences: allBad }).success).toBe(false);
  });

  it("rejects a sentence with both a flag and a note, unknown props and too few sentences", () => {
    const both = [{ text: "x", flag: "a", note: "b" }, ...sentences];
    expect(spotTheFlagSchema.safeParse({ ...base, sentences: both }).success).toBe(false);
    expect(spotTheFlagSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
    expect(spotTheFlagSchema.safeParse({ ...base, sentences: sentences.slice(0, 2) }).success).toBe(false);
  });
});

describe("scoring", () => {
  it("names each sentence's verdict", () => {
    expect(verdictOf(sentences[0], true)).toBe("caught");
    expect(verdictOf(sentences[0], false)).toBe("missed");
    expect(verdictOf(sentences[1], true)).toBe("false-alarm");
    expect(verdictOf(sentences[1], false)).toBe("clear");
  });

  it("counts caught, missed and false alarms", () => {
    expect(scoreFlags(sentences, new Set([0, 1]))).toEqual({ flags: 2, caught: 1, missed: 1, falseAlarms: 1 });
    expect(scoreFlags(sentences, new Set([0, 2]))).toEqual({ flags: 2, caught: 2, missed: 0, falseAlarms: 0 });
    expect(scoreFlags(sentences, new Set())).toEqual({ flags: 2, caught: 0, missed: 2, falseAlarms: 0 });
  });

  it("writes the result as one line", () => {
    expect(summarize({ flags: 2, caught: 2, missed: 0, falseAlarms: 0 })).toBe(
      "You caught 2 of 2 red flags. Nothing missed."
    );
    expect(summarize({ flags: 2, caught: 1, missed: 1, falseAlarms: 1 })).toBe(
      "You caught 1 of 2 red flags, with 1 false alarm."
    );
    expect(summarize({ flags: 1, caught: 0, missed: 1, falseAlarms: 0 })).toBe("You caught 0 of 1 red flag.");
  });
});
