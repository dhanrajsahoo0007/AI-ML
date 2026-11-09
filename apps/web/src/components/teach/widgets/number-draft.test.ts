import { describe, expect, it } from "vitest";
import { commitDraft, parseDraft } from "./number-draft";

describe("parseDraft", () => {
  it("treats an empty or partial entry as no value, not 0", () => {
    expect(parseDraft("", 1, 100)).toBeNull();
    expect(parseDraft("   ", 1, 100)).toBeNull();
    expect(parseDraft("-", 0, 100)).toBeNull();
    expect(parseDraft("1e", 0, 100)).toBeNull();
  });

  it("does not clamp while typing: out-of-range prefixes are held, not forced to min or max", () => {
    // Retyping "5" in a min-1 field: Backspace gives "" (no change), then "5" is accepted as 5, not 15.
    expect(parseDraft("5", 1, 1e5)).toBe(5);
    // Typing "250" in a min-100 field passes through "2" and "25", which must not jump to 100.
    expect(parseDraft("2", 100, 1000)).toBeNull();
    expect(parseDraft("25", 100, 1000)).toBeNull();
    expect(parseDraft("250", 100, 1000)).toBe(250);
    expect(parseDraft("5000", 100, 1000)).toBeNull();
  });

  it("accepts decimals and bounds", () => {
    expect(parseDraft("2.5", 1, 100)).toBe(2.5);
    expect(parseDraft("1", 1, 100)).toBe(1);
    expect(parseDraft("100", 1, 100)).toBe(100);
  });
});

describe("commitDraft", () => {
  it("clamps into range on blur", () => {
    expect(commitDraft("0", 1, 100, 7)).toBe(1);
    expect(commitDraft("5000", 1, 100, 7)).toBe(100);
    expect(commitDraft("42", 1, 100, 7)).toBe(42);
  });

  it("keeps the last value when the draft is empty or not a number", () => {
    expect(commitDraft("", 1, 100, 7)).toBe(7);
    expect(commitDraft("abc", 1, 100, 7)).toBe(7);
  });
});
