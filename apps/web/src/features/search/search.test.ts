import { describe, expect, it } from "vitest";
import { searchEntries, type SearchEntry } from "./search";

const index: SearchEntry[] = [
  { t: "Consistent Hashing", h: "/system-design/fundamentals/consistent-hashing", s: "Classic System Design" },
  { t: "Design Facebook Messenger", d: "One-to-one and group chat at scale", h: "/system-design/case-studies/facebook-messenger", s: "Classic System Design" },
  { t: "Retrieval-Augmented Generation", h: "/ai-system-design/genai-system-design/rag", s: "GenAI & LLM Systems" },
  { t: "AWS Compute", h: "/infra/aws/compute", s: "Infrastructure" },
];

describe("searchEntries", () => {
  it("finds titles case-insensitively and ranks title prefixes first", () => {
    expect(searchEntries(index, "hash")[0].h).toBe("/system-design/fundamentals/consistent-hashing");
    expect(searchEntries(index, "MESSENGER")[0].t).toBe("Design Facebook Messenger");
  });

  it("requires every word to match", () => {
    expect(searchEntries(index, "aws compute")).toHaveLength(1);
    expect(searchEntries(index, "aws kafka")).toHaveLength(0);
  });

  it("falls back to section and description matches", () => {
    expect(searchEntries(index, "group chat").map((e) => e.t)).toEqual(["Design Facebook Messenger"]);
    expect(searchEntries(index, "infrastructure").map((e) => e.t)).toEqual(["AWS Compute"]);
  });

  it("returns nothing for an empty query and respects the limit", () => {
    expect(searchEntries(index, "   ")).toEqual([]);
    expect(searchEntries(index, "a", 2)).toHaveLength(2);
  });
});
